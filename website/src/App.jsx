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
const STORAGE_KEY = "backend-series-completed-episodes";
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === "string"));
  } catch {
    return new Set();
  }
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
        const { html, cachedAt, expiresAt } = parsed;
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

          return { html, isStale };
        }
      }
    }
  } catch {
    // Ignore local storage parse/access errors.
  }

  try {
    const sessionHtml = sessionStorage.getItem(cacheKey);
    if (sessionHtml) return { html: sessionHtml, isStale: true };
  } catch {
    // Ignore storage access issues.
  }

  return { html: "", isStale: false };
}

function setCachedReadmeHtml(episodeId, html) {
  const cacheKey = getReadmeCacheKey(episodeId);

  try {
    sessionStorage.setItem(cacheKey, html);
  } catch {
    // Ignore session storage quota/private mode failures.
  }

  try {
    const payload = {
      html,
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
  const [completedSet, setCompletedSet] = useState(new Set());
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(false);
  const [error, setError] = useState("");
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const inFlightMarkdownRequestsRef = useRef(new Map());
  const markdownArticleRef = useRef(null);

  const selectedEpisode = useMemo(
    () => episodes.find((ep) => ep.id === selectedEpisodeId) || null,
    [episodes, selectedEpisodeId],
  );

  const updateEpisodeMarkdown = useCallback((episodeId, markdownHtml) => {
    setEpisodes((prev) =>
      prev.map((ep) =>
        ep.id === episodeId && !ep.markdownHtml ? { ...ep, markdownHtml } : ep,
      ),
    );
  }, []);

  const fetchEpisodeMarkdownHtml = useCallback(
    async (episode, options = {}) => {
      if (!episode) return { html: "", fromCache: false, isStale: false };

      const { forceRefresh = false } = options;

      if (!forceRefresh && episode.markdownHtml) {
        return { html: episode.markdownHtml, fromCache: true, isStale: false };
      }

      if (!forceRefresh) {
        const cached = getCachedReadmeEntry(episode.id);
        if (cached.html) {
          return {
            html: cached.html,
            fromCache: true,
            isStale: cached.isStale,
          };
        }
      }

      const existingRequest = inFlightMarkdownRequestsRef.current.get(
        episode.id,
      );
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
          const rendered = marked.parse(markdown);
          const cleanHtml = DOMPurify.sanitize(rendered);
          setCachedReadmeHtml(episode.id, cleanHtml);
          return { html: cleanHtml, fromCache: false, isStale: false };
        })
        .finally(() => {
          inFlightMarkdownRequestsRef.current.delete(episode.id);
        });

      inFlightMarkdownRequestsRef.current.set(episode.id, request);
      return request;
    },
    [],
  );

  useEffect(() => {
    setCompletedSet(getStoredCompletedEpisodes());

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
      if (!selected || selected.markdownHtml) return;

      setIsLoadingMarkdown(true);
      setError("");

      try {
        const result = await fetchEpisodeMarkdownHtml(selected);
        updateEpisodeMarkdown(selected.id, result.html);

        // Stale-while-revalidate: show cached content now, refresh silently.
        if (result.fromCache && result.isStale) {
          fetchEpisodeMarkdownHtml(selected, { forceRefresh: true })
            .then((freshResult) => {
              setEpisodes((prev) =>
                prev.map((ep) =>
                  ep.id === selected.id
                    ? { ...ep, markdownHtml: freshResult.html }
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
  }, [
    episodes,
    fetchEpisodeMarkdownHtml,
    selectedEpisodeId,
    updateEpisodeMarkdown,
  ]);

  useEffect(() => {
    if (episodes.length === 0) return;

    let cancelled = false;
    const queue = episodes
      .filter((ep) => ep.id !== selectedEpisodeId && !ep.markdownHtml)
      .slice(0, 4);

    async function prefetchLikelyNextReads() {
      for (const episode of queue) {
        if (cancelled) break;

        try {
          const result = await fetchEpisodeMarkdownHtml(episode);
          if (!cancelled) {
            updateEpisodeMarkdown(episode.id, result.html);
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
    fetchEpisodeMarkdownHtml,
    selectedEpisodeId,
    updateEpisodeMarkdown,
  ]);

  const total = episodes.length;
  const completed = useMemo(
    () => episodes.filter((ep) => completedSet.has(ep.id)).length,
    [episodes, completedSet],
  );
  const selectedEpisodeIndex = useMemo(
    () => episodes.findIndex((ep) => ep.id === selectedEpisodeId),
    [episodes, selectedEpisodeId],
  );
  const nextEpisode =
    selectedEpisodeIndex >= 0 ? episodes[selectedEpisodeIndex + 1] : null;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  function toggleComplete(id) {
    setCompletedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }

  function selectEpisode(episode) {
    setSelectedEpisodeId(episode.id);
  }

  function goToNextEpisode() {
    if (!nextEpisode) return;
    setSelectedEpisodeId(nextEpisode.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    setHasReachedBottom(false);
  }, [selectedEpisodeId]);

  useEffect(() => {
    if (!selectedEpisode?.markdownHtml) return;

    function checkReachedBottom() {
      const article = markdownArticleRef.current;
      if (!article) {
        setHasReachedBottom(false);
        return;
      }

      const bottom = article.getBoundingClientRect().bottom;
      setHasReachedBottom(bottom <= window.innerHeight + 28);
    }

    checkReachedBottom();
    window.addEventListener("scroll", checkReachedBottom, { passive: true });
    window.addEventListener("resize", checkReachedBottom);

    return () => {
      window.removeEventListener("scroll", checkReachedBottom);
      window.removeEventListener("resize", checkReachedBottom);
    };
  }, [selectedEpisode?.id, selectedEpisode?.markdownHtml]);

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-backdrop" aria-hidden="true" />
        <div className="hero-inner">
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

          {isLoadingList && <p className="state">Loading episode list...</p>}
          {!isLoadingList && error && <p className="state error">{error}</p>}
          {!isLoadingList && !error && episodes.length === 0 && (
            <p className="state">No episodes found.</p>
          )}

          <ul>
            {episodes.map((episode) => {
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
                      <span className="episode-folder">{episode.folder}</span>
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

              {!isLoadingMarkdown && selectedEpisode.markdownHtml && (
                <article
                  ref={markdownArticleRef}
                  className="markdown"
                  dangerouslySetInnerHTML={{
                    __html: selectedEpisode.markdownHtml,
                  }}
                />
              )}

              {!isLoadingMarkdown &&
                selectedEpisode?.markdownHtml &&
                nextEpisode &&
                hasReachedBottom && (
                  <div className="next-episode-wrap">
                    <button
                      type="button"
                      className="next-episode-btn"
                      onClick={goToNextEpisode}
                    >
                      Next Episode: {nextEpisode.title}
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
