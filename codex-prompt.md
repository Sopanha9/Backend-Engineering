# Codex Prompt — Backend Engineering Study Hub Improvements

## Context

This is a React + Vite frontend deployed on Vercel. It's a self-study hub with 18 backend engineering episodes. Episodes are loaded from GitHub Markdown files (repo: `Sopanha9/Backend-Engineering`). The UI has a sidebar episode list on the left and a markdown content viewer on the right.

Current stack: React, Vite, vanilla CSS (no Tailwind). Fonts: Sora, JetBrains Mono, Manrope, Space Grotesk loaded from Google Fonts.

---

## Tasks

### 1. Persist Progress with localStorage
- Episode completion checkboxes currently reset on page refresh
- Save completed episodes to `localStorage` under key `"be-hub-progress"`
- On load, read from localStorage and restore checkbox states + progress bar
- Progress card (showing `X/18 complete`, progress bar, `X% finished`) should update reactively

---

### 2. Fix Duplicate Episode Folder Name in Sidebar
- Each episode item shows both the raw folder name (e.g. `ep01-http-and-routing`) AND the human title (e.g. `Http And Routing`)
- Remove the raw folder name span (`episode-folder` class) from the sidebar list items — only show the human-readable title
- The folder name is still needed internally for fetching GitHub content, just don't render it visibly

---

### 3. Fix Duplicate H1 Tags
- There are currently 2 `<h1>` elements on the page
- The hero section has `<h1>Learn backend by building...</h1>` — keep this as `<h1>`
- The "Learning Progress" heading is also an `<h1>` — change it to `<h2>`
- Ensure there is exactly one `<h1>` per page

---

### 4. Add Search / Filter to Episode Sidebar
- Add a search input at the top of the episode sidebar (above the list)
- Filter episodes in real-time as user types (match against episode title, case-insensitive)
- If no results, show a small "No episodes found" message
- Do not hide the "GitHub Source" link, keep it above the search input

---

### 5. Add Prev / Next Navigation Inside Episode Viewer
- At the bottom of the episode content area, add two buttons: `← Previous` and `Next →`
- Clicking them navigates to the adjacent episode in the list
- Disable (or hide) Prev on the first episode, disable (or hide) Next on the last episode
- Style them consistently with the existing warm beige theme

---

### 6. Add "Copy Code" Button on Code Blocks
- For every `<pre><code>` block rendered in the markdown viewer, inject a "Copy" button in the top-right corner of the block
- On click: copy the code content to clipboard, change button text to "Copied!" for 2 seconds, then revert
- Style: small, subtle button using `position: absolute` on a `position: relative` wrapper

---

### 7. Add Estimated Read Time per Episode
- In the sidebar, next to each episode title, show an estimated read time (e.g. `~5 min`)
- Calculate it from the fetched markdown content: `Math.ceil(wordCount / 200)` minutes
- Show it as a small muted label below the title inside the sidebar button
- Also show it at the top of the episode content area (below the episode title heading)

---

### 8. Add In-Page Table of Contents
- After fetching and rendering the markdown for an episode, extract all `##` headings (h2)
- Render a sticky "Contents" panel above the markdown content (or as a collapsible section)
- Each item is an anchor link that scrolls to the corresponding heading
- Add `id` attributes to each rendered `<h2>` so anchor links work

---

### 9. Add Dark Mode Toggle
- Add a toggle button (sun/moon icon or simple text "Dark / Light") in the top-right of the header
- Toggle a `.dark` class on `<body>` or `<html>`
- Define CSS variables for both light (current warm beige) and dark themes:
  - Dark: background `#1a1612`, surface `#2a2419`, text `#f0e8d8`, muted `#8a7a66`
  - Light: keep current colors unchanged
- Persist the user's preference in `localStorage` under key `"be-hub-theme"` and apply on load

---

### 10. Fix SEO Meta Tags
Add the following inside `<head>` in `index.html`:
```html
<meta name="description" content="A self-paced backend engineering study hub with 18 episodes covering HTTP, auth, databases, caching, queuing, security, and more.">
<link rel="canonical" href="https://backend-engineering-gold.vercel.app/">
<meta property="og:title" content="Backend Engineering Study Hub">
<meta property="og:description" content="Learn backend engineering by building, reading, and completing each episode. Covers Node.js, Express, databases, caching, auth, and more.">
<meta property="og:url" content="https://backend-engineering-gold.vercel.app/">
<meta property="og:type" content="website">
```

---

### 11. Clean Up Font Families
- Currently loading 4 Google Font families: Sora, Manrope, Space Grotesk, JetBrains Mono
- Remove Manrope and Space Grotesk from the Google Fonts import in `index.html`
- Update CSS to use only:
  - `Sora` for all headings and UI text
  - `JetBrains Mono` for all code blocks (`pre`, `code`)
  - `system-ui, sans-serif` as the body fallback if Sora isn't loaded yet
- Search and replace any `font-family` references to Manrope or Space Grotesk in CSS files

---

### 12. Add "Course Completion" Screen
- When all 18 episodes are marked complete (progress = 18/18), show a congratulations banner/modal
- Content: "🎉 You completed the Backend Engineering course!" with a short motivational message
- Include a "Reset Progress" button that clears localStorage and resets all checkboxes to unchecked
- The banner should be dismissible (close button)

---

## Notes for Codex
- Keep all changes within the existing React + Vite structure — no new frameworks
- Do not change the GitHub fetch logic or episode data source
- Maintain the existing warm beige color palette for light mode
- All new CSS should use the same CSS variable / class naming conventions already in the codebase
- Test that localStorage read/write works correctly on initial load (avoid hydration flash)
