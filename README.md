# The Sticker Board

A playful, interactive microsite — a dark board scattered with draggable
sticker objects. A personal portfolio experiment, not tied to any brand or
product.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into /dist
npm run preview  # preview the production build
```

## What's on the board

| Object | What it does |
| --- | --- |
| **Record player** (center-right) | A turntable. Drag a record from the crate onto the platter — it docks, the tonearm swings in, and a looping preview of the track fades in. A "now playing" caption appears with an EQ animation and (when available) a **listen on Spotify** link. Drag the record back off to stop. |
| **Record crate + records** (right) | Three real tracks filed in a bin as vinyl stickers. Drag one out to play it on the turntable, drop it back to re-file it. |
| **Sticky note** (top-left) | Click to edit the text inline. `Enter` saves, `Shift+Enter` adds a line, `Esc` cancels. What you type sets the **face's mood** — try something cheerful, something sad, or the secret phrase `life before death`. |
| **Face sticker** (top-center) | A little face that reacts to the sticky note — happy, sad, or letting you in on a secret, with a speech bubble. |
| **Book stack** (bottom-left) | Click to fan out four book covers. Click any cover to flip it and read the tags + a favorite quote. |
| **X badge** (top-right) | Opens my X / Twitter profile in a new tab. |

Every object is **draggable** anywhere on the board and lifts to the front when
you grab it. Hovering gives a subtle scale + shadow lift.

## How it's built

- **React 19** + **Vite** + **Framer Motion**
- `Sticker` (`src/components/Sticker/`) is the shared wrapper that gives every
  object its drag, hover-lift, bring-to-front, and staggered entrance. Each
  themed object just renders its art inside it.
- The turntable plays **real audio files** in `public/audio/` via
  `src/hooks/useTrackPreview.js`, which loops a preview window of each track and
  fades it in/out. Track metadata (titles, preview windows, Spotify links) lives
  in `src/data/songs.js`.
- The sticky-note → face reaction is keyword-driven in `src/data/reactions.js`
  (`getMood()` maps the note text to a mood).

## Deploy

The app is a static Vite SPA — any static host works, and both Vercel and
Netlify auto-detect the settings.

**Vercel:** import the repo (or run `npx vercel`). Build command `npm run build`,
output directory `dist`. No extra config needed.

**Netlify:** build command `npm run build`, publish directory `dist`.

After deploying, update the absolute social-card URLs in `index.html`
(`og:url`, `og:image`, `twitter:image`) to your real domain so link previews
resolve. A 1200×630 preview image lives at `public/og-image.png` — regenerate it
from a screenshot of the live board if you rearrange things.

## Notes

- Designed for desktop / larger viewports (it's a spatial "board").
- Respects `prefers-reduced-motion`: CSS animations and the JS entrance/ambient
  motion are neutralized; drag/hover/dock feedback (user-initiated) stays.
- Keyboard: the book stack and X badge are focusable and activate with
  `Enter` / `Space`; the expanded overlay closes with `Esc`. Dragging objects and
  operating the turntable are pointer-only today (a known prototype limitation).
- The sticky-note text and sticker positions reset on refresh (session-only, by
  design for a prototype).
