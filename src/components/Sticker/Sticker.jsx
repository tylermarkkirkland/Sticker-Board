import { useState } from 'react';
import { motion } from 'framer-motion';
import './Sticker.css';

/**
 * Sticker — the tactile, draggable wrapper every object on the board uses.
 *
 * Handles: freeform placement, drag within the canvas, hover lift,
 * bring-to-front on interaction, a resting tilt, and optional gentle drift.
 *
 * Props:
 *  - x, y           starting position (any CSS length, e.g. "20%" or 120)
 *  - rotate         resting tilt in degrees (default 0)
 *  - z              base stacking order
 *  - bringToFront   () => number, hands back the next top z-index
 *  - drift          { y?, rotate?, duration? } for ambient floating motion
 *  - constraintsRef ref to the canvas, bounds the drag
 *  - onClick        click handler (fires only on a clean tap, not after a drag)
 *  - className      extra class for the inner shell
 *  - label          accessible label / title
 *  - interactive    if true, renders as a button-like focusable element
 */
export default function Sticker({
  x,
  y,
  rotate = 0,
  z = 1,
  bringToFront,
  drift,
  constraintsRef,
  onClick,
  className = '',
  label,
  interactive = false,
  enterDelay = 0,
  children,
}) {
  const [zIndex, setZIndex] = useState(z);
  const [isDragging, setIsDragging] = useState(false);

  const lift = () => {
    if (bringToFront) setZIndex(bringToFront());
  };

  // Ambient drift only when not being touched, and only if requested.
  // Always settle opacity/scale so the entrance fade-in resolves.
  const driftAnimation = drift
    ? {
        y: [0, drift.y ?? -8, 0],
        rotate: [rotate, rotate + (drift.rotate ?? 1.5), rotate],
        opacity: 1,
        scale: 1,
      }
    : { y: 0, rotate, opacity: 1, scale: 1 };

  const handleClick = (e) => {
    // Suppress click that's really the tail end of a drag.
    if (isDragging) return;
    onClick?.(e);
  };

  const handleKeyDown = (e) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <motion.div
      className={`sticker ${className}`}
      style={{ left: x, top: y, zIndex }}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0.12}
      dragMomentum={true}
      dragTransition={{ bounceStiffness: 260, bounceDamping: 22 }}
      onDragStart={() => {
        setIsDragging(true);
        lift();
      }}
      onDragEnd={() => {
        // Defer so the synthetic click after drag is swallowed.
        setTimeout(() => setIsDragging(false), 0);
      }}
      onPointerDown={lift}
      initial={{ opacity: 0, scale: 0.9, y: 26 }}
      animate={driftAnimation}
      transition={{
        // Entrance settles once...
        opacity: { delay: enterDelay, duration: 0.4 },
        scale: { delay: enterDelay, type: 'spring', stiffness: 220, damping: 18 },
        // ...then drift loops (or springs to rest if no drift).
        y: drift
          ? { delay: enterDelay, duration: drift.duration ?? 7, repeat: Infinity, ease: 'easeInOut' }
          : { delay: enterDelay, type: 'spring', stiffness: 220, damping: 20 },
        rotate: drift
          ? { delay: enterDelay, duration: drift.duration ?? 7, repeat: Infinity, ease: 'easeInOut' }
          : { delay: enterDelay, type: 'spring', stiffness: 220, damping: 20 },
      }}
      whileHover={{ scale: 1.04, rotate: rotate * 0.4 }}
      whileTap={{ scale: 0.97 }}
      whileDrag={{ scale: 1.06, cursor: 'grabbing' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
    >
      {children}
    </motion.div>
  );
}
