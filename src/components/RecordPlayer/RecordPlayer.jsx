import { useEffect, useRef } from 'react';
import { AnimatePresence, cancelFrame, frame, motion, useMotionValue } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import './RecordPlayer.css';

// Tonearm angles. The arm starts pointing left from its pivot; negative
// rotation swings it down. Rest parks it beside the platter, play drops the
// needle onto the outer grooves of a docked record.
const ARM_REST = -90;
const ARM_PLAY = -64;
const BODY_SIZE = 150;

/**
 * RecordPlayer — draggable turntable sticker.
 * Reports position changes for docked record tracking.
 *
 * The tonearm is rendered OUTSIDE the sticker on its own fixed layer, because
 * docked records live at pad level above every sticker. The layer copies the
 * body's on-screen center, scale and opacity each frame so it moves as one
 * piece with the player while sitting on top of the record.
 */
export default function RecordPlayer({
  x,
  y,
  rotate = 0,
  z,
  enterDelay,
  bringToFront,
  constraintsRef,
  dockedSong,
  platterRef,
  playerRef,
  onPlayerMove,
  onPlayerHoverChange,
  onPlayerDragChange,
}) {
  const bodyRef = useRef(null);
  const armX = useMotionValue(0);
  const armY = useMotionValue(0);
  const armScale = useMotionValue(1);
  const armOpacity = useMotionValue(0);

  // Keep the tonearm layer glued to the turntable body. Center is invariant
  // under the body's scale, so center + width-derived scale is exact.
  const syncArm = () => {
    const body = bodyRef.current;
    if (!body) return;
    const rect = body.getBoundingClientRect();
    armX.set(rect.left + rect.width / 2 - BODY_SIZE / 2);
    armY.set(rect.top + rect.height / 2 - BODY_SIZE / 2);
    armScale.set(rect.width / BODY_SIZE);
    const inner = body.closest('.sticker-inner');
    if (inner) armOpacity.set(Number(getComputedStyle(inner).opacity));
  };

  // Report player position to parent
  const reportPosition = () => {
    if (!platterRef.current || !onPlayerMove) return;
    const rect = platterRef.current.getBoundingClientRect();
    onPlayerMove({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom
    });
  };

  // Runs in Framer's frame loop: report the player in the read step and move
  // the tonearm in the update step, so both land in the same frame as the
  // player instead of trailing it by one.
  useEffect(() => {
    reportPosition();
    syncArm();
    frame.read(reportPosition, true);
    frame.update(syncArm, true);
    return () => {
      cancelFrame(reportPosition);
      cancelFrame(syncArm);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrag = (event, info) => {
    reportPosition();
  };

  const handleHoverStart = () => {
    onPlayerHoverChange?.(true);
  };

  const handleHoverEnd = () => {
    onPlayerHoverChange?.(false);
  };

  const handleDragStart = () => {
    reportPosition();
    onPlayerDragChange?.(true);
  };

  const handleDragEnd = () => {
    reportPosition();
    onPlayerDragChange?.(false);
    // Reset hover state since drag end may leave mouse outside element
    onPlayerHoverChange?.(false);
  };

  return (
    <>
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="record-player-shell"
      // Only top-left: the caption hangs off the bottom and the tonearm
      // (its own layer) sits at top-right.
      peel={{ sides: ['tl'], size: 30, inset: -4, radius: 22, back: '#f4f1ea' }}
      label="Record player"
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <div ref={playerRef} className="turntable">
        <div ref={bodyRef} className="turntable-body">
          <div ref={platterRef} className="platter">
            <span className="platter-spindle" />
          </div>
        </div>

        <AnimatePresence>
          {dockedSong && (
            <motion.div
              className="turntable-caption"
              initial={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
              animate={{ clipPath: 'inset(0 0 0% 0)', opacity: 1 }}
              exit={{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <span className="np-row">
                <span className="np-eq" aria-hidden="true">
                  <i /><i /><i /><i />
                </span>
                {dockedSong.title}
              </span>
              {dockedSong.streamUrl && (
                <a
                  className="np-link"
                  href={dockedSong.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  listen on Spotify ↗
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sticker>

    <motion.div
      className="tonearm-layer"
      aria-hidden="true"
      style={{ x: armX, y: armY, scale: armScale, opacity: armOpacity }}
    >
      <motion.div
        className="tonearm"
        initial={false}
        animate={{ rotate: dockedSong ? ARM_PLAY : ARM_REST }}
        // Small delay on the way in so the record lands before the needle drops.
        transition={{ type: 'spring', stiffness: 90, damping: 16, delay: dockedSong ? 0.2 : 0 }}
      >
        <span className="tonearm-base" />
        <span className="tonearm-rod" />
        <span className="tonearm-head" />
      </motion.div>
    </motion.div>
    </>
  );
}
