import Sticker from '../Sticker/Sticker';
import './XLink.css';

const PROFILE_URL = 'https://x.com/TylerKirkl69749';

/**
 * XLink — a black X (Twitter) badge sticker. Drag to reposition; a clean click
 * (not a drag) opens the profile in a new tab.
 */
export default function XLink({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef, onOpen }) {
  const open = () => {
    window.open(PROFILE_URL, '_blank', 'noopener,noreferrer');
    onOpen?.();
  };

  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="xlink-shell"
      peel={{ sides: ['tr'], size: 26, inset: -3, radius: 17, back: '#f4f1ea' }}
      label="My X profile — opens in a new tab"
      interactive
      onClick={open}
    >
      <div className="xlink">
        <svg className="xlink-mark" viewBox="0 0 24 24" width="29" height="29" aria-hidden="true">
          <path
            fill="#fff"
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
        <span className="xlink-hint">open X</span>
      </div>
    </Sticker>
  );
}
