import { useEffect, useRef } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import './Peel.css';

// Where each side lifts from, as a direction pointing out of the sticker.
// Corners fold along a 45° crease; edges (l/r/t/b) fold along a straight line
// parallel to that edge, which is what you want for round stickers.
const SIDES = {
  tl: [-1, -1], tr: [1, -1], bl: [-1, 1], br: [1, 1],
  l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1],
};
// How far outside the box the body clip reaches, so shadows, rings and
// overflowing bits (speech bubbles, captions) are never cut off.
const MARGIN = 400;

const toInset = (inset) =>
  typeof inset === 'number'
    ? { top: inset, right: inset, bottom: inset, left: inset }
    : { top: 0, right: 0, bottom: 0, left: 0, ...inset };

// Clip a polygon to the half-plane nx·x + ny·y <= k (Sutherland–Hodgman).
const clipHalfPlane = (points, nx, ny, k) => {
  const out = [];
  const inside = ([x, y]) => nx * x + ny * y <= k;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    const pIn = inside(p);
    const qIn = inside(q);
    if (pIn) out.push(p);
    if (pIn !== qIn) {
      const fp = nx * p[0] + ny * p[1] - k;
      const fq = nx * q[0] + ny * q[1] - k;
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
};

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const polygon = (points) => `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;

/**
 * Peel — lifts a corner (or edge) of a sticker on hover, like a thumbnail
 * getting under it. The side folds back along a crease, showing the paper
 * back of the sticker; moving the cursor toward that side peels it a little
 * further. With several sides allowed, the one nearest the cursor lifts.
 *
 * How it works: the content is clipped along the fold line, and a "flap" (the
 * paper back) is mirrored across that same line. One spring value (the fold
 * depth) drives both, so they can never drift apart.
 *
 * Props:
 *  - sides    which sides may peel: 'tl' 'tr' 'bl' 'br' corners, or
 *             'l' 'r' 't' 'b' edges (default: ['tr']). For irregular art,
 *             a side can be a custom tip: { x, y, nx, ny } — the tip point
 *             in box px and the direction it points out of the sticker
 *             (ideally splitting the corner's angle evenly).
 *  - size     max fold depth in px (along the edges for a corner, straight
 *             in for an edge)
 *  - inset    px (or {top,right,bottom,left}) from the box edge to the real
 *             sticker edge — for art with transparent/shadow margins.
 *             Negative values reach outside the box (e.g. a border ring).
 *  - radius   corner radius of the sticker ('50%' for round), for the flap
 *  - back     color of the sticker's paper back
 *  - mask     { src, size, x, y } for cut-out art: the flap takes the image's
 *             silhouette; x/y place the image relative to the box
 *  - fill     stretch the wrapper to its parent (for fixed-size parents)
 *  - delay    ms to wait after the cursor arrives before lifting, e.g. to
 *             let the sticker's own hover transition finish first
 *  - onActiveChange(bool)  true when the cursor arrives, false once the peel
 *             has fully settled back after it leaves — lets a sticker hold
 *             its hover look until the corner is flat again
 */
export default function Peel({
  sides = ['tr'],
  size = 24,
  inset = 0,
  radius = 0,
  back = '#f4f1ea',
  mask,
  fill = false,
  delay = 0,
  onActiveChange,
  children,
}) {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef(null);
  const geo = useRef({ w: 0, h: 0, side: sides[0] });
  const pending = useRef(null);
  const target = useRef(0);
  const delayTimer = useRef(null);
  const waiting = useRef(false); // inside the enter delay, not lifted yet
  const active = useRef(false);
  const hovering = useRef(false);
  // Slightly under-damped so the corner lifts with a little springy give.
  const depth = useSpring(0, { stiffness: 340, damping: 19, mass: 0.7 });
  const ins = toInset(inset);

  // Fold geometry for the active side at depth d: unit normal n pointing out
  // of the sticker, and the fold line n·p = k.
  const fold = (v) => {
    const d = Math.max(0, v);
    const { w, h, side } = geo.current;
    const x0 = ins.left;
    const y0 = ins.top;
    const x1 = w - ins.right;
    const y1 = h - ins.bottom;
    const custom = typeof side === 'object';
    const [sx, sy] = custom ? [side.nx, side.ny] : SIDES[side];
    const len = Math.hypot(sx, sy);
    const nx = sx / len;
    const ny = sy / len;
    // Outermost point of the sticker in that direction.
    const cx = custom ? side.x : sx > 0 ? x1 : x0;
    const cy = custom ? side.y : sy > 0 ? y1 : y0;
    // Box-corner depth is measured along the edges, so the crease sits d/√2
    // in; edges and custom tips fold straight in by d.
    const inward = !custom && sx && sy ? d / Math.SQRT2 : d;
    const k = nx * cx + ny * cy - inward;
    return { d, w, h, x0, y0, x1, y1, nx, ny, k, inward };
  };

  const bodyClip = useTransform(depth, (v) => {
    const { d, w, h, nx, ny, k } = fold(v);
    if (d < 0.5) return 'none';
    return polygon(clipHalfPlane(rect(-MARGIN, -MARGIN, w + MARGIN, h + MARGIN), nx, ny, k));
  });

  // Reflection across the fold line: (I − 2nnᵀ)p + 2kn, with origin 0 0.
  const flapTransform = useTransform(depth, (v) => {
    const { nx, ny, k } = fold(v);
    return `matrix(${1 - 2 * nx * nx}, ${-2 * nx * ny}, ${-2 * nx * ny}, ${1 - 2 * ny * ny}, ${2 * k * nx}, ${2 * k * ny})`;
  });

  // The flap face sits on the sticker rect; only the part past the fold shows.
  const flapClip = useTransform(depth, (v) => {
    const { x0, y0, x1, y1, nx, ny, k } = fold(v);
    const local = k - (nx * x0 + ny * y0);
    return polygon(clipHalfPlane(rect(0, 0, x1 - x0, y1 - y0), -nx, -ny, -local));
  });

  // Crease shading: darker along the fold, a soft highlight toward the tip.
  const flapShade = useTransform(depth, (v) => {
    const { nx, ny, inward: f } = fold(v);
    const angle = (Math.atan2(nx, -ny) * 180) / Math.PI;
    return `linear-gradient(${angle}deg,
      rgba(0, 0, 0, 0.22) calc(100% - ${f}px),
      rgba(0, 0, 0, 0.06) calc(100% - ${f * 0.55}px),
      rgba(255, 255, 255, 0.35) calc(100% - ${f * 0.2}px),
      rgba(0, 0, 0, 0.03) 100%)`;
  });

  const flapOpacity = useTransform(depth, (v) => (v < 0.5 ? 0 : 1));

  // Nearest allowed side to the cursor, and how far to peel it.
  const nearestSide = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    let best = sides[0];
    let bestDist = Infinity;
    sides.forEach((s) => {
      // Corners and tips measure to their point; edges to the edge line.
      let tx;
      let ty;
      if (typeof s === 'object') {
        tx = s.x / geo.current.w;
        ty = s.y / geo.current.h;
      } else {
        const [sx, sy] = SIDES[s];
        tx = sx ? (sx > 0 ? 1 : 0) : px;
        ty = sy ? (sy > 0 ? 1 : 0) : py;
      }
      const dist = Math.hypot(px - tx, py - ty);
      if (dist < bestDist) {
        best = s;
        bestDist = dist;
      }
    });
    // Closer to the side peels further: 55% at the far side, 100% on it.
    const closeness = Math.max(0, 1 - bestDist / Math.SQRT2);
    return { side: best, amount: size * (0.55 + 0.45 * closeness) };
  };

  const setActive = (on) => {
    if (active.current === on) return;
    active.current = on;
    onActiveChange?.(on);
  };

  // Flat and (nearly) still — the springy overshoot has finished.
  const isSettledFlat = () => Math.abs(depth.get()) < 0.5 && Math.abs(depth.getVelocity()) < 20;

  useMotionValueEvent(depth, 'change', (v) => {
    // Retract before switching sides, then lift the new one.
    if (pending.current && v < 1) {
      geo.current.side = pending.current;
      pending.current = null;
      depth.set(target.current);
    }
    // Report "inactive" only once the corner has come to rest flat.
    if (!hovering.current && isSettledFlat()) setActive(false);
  });

  useEffect(() => () => clearTimeout(delayTimer.current), []);

  const aim = (e, entering) => {
    if (e.pointerType === 'touch') return;
    const el = wrapRef.current;
    if (entering) {
      hovering.current = true;
      geo.current.w = el.offsetWidth;
      geo.current.h = el.offsetHeight;
      setActive(true);
      if (delay > 0) {
        waiting.current = true;
        clearTimeout(delayTimer.current);
        delayTimer.current = setTimeout(() => {
          waiting.current = false;
          depth.set(target.current);
        }, delay);
      }
    }
    const { side, amount } = nearestSide(e);
    target.current = amount;
    if (waiting.current) {
      geo.current.side = side;
    } else if (entering || depth.get() < 1) {
      geo.current.side = side;
      pending.current = null;
      depth.set(amount);
    } else if (side !== geo.current.side) {
      pending.current = side;
      depth.set(0);
    } else if (!pending.current) {
      depth.set(amount);
    }
  };

  const release = () => {
    hovering.current = false;
    pending.current = null;
    clearTimeout(delayTimer.current);
    waiting.current = false;
    depth.set(0);
    // Never lifted (left during the delay): nothing to wait for.
    if (isSettledFlat()) setActive(false);
  };

  if (reduceMotion) return children;

  const maskPosition = mask ? `${(mask.x ?? 0) - ins.left}px ${(mask.y ?? 0) - ins.top}px` : undefined;
  const maskStyle = mask
    ? {
        WebkitMaskImage: `url(${mask.src})`,
        maskImage: `url(${mask.src})`,
        WebkitMaskSize: mask.size ?? '100% 100%',
        maskSize: mask.size ?? '100% 100%',
        WebkitMaskPosition: maskPosition,
        maskPosition,
      }
    : {};

  return (
    <div
      ref={wrapRef}
      className={`peel${fill ? ' peel--fill' : ''}`}
      onPointerEnter={(e) => aim(e, true)}
      onPointerMove={(e) => aim(e, false)}
      onPointerLeave={release}
    >
      <motion.div className="peel-body" style={{ clipPath: bodyClip }}>
        {children}
      </motion.div>

      <motion.div
        className="peel-flap"
        aria-hidden="true"
        style={{ transform: flapTransform, opacity: flapOpacity }}
      >
        <motion.div
          className="peel-flap-face"
          style={{
            top: ins.top,
            left: ins.left,
            right: ins.right,
            bottom: ins.bottom,
            borderRadius: radius,
            backgroundColor: back,
            backgroundImage: flapShade,
            clipPath: flapClip,
            ...maskStyle,
          }}
        />
      </motion.div>
    </div>
  );
}
