import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './Sticker.css';

/**
 * Sticker — the tactile, draggable wrapper every object on the board uses.
 *
 * Two layers, on purpose:
 *  - outer layer owns POSITION: drag, placement, lift-on-grab, stacking.
 *    Drag has no momentum and no elastic, so a piece stays exactly where
 *    you drop it and stops hard at the canvas edge.
 *  - inner layer owns DECORATION: the entrance, the resting tilt, and the
 *    optional ambient bob. Keeping the bob here means it never fights the
 *    drag, and a floating sticker keeps bobbing around its new drop spot.
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
 *  - enterDelay     stagger for the entrance animation
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
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd,
  onHoverStart,
  onHoverEnd,
  disableHoverScale = false,
  disableScale = false,
  className = '',
  label,
  interactive = false,
  enterDelay = 0,
  motionX,
  motionY,
  children,
}) {
  const [zIndex, setZIndex] = useState(z);
  const [isDragging, setIsDragging] = useState(false);
  // When the OS/browser requests reduced motion, we drop the entrance
  // slide/scale and any ambient drift so pieces just appear. Interaction
  // feedback (drag, hover, dock) is user-initiated and stays intact.
  const shouldReduceMotion = useReducedMotion();

  const lift = () => {
    if (bringToFront) setZIndex(bringToFront());
  };

  const handleClick = (e) => {
    // Suppress the click that's really the tail end of a drag.
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

  // Inner layer: entrance settles once, then either loops a gentle bob
  // (drift) or rests at the base tilt. Reduced motion skips the bob loop.
  const driftAnimation = (drift && !shouldReduceMotion)
    ? {
        y: [0, drift.y ?? -8, 0],
        rotate: [rotate, rotate + (drift.rotate ?? 1.5), rotate],
        opacity: 1,
        scale: 1,
      }
    : { y: 0, rotate, opacity: 1, scale: 1 };

  const dragStyle = {
    left: x,
    top: y,
    zIndex,
    ...(motionX && motionY ? { x: motionX, y: motionY } : {})
  };

  return (
    <motion.div
      className={`sticker ${isDragging ? 'is-lifted' : ''}`}
      style={dragStyle}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0}
      dragMomentum={false}
      onDragStart={(event, info) => {
        setIsDragging(true);
        lift();
        onDragStart?.(event, info);
      }}
      onDrag={onDrag}
      onDragEnd={(event, info) => {
        // Defer so the synthetic click after a drag is swallowed.
        setTimeout(() => setIsDragging(false), 0);
        onDragEnd?.(event, info);
      }}
      onPointerDown={lift}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      // Lift on grab, hold it the whole drag, soft-settle on release.
      whileHover={(disableHoverScale || disableScale) ? {} : { scale: 1.04 }}
      whileDrag={disableScale ? {} : { scale: 1.07 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
    >
      <motion.div
        className={`sticker-inner ${className}`}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 26 }}
        animate={driftAnimation}
        transition={shouldReduceMotion ? {
          opacity: { delay: enterDelay, duration: 0.3 },
          scale: { duration: 0 },
          y: { duration: 0 },
          rotate: { duration: 0 },
        } : {
          opacity: { delay: enterDelay, duration: 0.4 },
          scale: { delay: enterDelay, type: 'spring', stiffness: 220, damping: 18 },
          y: drift
            ? { delay: enterDelay, duration: drift.duration ?? 7, repeat: Infinity, ease: 'easeInOut' }
            : { delay: enterDelay, type: 'spring', stiffness: 220, damping: 20 },
          rotate: drift
            ? { delay: enterDelay, duration: drift.duration ?? 7, repeat: Infinity, ease: 'easeInOut' }
            : { delay: enterDelay, type: 'spring', stiffness: 220, damping: 20 },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
