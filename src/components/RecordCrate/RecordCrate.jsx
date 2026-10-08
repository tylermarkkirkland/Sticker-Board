import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
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
  onBinDragChange,
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

  // Hover scale is applied by App, which treats the crate and its fanned
  // records as one hover zone.
  const handleHoverStart = () => {
    if (!isDraggingRef.current) onBinHoverChange?.(true);
  };
  const handleHoverEnd = () => {
    if (!isDraggingRef.current) onBinHoverChange?.(false);
  };
  const handleDragStart = () => {
    isDraggingRef.current = true;
    onBinDragChange?.(true); // fold the fan away while the crate moves
    binScaleMotion?.set(1.07);
    reportPosition();
  };
  const handleDragEnd = () => {
    isDraggingRef.current = false;
    binScaleMotion?.set(1);
    reportPosition();
    onBinDragChange?.(false); // still hovered after the drop? the fan reopens
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

// Fan layout when the crate is hovered: records rise out of the crate and
// spread in an arc like a hand of cards. Position is per fan slot, from -1
// (leftmost) to 1 (rightmost).
// Bottoms stay tucked behind the front lip so they read as popping out of
// the crate rather than floating above it.
const FAN_SPREAD = 50; // px from center to the outermost record
const FAN_RISE = 22;   // px the center record lifts
const FAN_DROOP = 10;  // px the outer records sit lower than the center
const FAN_TILT = 14;   // degrees the outer records lean
const FAN_HOVER_SCALE = 1.08;
// Front lip: 54px tall, with a 4px die-cut ring around it.
const LIP_H = 54;
const LIP_RING = 4;
const CLIP_PAD = 40; // room around the record for its ring + hover-grow

const fanSlot = (index, count) => (count <= 1 ? 0 : (index / (count - 1)) * 2 - 1);

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
  binSpread,
  fanIndex,
  fanCount,
  onFanHover,
  onBinStateChange,
}) {
  const elRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const originX = useMotionValue(0.5);
  const originY = useMotionValue(0.5);
  // Fan extras. Tilt + hover-grow live on an inner layer so they never mix
  // with the crate-synced scale/origin on the outer element.
  const tilt = useMotionValue(0);
  // Hides exactly the part of the record that's behind the front lip.
  const clipPath = useMotionValue('none');
  const [fanHover, setFanHover] = useState(false);
  const fanRef = useRef({ index: fanIndex, count: fanCount });
  fanRef.current = { index: fanIndex, count: fanCount };
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

  // Tell App which records are in the crate (for the fan), and settle the
  // fan tilt once a record leaves the crate.
  useEffect(() => {
    onBinStateChange?.(song.id, state === 'in-bin');
    if (state !== 'in-bin') {
      clipPath.set('none');
      animate(tilt, 0, { type: 'spring', stiffness: 320, damping: 26 });
      if (fanHover) {
        setFanHover(false);
        onFanHover?.(song.id, false);
      }
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track position for in-bin and docked states
  useEffect(() => {
    if (state !== 'in-bin' && state !== 'docked') return;

    let rafId;
    const loop = () => {
      if (state === 'in-bin') {
        const binPos = getBinPosition();
        if (binPos) {
          const offset = slotOffsets[slot];
          const restX = binPos.left + offset.left;
          const restY = binPos.bottom - offset.bottom - 96;
          // Blend from the resting slot to this record's place in the fan.
          const s = Math.max(0, binSpread?.get() ?? 0);
          const t = fanSlot(fanRef.current.index, fanRef.current.count);
          const rise = FAN_RISE - FAN_DROOP * t * t;
          const fanX = binPos.left + (binPos.width - 96) / 2 + FAN_SPREAD * t;
          const fanY = binPos.bottom - offset.bottom - 96 - rise;
          const tx = restX + (fanX - restX) * s;
          const ty = restY + (fanY - restY) * s;
          x.set(tx);
          y.set(ty);
          tilt.set(FAN_TILT * t * s);
          // Cut the lip's rectangle (in this record's local px) out of the
          // record, so it's hidden only where it's actually behind the lip —
          // a record leaning past the crate's side stays whole.
          const lipL = binPos.left - LIP_RING - tx;
          const lipR = binPos.left + binPos.width + LIP_RING - tx;
          const lipT = binPos.bottom - LIP_H - LIP_RING - ty;
          const lo = -CLIP_PAD;
          const hi = 96 + CLIP_PAD;
          clipPath.set(
            `polygon(${lo}px ${lo}px, ${hi}px ${lo}px, ${hi}px ${hi}px, ${lipR}px ${hi}px, ` +
            `${lipR}px ${lipT}px, ${lipL}px ${lipT}px, ${lipL}px ${hi}px, ${lo}px ${hi}px)`
          );
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
    clipPath.set('none'); // out of the crate: nothing is behind the lip now
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

  // Hovering an in-crate record keeps the fan open, grows it, and brings it
  // in front of its neighbours so it's easy to see and grab.
  const handleHoverStart = (e) => {
    if (e.pointerType === 'touch' || !isInBin) return;
    setFanHover(true);
    onFanHover?.(song.id, true);
  };
  const handleHoverEnd = () => {
    if (!fanHover) return;
    setFanHover(false);
    onFanHover?.(song.id, false);
  };

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
        zIndex: isInBin && fanHover ? binZIndex + 10 : z,
        // clipPath is always bound (not only in-bin): Framer leaves a style
        // in place when its key disappears, so the lip clip would otherwise
        // stick to a record after it's pulled out of the crate.
        clipPath,
        ...(isInBin ? { scale: binScaleMotion, originX, originY } : {}),
      }}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0}
      dragMomentum={false}
      onPointerDown={lift}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onPointerEnter={handleHoverStart}
      onPointerLeave={handleHoverEnd}
      animate={isDocked ? { scale: playerScale } : undefined}
      whileHover={!isInBin && !isDocked ? { scale: 1.06 } : undefined}
      whileDrag={!isInBin && !isDocked ? { scale: 1.1, cursor: 'grabbing' } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      aria-label={`Record: ${song.title}. Drag onto the player to play.`}
    >
      <motion.div
        className="record-tilt"
        style={{ rotate: tilt }}
        animate={{ scale: isInBin && fanHover ? FAN_HOVER_SCALE : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
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
    </motion.div>
  );
}
