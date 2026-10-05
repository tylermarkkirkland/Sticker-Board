import { useEffect, useState } from 'react';
import Sticker from '../Sticker/Sticker';
import { bookCoverImages } from '../BookCovers/BookCovers';
import './BookStack.css';

const STACK = '/book-stack.png';        // tight static stack
const STACK_HOVER = '/book-stack-hover.png'; // books lifted/separated

const STACK_W = 196; // render width on the board (15% smaller than the prior 230)

// Peel geometry for the hover art (700×580 PNG at 92% width, centered on the
// 620×361 static art). Its bottom-right isn't square: the right edge runs
// straight down, then a 45° chamfer (the bottom book's page block) runs
// down-left to the flat bottom. A box-corner fold would lie parallel to that
// chamfer and lift a long strip, so the fold uses a custom tip instead.
const STATIC_H = STACK_W * (361 / 620);
const HOVER_W = STACK_W * 0.92;
const HOVER_H = HOVER_W * (580 / 700);
const HOVER_X = (STACK_W - HOVER_W) / 2;
const HOVER_Y = (STATIC_H - HOVER_H) / 2;
// Fold from where the right edge meets the chamfer, angled 40° below
// horizontal. Shallower angles run the crease up into the book above; this
// keeps it on the bottom book so just that book's corner lifts. Wide
// (135°) corners give long flaps fast, so the depth stays small.
const BOOK_TIP_ANGLE = (40 * Math.PI) / 180;
const BOOK_PEEL = {
  sides: [{
    x: HOVER_X + 179.3,
    y: HOVER_Y + 125,
    nx: Math.cos(BOOK_TIP_ANGLE),
    ny: Math.sin(BOOK_TIP_ANGLE),
  }],
  size: 11,
  inset: {
    left: HOVER_X,
    top: HOVER_Y,
    right: HOVER_X,
    bottom: STATIC_H - (HOVER_Y + HOVER_H),
  },
  back: '#f4f1ea',
  delay: 200, // let the 180ms spread crossfade finish before the corner lifts
  mask: { src: STACK_HOVER, size: `${HOVER_W}px auto`, x: HOVER_X, y: HOVER_Y },
};

/**
 * BookStack — a stack of favorite books. On hover the stack crossfades to the
 * "lifted/separated" art; clicking expands into the covers overlay (handled by
 * App via onExpand).
 *
 * Both images are centered on the same point so the lift reads as the books
 * spreading apart in place.
 */
export default function BookStack({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef, onExpand }) {
  // Spread while hovered, and stay spread until the peeled corner is flat
  // again, so the flap always matches the art underneath it.
  const [spread, setSpread] = useState(false);

  // Preload the expanded-view cover images (low priority, after first paint) so
  // the overlay's fan-in is instant the first time it opens, instead of the
  // covers fetching only when the overlay mounts.
  useEffect(() => {
    bookCoverImages.forEach((src) => {
      const img = new Image();
      img.fetchPriority = 'low';
      img.src = src;
    });
  }, []);

  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="book-stack-shell"
      peel={{ ...BOOK_PEEL, onActiveChange: setSpread }}
      label="My favorite books — click to see the covers"
      interactive
      onClick={onExpand}
    >
      <div className={`book-stack${spread ? ' is-spread' : ''}`} style={{ width: STACK_W }}>
        <div className="book-stack-images">
          <img className="book-stack-img book-stack-img--static" src={STACK} alt="" draggable="false" />
          <img className="book-stack-img book-stack-img--hover" src={STACK_HOVER} alt="" draggable="false" />
        </div>
      </div>
    </Sticker>
  );
}
