import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import Peel from '../Peel/Peel';
import './RecordCrate.css';

/**
 * RecordCrate — back wall and front lip are both children of the same Sticker,
 * so they share one transform and scale together perfectly on hover/drag.
 */
export default function RecordCrate({
  x,
  y,
  rotate = 0,
  z,
  enterDelay,
  bringToFront,
  constraintsRef,
  crateRef,
  onBinMove,
  onBinHoverChange,
  binScaleMotion,
}) {
  const internalCrateRef = useRef(null);
  const isDraggingRef = useRef(false);

  const reportPosition = () => {
    if (!internalCrateRef.current || !onBinMove) return;
    // Use the sticker outer div (not scaled) for all position values.
    // The .crate motion.div scales visually, but records must position from
    // the un-scaled layout rect so they don't double-translate while scaling.
    const stickerEl = internalCrateRef.current.closest('.sticker');
    const sr = stickerEl
      ? stickerEl.getBoundingClientRect()
      : internalCrateRef.current.getBoundingClientRect();
    onBinMove({
      left: sr.left,
      top: sr.top,
      right: sr.right,
      bottom: sr.bottom,
      width: sr.width,
      height: sr.height,
      cx: sr.left + sr.width / 2,
      cy: sr.top + sr.height / 2,
    });
  };

  useEffect(() => {
    let rafId;
    const loop = () => {
      reportPosition();
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHoverStart = () => {
    if (!isDraggingRef.current) binScaleMotion?.set(1.04);
    onBinHoverChange?.(true);
  };
  const handleHoverEnd = () => {
    if (!isDraggingRef.current) binScaleMotion?.set(1);
    onBinHoverChange?.(false);
  };
  const handleDragStart = () => {
    isDraggingRef.current = true;
    binScaleMotion?.set(1.07);
    reportPosition();
  };
  const handleDragEnd = () => {
    isDraggingRef.current = false;
    binScaleMotion?.set(1);
    reportPosition();
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
      disableScale={true}
      onDrag={reportPosition}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        ref={(el) => {
          internalCrateRef.current = el;
          if (crateRef) crateRef.current = el;
        }}
        className="crate"
        style={{ scale: binScaleMotion }}
      >
        <div className="crate-back" aria-hidden="true" />
        <div className="crate-front" aria-hidden="true" />
      </motion.div>
    </Sticker>
  );
}

/**
 * Record — fixed-positioned at pad level. Tracks the crate's viewport position
 * each frame. When in-bin a clip-path hides the bottom 20px that sits behind
 * the front lip, creating the illusion of records sitting inside the bin.
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
  binZIndex,
  binScaleMotion,
  playerScale,
}) {
  const elRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const originX = useMotionValue(0.5);
  const originY = useMotionValue(0.5);
  const [z, setZ] = useState(binZIndex + 1 + slot);
  const [playing, setPlaying] = useState(false);
  const [state, setState] = useState('in-bin');
  // Slot offsets: left from crate.left, bottom from crate.bottom
  // Slot 0 touches the left border, slot 2 touches the right border, slot 1 is
  // centred. Bin = 128px, record = 96px, 4px visual border each side.
  const slotOffsets = [
    { left: 4,  bottom: 34 },
    { left: 16, bottom: 34 },
    { left: 28, bottom: 34 },
  ];

  useEffect(() => {
    if (state === 'in-bin') setZ(binZIndex + 1 + slot);
  }, [binZIndex, state, slot]);

  useEffect(() => {
    registerMotion(song.id, x, y, elRef);
    register(song.id, {
      goHome: () => {
        setState('in-bin');
        setZ(binZIndex + 1 + slot);
      },
    });
  }, [binZIndex, slot]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPlaying(docked);
    if (docked) setState('docked');
  }, [docked]);

  // Track position for in-bin and docked states
  useEffect(() => {
    if (state !== 'in-bin' && state !== 'docked') return;

    let rafId;
    const loop = () => {
      if (state === 'in-bin') {
        const binPos = getBinPosition();
        if (binPos) {
          const offset = slotOffsets[slot];
          const tx = binPos.left + offset.left;
          const ty = binPos.bottom - offset.bottom - 96;
          x.set(tx);
          y.set(ty);
          // Match scale origin to the crate's transform-origin (sticker center)
          if (binPos.cx !== undefined) {
            originX.set((binPos.cx - tx) / 96);
            originY.set((binPos.cy - ty) / 96);
          }
        }
      } else if (state === 'docked') {
        const platter = platterRef.current;
        if (platter) {
          const r = platter.getBoundingClientRect();
          x.set(r.left + (r.width - 96) / 2);
          y.set(r.top + (r.height - 96) / 2);
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [state, slot]); // eslint-disable-line react-hooks/exhaustive-deps

  const lift = () => {
    if (bringToFront) setZ(bringToFront());
  };

  const handleDragStart = () => {
    if (state === 'in-bin' || state === 'docked') setState('free');
  };

  const handleDragEnd = () => {
    if (isOverPlatter?.(elRef.current)) {
      onDock(song);
      setState('docked');
      setZ(100);
    } else if (isOverCrate?.(elRef.current)) {
      if (docked) onRelease(song.id);
      setState('in-bin');
      setZ(binZIndex + 1 + slot);
    } else {
      if (docked) onRelease(song.id);
      setState('free');
    }
  };

  const isInBin = state === 'in-bin';
  const isDocked = state === 'docked';

  return (
    <motion.div
      ref={elRef}
      className={`record-floating${isInBin ? ' is-in-bin' : ''}${docked ? ' is-docked' : ''}`}
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
        ...(isInBin ? { scale: binScaleMotion, originX, originY } : {}),
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
      {/* Round record: the left edge folds along a straight chord. */}
      <Peel sides={['l']} size={16} inset={-3} radius="50%" back="#f4f1ea" fill>
        <span
          className={`record-disc ${playing ? 'is-spinning' : ''}`}
          style={{ '--label': song.labelImage ? `url(${song.labelImage})` : song.color }}
        >
          <span className="record-label" />
          <span className="record-hole" />
        </span>
      </Peel>
    </motion.div>
  );
}
