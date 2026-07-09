import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import './RecordPlayer.css';

/**
 * RecordPlayer — draggable turntable sticker.
 * Reports position changes for docked record tracking.
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

  // Report position continuously using requestAnimationFrame
  useEffect(() => {
    let rafId;
    const loop = () => {
      reportPosition();
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
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
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="record-player-shell"
      label="Record player"
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <div ref={playerRef} className="turntable">
        <div className="turntable-body">
          <div ref={platterRef} className="platter">
            <span className="platter-spindle" />
          </div>
          <motion.div
            className="tonearm"
            animate={{ rotate: dockedSong ? -20 : -42 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
            <span className="tonearm-base" />
            <span className="tonearm-rod" />
            <span className="tonearm-head" />
          </motion.div>
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
  );
}
