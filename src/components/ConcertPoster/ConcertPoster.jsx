import Sticker from '../Sticker/Sticker';
import './ConcertPoster.css';

/**
 * ConcertPoster — the expandable hero sticker.
 *
 * In its resting state it's a compact gig poster. Clicking it calls onExpand,
 * which the app uses to float the full poster into a centered overlay
 * (see ExpandedOverlay + PosterDetail below).
 */
export default function ConcertPoster({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef, onExpand }) {
  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="poster-shell"
      label="Concert poster — click to open"
      interactive
      onClick={onExpand}
    >
      <PosterFace />
      <span className="poster-expand-hint">click to open ↗</span>
    </Sticker>
  );
}

/** The poster artwork itself — reused at both sizes via CSS scaling. */
export function PosterFace({ detailed = false }) {
  return (
    <div className={`poster ${detailed ? 'poster--detailed' : ''}`}>
      <div className="poster-top">
        <span className="poster-presents">live · one night only</span>
      </div>

      <div className="poster-headline">
        <span>NIGHT</span>
        <span className="poster-headline-accent">SHIFT</span>
        <span>SESSIONS</span>
      </div>

      {/* Abstract sound-wave motif */}
      <div className="poster-waves" aria-hidden="true">
        {[28, 52, 38, 70, 44, 60, 32, 56, 40, 66, 30].map((h, i) => (
          <span key={i} style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="poster-bill">
        <span>THE LATE BLOOMERS</span>
        <span>· VELVET STATIC ·</span>
        <span>SADIE &amp; THE MOONS</span>
      </div>

      <div className="poster-foot">
        <span className="poster-date">SAT · 09.14</span>
        <span className="poster-venue">THE PAPER ROOM</span>
      </div>

      {detailed && (
        <p className="poster-blurb">
          Doors at 8. A slow-burn evening of reverb-soaked guitars and
          late-night grooves. Bring someone you like. Stickers at the door.
        </p>
      )}
    </div>
  );
}
