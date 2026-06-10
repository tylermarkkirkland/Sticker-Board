import { motion } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import { useChimeLoop } from '../../hooks/useChimeLoop';
import './RecordPlayer.css';

/**
 * RecordPlayer — the interactive music sticker.
 *
 * Click the vinyl to play / pause a looping melody (synthesized in
 * useChimeLoop). The record spins while playing and the tonearm swings
 * onto the groove. Pure SVG art so it stays crisp at any scale.
 */
export default function RecordPlayer({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef }) {
  const { isPlaying, toggle } = useChimeLoop();

  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="record-shell"
      label={isPlaying ? 'Pause the record' : 'Play the record'}
      interactive
      onClick={toggle}
    >
      <div className={`record-player ${isPlaying ? 'is-playing' : ''}`}>
        <div className="record-plate">
          {/* Spinning vinyl */}
          <motion.svg
            className="record-vinyl"
            viewBox="0 0 200 200"
            width="170"
            height="170"
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={
              isPlaying
                ? { duration: 2.4, repeat: Infinity, ease: 'linear' }
                : { duration: 0.6, ease: 'easeOut' }
            }
          >
            <circle cx="100" cy="100" r="98" fill="#0d0d10" />
            <circle cx="100" cy="100" r="98" fill="none" stroke="#26262c" strokeWidth="1" />
            {/* Grooves */}
            {[86, 74, 62, 50, 40].map((r) => (
              <circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1.5"
              />
            ))}
            {/* Light glint sweeping across the disc */}
            <path
              d="M100 4 A96 96 0 0 1 196 100 L100 100 Z"
              fill="rgba(255,255,255,0.04)"
            />
            {/* Label */}
            <circle cx="100" cy="100" r="34" fill="var(--coral)" />
            <circle cx="100" cy="100" r="34" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
            <text
              x="100"
              y="96"
              textAnchor="middle"
              fontFamily="'Archivo Black', sans-serif"
              fontSize="13"
              fill="#2a0f0c"
              letterSpacing="0.5"
            >
              SIDE
            </text>
            <text
              x="100"
              y="114"
              textAnchor="middle"
              fontFamily="'Archivo Black', sans-serif"
              fontSize="13"
              fill="#2a0f0c"
            >
              A
            </text>
            {/* Spindle hole */}
            <circle cx="100" cy="100" r="4" fill="#0d0d10" />
          </motion.svg>

          {/* Tonearm — swings in when playing */}
          <motion.div
            className="record-tonearm"
            animate={{ rotate: isPlaying ? -22 : -42 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
            <span className="tonearm-base" />
            <span className="tonearm-rod" />
            <span className="tonearm-head" />
          </motion.div>
        </div>

        <div className="record-caption">
          <span className="record-eq" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          {isPlaying ? 'now playing' : 'tap to play'}
        </div>
      </div>
    </Sticker>
  );
}
