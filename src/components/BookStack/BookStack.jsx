import { useEffect } from 'react';
import Sticker from '../Sticker/Sticker';
import { bookCoverImages } from '../BookCovers/BookCovers';
import './BookStack.css';

const STACK = '/book-stack.png';        // tight static stack
const STACK_HOVER = '/book-stack-hover.png'; // books lifted/separated

const STACK_W = 196; // render width on the board (15% smaller than the prior 230)

// Peel geometry for the hover art (700×580 PNG at 92% width, centered on the
// 620×361 static art). The fold point sits on the bottom book's real
// bottom-right corner, ~2px in from the art's right edge and ~17px up from
// its bottom, inside the PNG's transparent margin.
const STATIC_H = STACK_W * (361 / 620);
const HOVER_W = STACK_W * 0.92;
const HOVER_H = HOVER_W * (580 / 700);
const HOVER_X = (STACK_W - HOVER_W) / 2;
const HOVER_Y = (STATIC_H - HOVER_H) / 2;
const BOOK_PEEL = {
  sides: ['br'],
  size: 28,
  inset: {
    left: HOVER_X,
    top: HOVER_Y,
    right: HOVER_X + 2,
    bottom: STATIC_H - (HOVER_Y + HOVER_H - 17),
  },
  back: '#f4f1ea',
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
      peel={BOOK_PEEL}
      label="My favorite books — click to see the covers"
      interactive
      onClick={onExpand}
    >
      <div className="book-stack" style={{ width: STACK_W }}>
        <div className="book-stack-images">
          <img className="book-stack-img book-stack-img--static" src={STACK} alt="" draggable="false" />
          <img className="book-stack-img book-stack-img--hover" src={STACK_HOVER} alt="" draggable="false" />
        </div>
      </div>
    </Sticker>
  );
}
