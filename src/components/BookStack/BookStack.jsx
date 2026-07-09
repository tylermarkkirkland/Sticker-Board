import Sticker from '../Sticker/Sticker';
import './BookStack.css';

const STACK = '/book-stack.png';        // tight static stack
const STACK_HOVER = '/book-stack-hover.png'; // books lifted/separated

const STACK_W = 196; // render width on the board (15% smaller than the prior 230)

/**
 * BookStack — a stack of favorite books. On hover the stack crossfades to the
 * "lifted/separated" art; clicking expands into the covers overlay (handled by
 * App via onExpand).
 *
 * Both images are centered on the same point so the lift reads as the books
 * spreading apart in place.
 */
export default function BookStack({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef, onExpand }) {
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
