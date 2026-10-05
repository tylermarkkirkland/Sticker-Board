import { useRef } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import './Peel.css';

// Direction of each corner: +1 = right/bottom, -1 = left/top.
const SIGNS = { tl: [-1, -1], tr: [1, -1], bl: [-1, 1], br: [1, 1] };
// CSS gradient angle pointing from the fold toward each corner's tip.
const ANGLES = { tl: 315, tr: 45, bl: 225, br: 135 };
// How far outside the box the body clip reaches, so shadows, rings and
// overflowing bits (speech bubbles, captions) are never cut off.
const MARGIN = 400;

const toInset = (inset) =>
  typeof inset === 'number'
    ? { top: inset, right: inset, bottom: inset, left: inset }
    : { top: 0, right: 0, bottom: 0, left: 0, ...inset };

// Clip a polygon to the half-plane sx·x + sy·y <= k (Sutherland–Hodgman).
const clipHalfPlane = (points, sx, sy, k) => {
  const out = [];
  const inside = ([x, y]) => sx * x + sy * y <= k;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    const pIn = inside(p);
    const qIn = inside(q);
    if (pIn) out.push(p);
    if (pIn !== qIn) {
      const fp = sx * p[0] + sy * p[1] - k;
      const fq = sx * q[0] + sy * q[1] - k;
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
};

const polygon = (points) => `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(', ')})`;

/**
 * Peel — lifts a corner of a sticker on hover, like a thumbnail getting under
 * the edge. The corner nearest the cursor folds back along a 45° crease,
 * showing the paper back of the sticker; moving toward the corner peels it a
 * little further, and moving to another corner swaps which one lifts.
 *
 * How it works: the content is clipped along the fold line, and a "flap" (the
 * paper back) is mirrored across that same line. One spring value (the fold
 * depth) drives both, so they can never drift apart.
 *
 * Props:
 *  - corners  which corners may peel, e.g. ['tr', 'br'] (default: all four)
 *  - size     max fold depth in px, measured along the edge from the corner
 *  - inset    px (or {top,right,bottom,left}) from the box edge to the real
 *             sticker edge — for art with transparent/shadow margins
 *  - radius   corner radius of the sticker, so the flap matches it
 *  - back     color of the sticker's paper back
 *  - mask     { src, size, position } for cut-out art: the flap takes the
 *             image's silhouette, positioned like the visible image
 */
export default function Peel({
  corners = ['tl', 'tr', 'bl', 'br'],
  size = 24,
  inset = 0,
  radius = 0,
  back = '#f4f1ea',
  mask,
  children,
}) {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef(null);
  const geo = useRef({ w: 0, h: 0, corner: corners[0] });
  const pending = useRef(null);
  const target = useRef(0);
  // Slightly under-damped so the corner lifts with a little springy give.
  const depth = useSpring(0, { stiffness: 340, damping: 19, mass: 0.7 });
  const ins = toInset(inset);

  // Rect of the real sticker inside the box, and the active corner point.
  const frame = () => {
    const { w, h, corner } = geo.current;
    const x0 = ins.left;
    const y0 = ins.top;
    const x1 = w - ins.right;
    const y1 = h - ins.bottom;
    const [sx, sy] = SIGNS[corner];
    const cx = sx > 0 ? x1 : x0;
    const cy = sy > 0 ? y1 : y0;
    return { x0, y0, x1, y1, sx, sy, cx, cy, corner };
  };

  const bodyClip = useTransform(depth, (v) => {
    const d = Math.max(0, v);
    if (d < 0.5) return 'none';
    const { w, h } = geo.current;
    const { sx, sy, cx, cy } = frame();
    const k = sx * cx + sy * cy - d;
    const box = [[-MARGIN, -MARGIN], [w + MARGIN, -MARGIN], [w + MARGIN, h + MARGIN], [-MARGIN, h + MARGIN]];
    return polygon(clipHalfPlane(box, sx, sy, k));
  });

  // Mirror across the fold line sx·x + sy·y = k (transform-origin 0 0).
  const flapTransform = useTransform(depth, (v) => {
    const d = Math.max(0, v);
    const { sx, sy, cx, cy } = frame();
    const k = sx * cx + sy * cy - d;
    const c = -sx * sy;
    return `matrix(0, ${c}, ${c}, 0, ${k * sx}, ${k * sy})`;
  });

  // The flap face sits on the sticker rect; only the corner triangle shows.
  const flapClip = useTransform(depth, (v) => {
    const d = Math.max(0, v);
    const { x0, y0, sx, sy, cx, cy } = frame();
    const lx = cx - x0;
    const ly = cy - y0;
    return polygon([[lx, ly], [lx - sx * d, ly], [lx, ly - sy * d]]);
  });

  // Crease shading: darker along the fold, a soft highlight toward the tip.
  const flapShade = useTransform(depth, (v) => {
    const d = Math.max(0, v);
    const f = d / Math.SQRT2; // distance from the tip to the fold
    const { corner } = frame();
    return `linear-gradient(${ANGLES[corner]}deg,
      rgba(0, 0, 0, 0.22) calc(100% - ${f}px),
      rgba(0, 0, 0, 0.06) calc(100% - ${f * 0.55}px),
      rgba(255, 255, 255, 0.35) calc(100% - ${f * 0.2}px),
      rgba(0, 0, 0, 0.03) 100%)`;
  });

  const flapOpacity = useTransform(depth, (v) => (v < 0.5 ? 0 : 1));

  const nearestCorner = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    let best = corners[0];
    let bestDist = Infinity;
    corners.forEach((c) => {
      const [sx, sy] = SIGNS[c];
      const dist = Math.hypot(px - (sx > 0 ? 1 : 0), py - (sy > 0 ? 1 : 0));
      if (dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    });
    // Closer to the corner peels further: 55% at the far side, 100% on it.
    const closeness = Math.max(0, 1 - bestDist / Math.SQRT2);
    return { corner: best, amount: size * (0.55 + 0.45 * closeness) };
  };

  // Retract before switching corners, then lift the new one.
  useMotionValueEvent(depth, 'change', (v) => {
    if (pending.current && v < 1) {
      geo.current.corner = pending.current;
      pending.current = null;
      depth.set(target.current);
    }
  });

  const aim = (e, entering) => {
    if (e.pointerType === 'touch') return;
    const el = wrapRef.current;
    if (entering) {
      geo.current.w = el.offsetWidth;
      geo.current.h = el.offsetHeight;
    }
    const { corner, amount } = nearestCorner(e);
    target.current = amount;
    if (entering || depth.get() < 1) {
      geo.current.corner = corner;
      pending.current = null;
      depth.set(amount);
    } else if (corner !== geo.current.corner) {
      pending.current = corner;
      depth.set(0);
    } else if (!pending.current) {
      depth.set(amount);
    }
  };

  const release = () => {
    pending.current = null;
    depth.set(0);
  };

  if (reduceMotion) return children;

  const maskStyle = mask
    ? {
        WebkitMaskImage: `url(${mask.src})`,
        maskImage: `url(${mask.src})`,
        WebkitMaskSize: mask.size ?? '100% 100%',
        maskSize: mask.size ?? '100% 100%',
        WebkitMaskPosition: `${(mask.x ?? 0) - ins.left}px ${(mask.y ?? 0) - ins.top}px`,
        maskPosition: `${(mask.x ?? 0) - ins.left}px ${(mask.y ?? 0) - ins.top}px`,
      }
    : {};

  return (
    <div
      ref={wrapRef}
      className="peel"
      onPointerEnter={(e) => aim(e, true)}
      onPointerMove={(e) => aim(e, false)}
      onPointerLeave={release}
    >
      <motion.div
        className="peel-body"
        style={{ clipPath: bodyClip }}
      >
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
