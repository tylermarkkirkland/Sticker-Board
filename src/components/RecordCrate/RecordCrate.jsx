import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, frame } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import './RecordCrate.css';

const SPRING = { type: 'spring', stiffness: 300, damping: 28 };

/**
 * RecordCrate — bin that visually contains records.
 */
export default function RecordCrate({
  x,
  y,
  rotate = 0,
  z,
  enterDelay,
  bringToFront,
  constraintsRef,
  dockedId,
  isOverPlatter,
  isOverCrate,
  onDock,
  onRelease,
  register,
  registerRecordMotion,
  platterRef,
  crateRef,
  getBinPosition,
  onBinMove,
  onBinHoverChange,
  onBinDragChange,
  binMotionX,
  binMotionY,
  binScaleMotion,
}) {
  const internalCrateRef = useRef(null);
  const internalMotionX = useMotionValue(0);
  const internalMotionY = useMotionValue(0);

  const reportPosition = () => {
    if (!internalCrateRef.current || !onBinMove) return;
    const rect = internalCrateRef.current.getBoundingClientRect();

    // Use the outer .sticker element's center as the scale origin.
    // The sticker scales via whileHover/whileDrag from transform-origin: 50% 50%,
    // which equals (stickerRect.left + w/2, stickerRect.top + h/2) in viewport space.
    // For rotation about center, the AABB center == the layout center, so this is exact.
    const stickerEl = internalCrateRef.current.closest('.sticker');
    const stickerRect = stickerEl ? stickerEl.getBoundingClientRect() : rect;
    const cx = stickerRect.left + stickerRect.width / 2;
    const cy = stickerRect.top + stickerRect.height / 2;

    // Read the actual CSS scale applied to the outer sticker div this frame and
    // mirror it to binScaleMotion so FrontLip and Records are always frame-exact.
    if (stickerEl && binScaleMotion) {
      const transform = window.getComputedStyle(stickerEl).transform;
      if (transform && transform !== 'none') {
        const m = new DOMMatrix(transform);
        // For a pure scale (no rotation on the outer div): a==d==scale, b==c==0
        binScaleMotion.set(Math.hypot(m.a, m.b));
      } else {
        binScaleMotion.set(1);
      }
    }

    onBinMove({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      cx,
      cy,
    });
  };

  // Report position after Framer Motion writes its transforms each frame.
  // frame.postRender fires after FM finishes DOM writes, so getComputedStyle
  // inside reportPosition() always reads the freshly-written scale value.
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      frame.postRender(() => {
        reportPosition();
        if (running) requestAnimationFrame(tick);
      });
    };
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync motion values
  useEffect(() => {
    const unsubX = internalMotionX.on('change', (v) => binMotionX?.set(v));
    const unsubY = internalMotionY.on('change', (v) => binMotionY?.set(v));
    return () => {
      unsubX();
      unsubY();
    };
  }, [binMotionX, binMotionY, internalMotionX, internalMotionY]);

  const handleDrag = (event, info) => {
    reportPosition();
  };

  const handleHoverStart = () => {
    onBinHoverChange?.(true);
  };

  const handleHoverEnd = () => {
    onBinHoverChange?.(false);
  };

  const handleDragStart = () => {
    reportPosition();
    onBinDragChange?.(true);
  };

  const handleDragEnd = () => {
    reportPosition();
    onBinDragChange?.(false);
    onBinHoverChange?.(false);
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
      className="record-crate-shell"
      label="Record crate"
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      motionX={internalMotionX}
      motionY={internalMotionY}
    >
      <div ref={(el) => {
        internalCrateRef.current = el;
        if (crateRef) crateRef.current = el;
      }} className="crate">
        <div className="crate-back" aria-hidden="true" />
        {/* Front lip removed - now renders at pad level */}
      </div>
    </Sticker>
  );
}

/**
 * FrontLip - floats at pad level to render above records
 */
