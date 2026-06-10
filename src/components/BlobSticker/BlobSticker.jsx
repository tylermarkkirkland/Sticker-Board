import Sticker from '../Sticker/Sticker';
import './BlobSticker.css';

/**
 * BlobSticker — a friendly little character cut-out.
 * Organic gradient blob with a face that gives the board some personality.
 */
export default function BlobSticker({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef }) {
  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      drift={{ y: -12, rotate: 3, duration: 6.5 }}
      className="blob-shell"
      label="Blob character"
    >
      <div className="blob">
        <svg viewBox="0 0 150 150" width="120" height="120">
          <defs>
            <linearGradient id="blobg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6fe3c0" />
              <stop offset="100%" stopColor="#3aa6c4" />
            </linearGradient>
          </defs>
          {/* Wobbly blob silhouette */}
          <path
            fill="url(#blobg)"
            d="M75 8c24 0 46 12 56 34s8 49-8 67-44 26-66 18S20 110 18 86 26 36 44 22 51 8 75 8Z"
          />
          {/* Eyes */}
          <circle className="blob-eye" cx="58" cy="70" r="7" fill="#15201e" />
          <circle className="blob-eye" cx="92" cy="70" r="7" fill="#15201e" />
          <circle cx="60" cy="68" r="2.4" fill="#fff" />
          <circle cx="94" cy="68" r="2.4" fill="#fff" />
          {/* Smile */}
          <path
            d="M60 92 Q75 106 90 92"
            fill="none"
            stroke="#15201e"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Cheeks */}
          <circle cx="48" cy="86" r="5" fill="rgba(255,107,94,0.55)" />
          <circle cx="102" cy="86" r="5" fill="rgba(255,107,94,0.55)" />
        </svg>
      </div>
    </Sticker>
  );
}
