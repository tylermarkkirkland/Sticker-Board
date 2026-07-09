# Polish Pass — Change Log

A human-readable record of every change made during the "post-ready" polish pass,
so anything can be undone if it turns out to have broken something.

**Branch:** `polish/post-ready` (branched from `main` @ `79051ad`)
**Guarantee:** no existing functionality was changed or removed — only unused code
was deleted and non-behavioral polish (docs, meta tags, accessibility gating) was
added.

## How to undo

- **Undo everything:** `git checkout main` (main was never touched), or delete the
  branch: `git branch -D polish/post-ready`.
- **Undo one change:** each item below lists its commit. Revert it alone with
  `git revert <sha>` (or `git revert <sha> --no-edit`).
- **Baseline commit** `e4ab766` captures the exact working state from before the
  pass — the WIP that was uncommitted on `main` (RecordCrate clip-path work +
  component tweaks). Reset to it with `git reset --hard e4ab766` to discard all
  polish work while keeping that WIP.

---

## Changes

_(Entries added as work proceeds. Each lists: what, why, files, commit, revert.)_

### 0. Safety net
- **What:** Created branch `polish/post-ready`, committed the pre-existing
  uncommitted WIP as a baseline, added this changelog.
- **Commit:** `e4ab766` (baseline) — this file added in the next commit.
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
- **Revert:** `git revert <commit-1>` (restores files + deps).

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
- **Revert:** `git revert <commit-2>`.
