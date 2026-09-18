# Polish Pass — Change Log

A human-readable record of every change made during the "post-ready" polish pass,
so anything can be undone if it turns out to have broken something.

**Branch:** `polish/post-ready` (branched from `main` @ `054c2ed`)
**Guarantee:** no existing functionality was changed or removed — only unused code
was deleted and non-behavioral polish (docs, meta tags, accessibility gating) was
added.

> Note: commit SHAs below are the post-publish values (history was rewritten
> once to swap the work email for a personal GitHub no-reply identity before
> pushing to GitHub). The messages are unchanged, so you can also locate any
> commit by its message with `git log --grep`.

## How to undo

- **Undo everything:** `git reset --hard b975b2a` returns to the baseline (the
  pre-polish WIP) while keeping that WIP intact.
- **Undo one change:** each item below lists its commit. Revert it alone with
  `git revert <sha>` (or `git revert <sha> --no-edit`).
- **Baseline commit** `b975b2a` captures the exact working state from before the
  pass — the WIP that was uncommitted on `main` (RecordCrate clip-path work +
  component tweaks).

---

## Changes

_(Entries added as work proceeds. Each lists: what, why, files, commit, revert.)_

### 0. Safety net
- **What:** Created branch `polish/post-ready`, committed the pre-existing
  uncommitted WIP as a baseline, added this changelog.
- **Commit:** `b975b2a` (baseline) — this file added in the next commit.
- **Revert:** `git branch -D polish/post-ready` removes the entire pass.

### 1. Remove dead code & unused dependencies
- **What:**
  - Deleted `src/components/MusicCorner/` (MusicCorner.jsx + .css) — a 226-line
    superseded earlier version of the player/crate, never imported anywhere.
  - Removed unused deps `dialkit` (zero usage) and `motion` (only `framer-motion`
    is imported). Moved `pngjs` to `devDependencies` (used only by the dev-only
    `scripts/remove-bg.mjs`). Resynced `package-lock.json` via `npm install`.
- **Why:** Dead code/deps make the repo look unfinished and bloat installs.
- **Files:** `src/components/MusicCorner/*` (deleted), `package.json`,
  `package-lock.json`.
- **Verified:** `npm run build` succeeds; no source imports any removed module.
- **Revert:** `git revert 18d1e74` (restores files + deps).

### 2. Remove orphaned / inert code (no behavior change)
- **What:**
  - `RecordPlayer`: removed the `onTogglePlayPause` + `isPlaying` props (declared
    but never read) and the orphaned `.platter-play-pause` CSS (no matching JSX).
    Also removed the props being passed from `App.jsx`, and trimmed the now-unused
    `currentId`, `togglePlayPause`, `isPlaying` from the `useTrackPreview()`
    destructure. **Play/pause still works exactly as before** — it happens by
    docking/undocking a record on the platter; nothing was ever wired to these.
  - `App.jsx`: removed the `ENABLE_NOTE_STACK = false` flag and the never-rendered
    n2–n5 sticky notes (all shared identical coords; the flag was permanently off,
    so they never rendered). The visible board is unchanged.
  - Renamed the on-board H1 from "The Sticker Board" to "The Sticker Desk" (name
    unification — see item 3).
- **Why:** Half-wired seams read as unfinished; the README even claimed a
  click-to-play-pause that wasn't wired here.
- **Files:** `src/App.jsx`, `src/components/RecordPlayer/RecordPlayer.jsx`,
  `src/components/RecordPlayer/RecordPlayer.css`.
- **Note:** `useTrackPreview` still exports those methods — the hook is untouched,
  so re-wiring later is trivial.
- **Revert:** `git revert 34734fc`.

### 3. Honor prefers-reduced-motion for the JS entrance animation
- **What:** In `src/components/Sticker/Sticker.jsx`, used Framer's
  `useReducedMotion()` to drop the entrance slide/scale (pieces just fade in) and
  disable the ambient `drift` bob loop when reduced motion is requested. All
  interaction feedback (drag lift, hover scale, dock/tonearm springs) is kept —
  it's user-initiated.
- **Why:** The global CSS `prefers-reduced-motion` block already neutralizes CSS
  animations (record spin, EQ bars), but Framer's JS-driven entrance ran
  regardless. This closes that gap.
- **Files:** `src/components/Sticker/Sticker.jsx`.
- **Revert:** `git revert dcb40a0`.

### 4. Add social cards, favicon, and unify the name (index.html)
- **What:** Added Open Graph + Twitter Card meta, `theme-color`, and an SVG
  favicon (`public/favicon.svg`); unified the tab title to "The Sticker Desk".
  Added a generated 1200×630 `public/og-image.png` for the link preview.
- **Why:** Pasting the link into X/Slack now yields a titled card with a preview
  image instead of a bare link.
- **Files:** `index.html`, `public/favicon.svg`, `public/og-image.png`.
- **⚠ Action needed after deploy:** the `og:url`/`og:image`/`twitter:image` URLs
  use a placeholder domain `https://sticker-desk.vercel.app/`. Update them to the
  real domain so the card resolves.
