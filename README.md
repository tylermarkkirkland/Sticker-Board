# The Sticker Desk

A playful, interactive "creative desk" microsite — a dark canvas scattered with
draggable sticker objects. A personal portfolio experiment, not tied to any
brand or product.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into /dist
npm run preview  # preview the production build
```

## What's on the desk

| Object | What it does |
| --- | --- |
| **Concert poster** (center) | Click to expand into a centered, blurred overlay with full detail. Close with the ×, a backdrop click, or `Esc`. |
| **Record player** (top-left) | Click the vinyl to play / pause a looping melody. The record spins and the tonearm swings in while playing. |
| **Sticky note** (center-bottom) | Click to edit the text inline. `Enter` saves, `Shift+Enter` adds a line, `Esc` cancels. |
| **Design badge** (top-right) | A "maker" emblem with a slowly rotating dashed ring. Drifts gently. |
| **Open book** (bottom-left) | Hover to flip a page. |
| **Blob character** (bottom-right) | A friendly face that drifts and blinks. |

Every object is **draggable** anywhere on the desk and lifts to the front when
you grab it. Hovering gives a subtle scale + shadow lift.

## How it's built

- **React 19** + **Vite** + **Framer Motion**
- `Sticker` (`src/components/Sticker/`) is the shared wrapper that gives every
  object its drag, hover-lift, bring-to-front, staggered entrance, and optional
  ambient drift. Each themed object just renders its art inside it.
- The record player's audio is **synthesized in the browser** via the Web Audio
  API (`src/hooks/useChimeLoop.js`) so there's no audio file to ship. To use a
  real track instead, swap the hook for an `<audio>` element pointing at a file
  in `/public/audio/` — the play/pause contract is the same.

## Notes

- Designed for desktop / larger viewports (it's a spatial "desk").
- Respects `prefers-reduced-motion`.
- Keyboard: interactive stickers (poster, record) are focusable and activate
  with `Enter` / `Space`; the overlay closes with `Esc`.
- The sticky note text and sticker positions reset on refresh (session-only, by
  design for a prototype).
