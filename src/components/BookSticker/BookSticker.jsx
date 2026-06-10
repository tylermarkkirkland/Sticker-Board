import Sticker from '../Sticker/Sticker';
import './BookSticker.css';

/**
 * BookSticker — an open book for the reading/learning side.
 * On hover, the right-hand page lifts and flips a little, like a real page turn.
 */
export default function BookSticker({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef }) {
  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      drift={{ y: -7, rotate: -1.5, duration: 9 }}
      className="book-shell"
      label="Open book"
    >
      <div className="book">
        <div className="book-page book-page--left">
          <span className="book-line" />
          <span className="book-line" />
          <span className="book-line short" />
          <span className="book-line" />
        </div>
        <div className="book-spine" />
        <div className="book-page book-page--right">
          <span className="book-line" />
          <span className="book-line short" />
          <span className="book-line" />
          <span className="book-line" />
          {/* The flipping page */}
          <div className="book-flip" aria-hidden="true" />
        </div>
        <span className="book-title">currently reading</span>
      </div>
    </Sticker>
  );
}
