import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

const OWNER = "Sopanha9";
const REPO = "Backend-Engineering";
const BRANCH = "main";
const EPISODES_ROOT = "episodes";
const PROGRESS_STORAGE_KEY = "be-hub-progress";
const THEME_STORAGE_KEY = "be-hub-theme";
const README_CACHE_PREFIX = "backend-series-readme-cache";
const README_CACHE_SOFT_TTL_MS = 6 * 60 * 60 * 1000;
const README_CACHE_HARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const markdownRenderer = new marked.Renderer();
markdownRenderer.link = ({ href, title, text }) => {
  const safeHref = href || "#";
  const titleAttr = title ? ` title=\"${title}\"` : "";
  return `<a href=\"${safeHref}\" target=\"_blank\" rel=\"noopener noreferrer\"${titleAttr}>${text}</a>`;
};

marked.setOptions({
  renderer: markdownRenderer,
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false,
});

function sortEpisodes(a, b) {
  const getEpisodeNum = (name) => {
    const match = name.match(/ep(\d+)/i);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };

  return (
    getEpisodeNum(a.name) - getEpisodeNum(b.name) ||
    a.name.localeCompare(b.name)
  );
}

function titleFromFolder(folder) {
  return folder
    .replace(/^ep\d+-?/i, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStoredCompletedEpisodes() {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function getStoredTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function estimateReadTimeFromText(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function estimateReadTimeFromHtml(html) {
  const plain = html.replace(/<[^>]*>/g, " ");
  return estimateReadTimeFromText(plain);
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getReadmeCacheKey(episodeId) {
  return `${README_CACHE_PREFIX}:${BRANCH}:${episodeId}`;
}

function getCachedReadmeEntry(episodeId) {
  const cacheKey = getReadmeCacheKey(episodeId);
  const now = Date.now();

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        localStorage.removeItem(cacheKey);
      } else {
        const { html, cachedAt, expiresAt, readTimeMins } = parsed;
        const isValidHtml = typeof html === "string" && html.length > 0;
        const hasCachedAt = typeof cachedAt === "number";
        const hardExpiresAt =
          typeof expiresAt === "number"
            ? expiresAt
            : hasCachedAt
              ? cachedAt + README_CACHE_HARD_TTL_MS
              : 0;

        if (!isValidHtml || !hardExpiresAt || now >= hardExpiresAt) {
          localStorage.removeItem(cacheKey);
        } else {
          const isStale =
            !hasCachedAt || now - cachedAt >= README_CACHE_SOFT_TTL_MS;

          try {
            sessionStorage.setItem(cacheKey, html);
          } catch {
            // Ignore session storage failures.
          }

          const normalizedReadTime =
            typeof readTimeMins === "number" && readTimeMins > 0
              ? readTimeMins
              : estimateReadTimeFromHtml(html);

          return { html, readTimeMins: normalizedReadTime, isStale };
        }
      }
    }
  } catch {
    // Ignore local storage parse/access errors.
  }

  try {
    const sessionHtml = sessionStorage.getItem(cacheKey);
    if (sessionHtml) {
      return {
        html: sessionHtml,
        readTimeMins: estimateReadTimeFromHtml(sessionHtml),
        isStale: true,
      };
    }
  } catch {
    // Ignore storage access issues.
  }

  return { html: "", readTimeMins: 0, isStale: false };
}

function setCachedReadmeHtml(episodeId, html, readTimeMins) {
  const cacheKey = getReadmeCacheKey(episodeId);

  try {
    sessionStorage.setItem(cacheKey, html);
  } catch {
    // Ignore session storage quota/private mode failures.
  }

  try {
    const payload = {
      html,
      readTimeMins,
      cachedAt: Date.now(),
      expiresAt: Date.now() + README_CACHE_HARD_TTL_MS,
    };
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Ignore local storage quota/private mode failures.
  }
}

function App() {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [completedSet, setCompletedSet] = useState(() =>
    getStoredCompletedEpisodes(),
  );
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [searchQuery, setSearchQuery] = useState("");
  const [tableOfContents, setTableOfContents] = useState([]);
  const [isCompletionBannerDismissed, setIsCompletionBannerDismissed] =
    useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false);
  const [error, setError] = useState("");
  const inFlightMarkdownRequestsRef = useRef(new Map());
  const markdownArticleRef = useRef(null);
  const shouldForceTopScrollRef = useRef(false);

  const forceScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const selectedEpisode = useMemo(
    () => episodes.find((ep) => ep.id === selectedEpisodeId) || null,
    [episodes, selectedEpisodeId],
  );

  const updateEpisodeContent = useCallback(
    (episodeId, markdownHtml, readTimeMins) => {
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.id === episodeId
            ? {
                ...ep,
                markdownHtml: markdownHtml || ep.markdownHtml,
                readTimeMins: readTimeMins || ep.readTimeMins,
              }
            : ep,
        ),
      );
    },
    [],
  );

  const fetchEpisodeContent = useCallback(async (episode, options = {}) => {
    if (!episode) {
      return { html: "", readTimeMins: 0, fromCache: false, isStale: false };
    }

    const { forceRefresh = false } = options;

    if (!forceRefresh && episode.markdownHtml && episode.readTimeMins) {
      return {
        html: episode.markdownHtml,
        readTimeMins: episode.readTimeMins,
        fromCache: true,
        isStale: false,
      };
    }

    if (!forceRefresh) {
      const cached = getCachedReadmeEntry(episode.id);
      if (cached.html) {
        return {
          html: cached.html,
          readTimeMins: cached.readTimeMins,
          fromCache: true,
          isStale: cached.isStale,
        };
      }
    }

    const existingRequest = inFlightMarkdownRequestsRef.current.get(episode.id);
    if (existingRequest) {
      return existingRequest;
    }

    const request = fetch(episode.markdownUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch README for ${episode.folder}`);
        }
        return response.text();
      })
      .then((markdown) => {
        const readTimeMins = estimateReadTimeFromText(markdown);
        const rendered = marked.parse(markdown);
        const cleanHtml = DOMPurify.sanitize(rendered);
        setCachedReadmeHtml(episode.id, cleanHtml, readTimeMins);
        return {
          html: cleanHtml,
          readTimeMins,
          fromCache: false,
          isStale: false,
        };
      })
      .finally(() => {
        inFlightMarkdownRequestsRef.current.delete(episode.id);
      });

    inFlightMarkdownRequestsRef.current.set(episode.id, request);
    return request;
  }, []);

  useEffect(() => {
    async function loadEpisodes() {
      setIsLoadingList(true);
      setError("");

      try {
        const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${EPISODES_ROOT}?ref=${BRANCH}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch episodes: ${response.status}`);
        }

        const items = await response.json();
        const dirs = items
          .filter((item) => item.type === "dir" && /^ep\d+/i.test(item.name))
          .sort(sortEpisodes)
          .map((item) => ({
            id: item.name,
            folder: item.name,
            title: titleFromFolder(item.name),
            githubUrl: `https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/${EPISODES_ROOT}/${item.name}`,
            markdownUrl: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${EPISODES_ROOT}/${item.name}/README.md`,
            markdownHtml: "",
            readTimeMins: 0,
          }));

        setEpisodes(dirs);

        if (dirs.length > 0) {
          setSelectedEpisodeId(dirs[0].id);
        }
      } catch (err) {
        setError(err.message || "Unable to load episodes");
      } finally {
        setIsLoadingList(false);
      }
    }

    loadEpisodes();
  }, []);

  useEffect(() => {
    if (episodes.length === 0 || !selectedEpisodeId) return;

    async function loadMarkdown() {
      const selected = episodes.find((ep) => ep.id === selectedEpisodeId);
      if (!selected || (selected.markdownHtml && selected.readTimeMins)) return;

      setIsLoadingMarkdown(true);
      setError("");

      try {
        const result = await fetchEpisodeContent(selected);
        updateEpisodeContent(selected.id, result.html, result.readTimeMins);

        // Stale-while-revalidate: show cached content now, refresh silently.
        if (result.fromCache && result.isStale) {
          fetchEpisodeContent(selected, { forceRefresh: true })
            .then((freshResult) => {
              setEpisodes((prev) =>
                prev.map((ep) =>
                  ep.id === selected.id
                    ? {
                        ...ep,
                        markdownHtml: freshResult.html,
                        readTimeMins: freshResult.readTimeMins,
                      }
                    : ep,
                ),
              );
            })
            .catch(() => {
              // Keep old cached content if revalidation fails.
            });
        }
      } catch (err) {
        setError(err.message || "Unable to load selected episode");
      } finally {
        setIsLoadingMarkdown(false);
      }
    }

    loadMarkdown();
  }, [episodes, fetchEpisodeContent, selectedEpisodeId, updateEpisodeContent]);

  useEffect(() => {
    if (episodes.length === 0) return;

    let cancelled = false;
    const queue = episodes
      .filter(
        (ep) =>
          ep.id !== selectedEpisodeId && (!ep.markdownHtml || !ep.readTimeMins),
      )
      .slice(0, 18);

    async function prefetchLikelyNextReads() {
      for (const episode of queue) {
        if (cancelled) break;

        try {
          const result = await fetchEpisodeContent(episode);
          if (!cancelled) {
            updateEpisodeContent(episode.id, result.html, result.readTimeMins);
          }
        } catch {
          // Keep UI responsive even if background prefetch fails.
        }
      }
    }

    prefetchLikelyNextReads();

    return () => {
      cancelled = true;
    };
  }, [
    episodes.length,
    fetchEpisodeContent,
    selectedEpisodeId,
    updateEpisodeContent,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify(Array.from(completedSet)),
      );
    } catch {
      // Ignore local storage quota/private mode failures.
    }
  }, [completedSet]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore local storage write errors.
    }
  }, [theme]);

  const total = episodes.length;
  const completed = useMemo(
    () => episodes.filter((ep) => completedSet.has(ep.id)).length,
    [episodes, completedSet],
  );
  const selectedEpisodeIndex = useMemo(
    () => episodes.findIndex((ep) => ep.id === selectedEpisodeId),
    [episodes, selectedEpisodeId],
  );
  const prevEpisode =
    selectedEpisodeIndex > 0 ? episodes[selectedEpisodeIndex - 1] : null;
  const nextEpisode =
    selectedEpisodeIndex >= 0 ? episodes[selectedEpisodeIndex + 1] : null;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const filteredEpisodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return episodes;
    return episodes.filter((episode) =>
      episode.title.toLowerCase().includes(query),
    );
  }, [episodes, searchQuery]);
  const isCourseComplete = total > 0 && completed === total;

  function toggleComplete(id) {
    setCompletedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectEpisode(episode) {
    setSelectedEpisodeId(episode.id);
  }

  function goToNextEpisode() {
    if (!nextEpisode) return;
    shouldForceTopScrollRef.current = true;
    setSelectedEpisodeId(nextEpisode.id);
    forceScrollToTop();
  }

  function goToPreviousEpisode() {
    if (!prevEpisode) return;
    shouldForceTopScrollRef.current = true;
    setSelectedEpisodeId(prevEpisode.id);
    forceScrollToTop();
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function resetProgress() {
    setCompletedSet(new Set());
    setIsCompletionBannerDismissed(false);
    try {
      localStorage.removeItem(PROGRESS_STORAGE_KEY);
    } catch {
      // Ignore storage access issues.
    }
  }

  useEffect(() => {
    if (!isCourseComplete) {
      setIsCompletionBannerDismissed(false);
    }
  }, [isCourseComplete]);

  useEffect(() => {
    if (!shouldForceTopScrollRef.current) return;

    // Repeat on next frame so it stays at top after render/layout updates.
    requestAnimationFrame(() => {
      forceScrollToTop();
      shouldForceTopScrollRef.current = false;
    });
  }, [forceScrollToTop, selectedEpisodeId]);

  useEffect(() => {
    const article = markdownArticleRef.current;
    if (!selectedEpisode?.markdownHtml || !article) {
      setTableOfContents([]);
      return;
    }

    const counts = new Map();
    const toc = [];
    const h2Elements = Array.from(article.querySelectorAll("h2"));

    h2Elements.forEach((heading) => {
      const text = heading.textContent?.trim() || "section";
      const baseSlug = slugifyHeading(text) || "section";
      const index = (counts.get(baseSlug) || 0) + 1;
      counts.set(baseSlug, index);
      const id = index === 1 ? baseSlug : `${baseSlug}-${index}`;
      heading.id = id;
      toc.push({ id, label: text });
    });

    const preBlocks = Array.from(article.querySelectorAll("pre"));
    preBlocks.forEach((pre, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "copy-code-btn";
      button.dataset.codeIndex = String(index);
      button.textContent = "Copy";
      wrapper.appendChild(button);
    });

    const timers = [];
    function onArticleClick(event) {
      const button = event.target.closest(".copy-code-btn");
      if (!button) return;

      const wrapper = button.closest(".code-block");
      const code =
        wrapper?.querySelector("pre code") || wrapper?.querySelector("pre");
      const codeText = code?.textContent || "";

      navigator.clipboard
        .writeText(codeText)
        .then(() => {
          button.textContent = "Copied!";
          button.disabled = true;
          const timer = window.setTimeout(() => {
            button.textContent = "Copy";
            button.disabled = false;
          }, 2000);
          timers.push(timer);
        })
        .catch(() => {
          button.textContent = "Failed";
          const timer = window.setTimeout(() => {
            button.textContent = "Copy";
          }, 2000);
          timers.push(timer);
        });
    }

    article.addEventListener("click", onArticleClick);
    setTableOfContents(toc);

    return () => {
      article.removeEventListener("click", onArticleClick);
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [selectedEpisode?.id, selectedEpisode?.markdownHtml]);

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
          <p className="eyebrow">Backend Engineering Study Journey</p>
          <h1>
            Learn backend by building, reading, and completing each episode
          </h1>
          <p className="lead">
            Every episode is loaded directly from your GitHub Markdown files so
            students always read the latest version.
          </p>

          <div className="progress-card">
            <div className="progress-head">
              <h2>Learning Progress</h2>
              <span>
                {completed}/{total || "-"} complete
              </span>
            </div>
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={percent}
            >
              <div
                className="progress-value"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="progress-text">
              {percent}% finished • {Math.max(total - completed, 0)} episodes
              left
            </p>
          </div>

          {isCourseComplete && !isCompletionBannerDismissed && (
            <div className="completion-banner" role="status" aria-live="polite">
              <button
                type="button"
                className="completion-close"
                onClick={() => setIsCompletionBannerDismissed(true)}
                aria-label="Dismiss completion message"
              >
                x
              </button>
              <h2>🎉 You completed the Backend Engineering course!</h2>
              <p>
                Great consistency. Keep the momentum and revisit episodes as a
                quick refresher whenever you build new projects.
              </p>
              <button
                type="button"
                className="completion-reset"
                onClick={resetProgress}
              >
                Reset Progress
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="layout">
        <aside className="episode-list" aria-label="Episode List">
          <div className="list-head">
            <h2>Episodes</h2>
            <a
              href={`https://github.com/${OWNER}/${REPO}/tree/${BRANCH}/${EPISODES_ROOT}`}
              target="_blank"
              rel="noreferrer"
            >
              GitHub Source
            </a>
          </div>

          <label className="search-label" htmlFor="episode-search">
            Find an episode
          </label>
          <input
            id="episode-search"
            className="episode-search"
            type="search"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          {isLoadingList && <p className="state">Loading episode list...</p>}
          {!isLoadingList && error && <p className="state error">{error}</p>}
          {!isLoadingList && !error && episodes.length === 0 && (
            <p className="state">No episodes found.</p>
          )}
          {!isLoadingList &&
            !error &&
            episodes.length > 0 &&
            filteredEpisodes.length === 0 && (
              <p className="state">No episodes found.</p>
            )}

          <ul>
            {filteredEpisodes.map((episode) => {
              const isActive = selectedEpisodeId === episode.id;
              const isCompleted = completedSet.has(episode.id);

              return (
                <li key={episode.id}>
                  <button
                    className={`episode-item ${isActive ? "active" : ""}`}
                    onClick={() => selectEpisode(episode)}
                    type="button"
                  >
                    <div className="episode-top">
                      <span className="episode-status">
                        {isCompleted ? "Completed" : "In progress"}
                      </span>
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={(evt) => {
                          evt.stopPropagation();
                          toggleComplete(episode.id);
                        }}
                        onClick={(evt) => evt.stopPropagation()}
                        aria-label={`Mark ${episode.title} as completed`}
                      />
                    </div>
                    <strong>{episode.title}</strong>
                    {episode.readTimeMins > 0 && (
                      <span className="episode-readtime">
                        ~{episode.readTimeMins} min
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="episode-content" aria-live="polite">
          {!selectedEpisode && (
            <p className="state">Select an episode to start reading.</p>
          )}
          {selectedEpisode && (
            <>
              <div className="content-head">
                <div>
                  <p className="content-folder">{selectedEpisode.folder}</p>
                  <h2>{selectedEpisode.title}</h2>
                  {selectedEpisode.readTimeMins > 0 && (
                    <p className="content-readtime">
                      Estimated read time: ~{selectedEpisode.readTimeMins} min
                    </p>
                  )}
                </div>
                <a
                  href={selectedEpisode.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open folder on GitHub
                </a>
              </div>

              {isLoadingMarkdown && <p className="state">Loading README...</p>}

              {!isLoadingMarkdown && tableOfContents.length > 0 && (
                <nav className="contents-panel" aria-label="Table of contents">
                  <h3>Contents</h3>
                  <ul>
                    {tableOfContents.map((item) => (
                      <li key={item.id}>
                        <a href={`#${item.id}`}>{item.label}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              {!isLoadingMarkdown && selectedEpisode.markdownHtml && (
                <article
                  ref={markdownArticleRef}
                  className="markdown"
                  dangerouslySetInnerHTML={{
                    __html: selectedEpisode.markdownHtml,
                  }}
                />
              )}

              {!isLoadingMarkdown && selectedEpisode?.markdownHtml && (
                <div className="episode-nav-wrap">
                  <button
                    type="button"
                    className="episode-nav-btn"
                    onClick={goToPreviousEpisode}
                    disabled={!prevEpisode}
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    className="episode-nav-btn"
                    onClick={goToNextEpisode}
                    disabled={!nextEpisode}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
