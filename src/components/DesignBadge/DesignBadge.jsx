import Sticker from '../Sticker/Sticker';
import './DesignBadge.css';

/**
 * DesignBadge — a circular "maker" emblem for the design/UX side of things.
 * Rotating dashed ring around a bold pen-nib + color-swatch mark.
 */
export default function DesignBadge({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef }) {
  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      drift={{ y: -10, rotate: 2, duration: 8 }}
      className="design-shell"
      label="Design badge"
    >
      <div className="design-badge">
        <svg viewBox="0 0 160 160" width="150" height="150">
          <defs>
            <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9b8cff" />
              <stop offset="100%" stopColor="#5cc6ff" />
            </linearGradient>
          </defs>
          {/* Filled disc */}
          <circle cx="80" cy="80" r="74" fill="url(#dg)" />
          {/* Spinning dashed ring */}
          <circle
            className="design-ring"
            cx="80"
            cy="80"
            r="64"
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="2"
            strokeDasharray="3 9"
          />
          {/* Pen-nib mark */}
          <g transform="translate(80 78)">
            <path
              d="M0 -34 L20 26 L0 14 L-20 26 Z"
              fill="#15131f"
            />
            <circle cx="0" cy="2" r="5" fill="url(#dg)" />
          </g>
          {/* Three color swatch dots */}
          <circle cx="56" cy="116" r="6" fill="#ff6b5e" />
          <circle cx="80" cy="122" r="6" fill="#ffd34e" />
          <circle cx="104" cy="116" r="6" fill="#6fe3c0" />
        </svg>
        <span className="design-tag">make</span>
      </div>
    </Sticker>
  );
}