- **Revert:** `git revert 69f6974`.

### 5. Make book back-face placeholders intentional
- **What:** `src/components/BookCovers/BookCovers.jsx` — the aria-label and code
  comments promised a "rating" that was never rendered. Realigned the label to
  "read a favorite quote / see the cover" and fixed the comments to describe the
  actual back face (tags + quote). Sample quotes/tags kept as-is.
- **Why:** Removes a broken promise to screen readers and the "placeholder" smell
  without inventing fake rating data.
- **Files:** `src/components/BookCovers/BookCovers.jsx`.
- **Revert:** `git revert 1a84590`.

### 6. Rewrite README + add deploy docs
- **What:** Replaced the out-of-date README (which described a concert poster,
  design badge, blob character, and a nonexistent `useChimeLoop.js`) with an
  accurate description of the real desk, plus a Deploy section.
- **Files:** `README.md`.
- **Revert:** `git revert b42339e`.

### 7. Optimize heavy assets (own commit — highest fidelity risk)
- **What:**
  - **Audio:** converted the three uncompressed WAVs (~77 MB total; one was
    39 MB) to 192 kbps AAC `.m4a` (~9.7 MB total) with `afconvert`. Durations
    match the originals exactly (176.7s / 31.4s / 214.9s), so the preview
    windows in `src/data/songs.js` are unaffected. Updated `songs.js` `file`
    fields to `.m4a`. Moved the WAV originals out of the served folder into
    `audio-source/` (still in the repo) so they no longer ship in `dist`.
  - **Images:** downscaled oversized PNGs to ~2.7× their on-screen size (faces
    918→640px wide; book-stack 940→620px; book-stack-hover 1050→700px). At the
    real render size (~237px) they are pixel-indistinguishable; the group
    dropped 7.5 MB → 3.4 MB.
  - Net: `public/` 89 MB → 18 MB; production `dist/` ≈ 20 MB, with an initial
    paint of ~1 MB (face + book stack). Audio loads only when a record docks.
- **Why:** 77 MB of WAV made this far too heavy to feel like a "microsite" or to
  load quickly for anyone opening a shared link.
- **Verified:** `npm run build` succeeds; all three `.m4a` decode in-browser via
  an `Audio` element with correct durations; on-screen screenshot is unchanged.
- **Files:** `src/data/songs.js`, `public/audio/*.m4a` (new),
  `public/face*.png`, `public/book-stack*.png` (resized), WAVs moved to
  `audio-source/`.
- **Fidelity note:** AAC at 192 kbps is perceptually transparent for a looped
  music preview, and the image downscale is invisible at display size. **Please
  spot-check audio playback in a normal browser** (the headless preview can't
  autoplay); if anything sounds off, `git revert 24c8182` restores the WAVs
  and full-size PNGs.
- **Revert:** `git revert 24c8182` (or restore originals from baseline
  `b975b2a`).

### 8. Rename "The Sticker Desk" → "The Sticker Board" (user feedback)
- **What:** Reverted the earlier name choice (items 2 & 4). The product is now
  "The Sticker Board" everywhere: on-board H1, tab `<title>`, OG/Twitter titles
  + descriptions, placeholder deploy domain (`sticker-board.vercel.app`), README,
  and a stray "desk" metaphor in `Sticker.css`. Regenerated `public/og-image.png`
  so the card shows the new title.
- **Why:** "Desk" didn't fit; the scene reads as a board of stickers.
- **Files:** `src/App.jsx`, `index.html`, `README.md`,
  `src/components/Sticker/Sticker.css`, `public/og-image.png`.
- **Revert:** `git revert <this commit>` (restores "The Sticker Desk").

### 9. Preload off-screen sticker image variants (no behavior change)
- **What:** Warm the browser cache for images that aren't visible at first, so
  they swap in instantly instead of fetching on first use:
  - `FaceSticker.jsx`: preloads `face-happy/sad/secret.png` on mount (the face
    swaps a single `<img src>`, so previously each variant only loaded the first
    time its mood fired — a late pop behind the 80ms crossfade).
  - `BookStack.jsx`: preloads the four `book-cover-*.png` on mount (they only
    mount when the overlay opens, so the first open could pop). Cover paths are
    exported from `BookCovers.jsx` as `bookCoverImages`.
  - Both use `new Image()` with `fetchPriority = 'low'` inside a mount-only
    `useEffect`, so preloads run after first paint and don't compete with the
    visible assets.
- **Why:** Remove first-swap/first-open loading clunkiness.
- **Verified:** Build passes; a headless load with **no interaction** fetches all
  three extra faces and all four covers (HTTP 200); no console errors. Purely
  additive — no interaction, rendering, or capability changed.
- **Files:** `src/components/FaceSticker/FaceSticker.jsx`,
  `src/components/BookStack/BookStack.jsx`, `src/components/BookCovers/BookCovers.jsx`.
- **Revert:** `git revert <this commit>` (removes the preloads; lazy loading returns).