export function FrontLip({ getBinPosition, binZIndex, binScaleMotion, binMotionX, binMotionY }) {
  const lipRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const originX = useMotionValue(0.5);
  const originY = useMotionValue(0.5);
  const lipZ = binZIndex + 4;

  useEffect(() => {
    let rafId;
    const loop = () => {
      const binPos = getBinPosition();
      if (binPos) {
        const lipWidth = 128;
        const lipHeight = 54;

        const lipLeft = binPos.left;
        const lipTop = binPos.bottom - lipHeight;

        // Use the sticker's actual center (cx/cy) — matches whileHover transform-origin exactly
        const relativeOriginX = (binPos.cx - lipLeft) / lipWidth;
        const relativeOriginY = (binPos.cy - lipTop) / lipHeight;

        x.set(lipLeft);
        y.set(lipTop);
        originX.set(relativeOriginX);
        originY.set(relativeOriginY);
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [binMotionX, binMotionY]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      ref={lipRef}
      className="crate-front-floating"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '128px',
        height: '54px',
        x,
        y,
        zIndex: lipZ,
        pointerEvents: 'none',
        originX,
        originY,
        scale: binScaleMotion,
      }}
    />
  );
}

/**
 * Record - uses motion values for ALL positioning.
 */
export function Record({
  song,
  slot,
  docked,
  constraintsRef,
  bringToFront,
  isOverPlatter,
  isOverCrate,
  onDock,
  onRelease,
  register,
  registerMotion,
  platterRef,
  getBinPosition,
  getPlayerPosition,
  binZIndex,
  binScaleMotion,
  binMotionX,
  binMotionY,
  playerScale
}) {
  const elRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const originX = useMotionValue(0.5);
  const originY = useMotionValue(0.5);
  const baseZ = binZIndex + 1 + slot; // Bin + 1/2/3 based on slot
  const [z, setZ] = useState(baseZ);
  const [playing, setPlaying] = useState(false);
  const [state, setState] = useState('in-bin');

  // Slot offsets within bin
  const slotOffsets = [
    { left: 10, bottom: 34 },
    { left: 21, bottom: 34 },
    { left: 32, bottom: 34 }
  ];

  // Update baseZ when binZIndex changes
  useEffect(() => {
    if (state === 'in-bin') {
      setZ(binZIndex + 1 + slot);
    }
  }, [binZIndex, state, slot]);

  // Register with parent
  useEffect(() => {
    registerMotion(song.id, x, y, elRef);
    register(song.id, {
      goHome: () => {
        setState('in-bin');
        setZ(binZIndex + 1 + slot);
      }
    });
  }, [binZIndex, slot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update playing state
  useEffect(() => {
    setPlaying(docked);
    if (docked) {
      setState('docked');
    }
  }, [docked]);

  // Update position based on state
  useEffect(() => {
    if (state !== 'in-bin' && state !== 'docked') return;

    let rafId;
    const loop = () => {
      if (state === 'in-bin') {
        const binPos = getBinPosition();
        if (binPos) {
          const slotOffset = slotOffsets[slot];
          const recordWidth = 96;
          const recordHeight = 96;

          const targetX = binPos.left + slotOffset.left;
          const targetY = binPos.bottom - slotOffset.bottom - recordHeight;

          // Use sticker's actual center (cx/cy) to match whileHover transform-origin exactly
          const relativeOriginX = (binPos.cx - targetX) / recordWidth;
          const relativeOriginY = (binPos.cy - targetY) / recordHeight;

          x.set(targetX);
          y.set(targetY);
          originX.set(relativeOriginX);
          originY.set(relativeOriginY);
        }
      } else if (state === 'docked') {
        const platter = platterRef.current;
        if (platter) {
          const platterRect = platter.getBoundingClientRect();
          const recordWidth = 96;
          const recordHeight = 96;
          const targetX = platterRect.left + (platterRect.width - recordWidth) / 2;
          const targetY = platterRect.top + (platterRect.height - recordHeight) / 2;
          x.set(targetX);
          y.set(targetY);
          originX.set(0.5);
          originY.set(0.5);
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(rafId);
  }, [state, slot, binMotionX, binMotionY]); // eslint-disable-line react-hooks/exhaustive-deps

  const lift = () => {
    if (bringToFront) setZ(bringToFront());
  };

  const handleDragStart = () => {
    if (state === 'in-bin' || state === 'docked') {
      setState('free');
    }
  };

  const handleDragEnd = () => {
    if (isOverPlatter && isOverPlatter(elRef.current)) {
      onDock(song);
      setState('docked');
      setZ(100);
    } else if (isOverCrate && isOverCrate(elRef.current)) {
      if (docked) onRelease(song.id);
      setState('in-bin');
      setZ(binZIndex + 1 + slot);
    } else {
      if (docked) onRelease(song.id);
      setState('free');
    }
  };

  // When in-bin use shared binScaleMotion; when docked use playerScale number (animate); when free own hover/drag
  const isInBin = state === 'in-bin';
  const isDocked = state === 'docked';

  return (
    <motion.div
      ref={elRef}
      className={`record-floating ${docked ? 'is-docked' : ''}`}
      data-slot={slot}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '96px',
        height: '96px',
        x,
        y,
        zIndex: z,
        originX,
        originY,
        ...(isInBin ? { scale: binScaleMotion } : {})
      }}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0}
      dragMomentum={false}
      onPointerDown={lift}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={isDocked ? { scale: playerScale } : undefined}
      whileHover={!isInBin && !isDocked ? { scale: 1.06 } : undefined}
      whileDrag={!isInBin && !isDocked ? { scale: 1.1, cursor: 'grabbing' } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      aria-label={`Record: ${song.title}. Drag onto the player to play.`}
    >
      <span
        className={`record-disc ${playing ? 'is-spinning' : ''}`}
        style={{ '--label': song.labelImage ? `url(${song.labelImage})` : song.color }}
      >
        <span className="record-label" />
        <span className="record-hole" />
      </span>
    </motion.div>
  );
}
