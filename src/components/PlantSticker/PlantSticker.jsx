import { useEffect, useRef, useState } from 'react';
import { motion, useAnimate, useReducedMotion } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import discoveries from '../../data/discoveries';
import './PlantSticker.css';

// SVG is drawn on a 130×200 grid. Nodes sit exactly on the stem curve
// (sampled from STEM below), alternating sides from the bottom up.
const VIEW_W = 130;
const VIEW_H = 200;
const SCALE = 1.15; // rendered size relative to the drawing grid
const STEM = 'M65 144 C 60 124, 70 108, 65 92 S 60 60, 65 34';
const NODES = [
  { x: 63.6, y: 130, side: -1, size: 1.0, angle: -24 },
  { x: 65.4, y: 114, side: 1, size: 0.96, angle: -26 },
  { x: 66.2, y: 98, side: -1, size: 0.9, angle: -28 },
  { x: 62.6, y: 82, side: 1, size: 0.84, angle: -30 },
  { x: 61.3, y: 66, side: -1, size: 0.78, angle: -32 },
  { x: 62.4, y: 50, side: 1, size: 0.7, angle: -34 },
];
const FLOWER = { x: 65, y: 30 };
const PETALS = 6;

// Leaf drawn pointing right from (0,0), symmetric about y = 0 so its
// fill-box left-middle is exactly the node — that's where it grows from.
const LEAF = 'M0 0 C 7 -10, 21 -11, 30 0 C 21 11, 7 10, 0 0 Z';

const spring = { type: 'spring', stiffness: 170, damping: 13 };

/**
 * PlantSticker — a little potted plant that grows as visitors explore.
 * Each node on the stem stands for one discovery (see data/discoveries.js):
 * hovering it shows a hint, and finding it grows a leaf there. When every
 * leaf has grown, a flower blooms at the top.
 *
 * Props:
 *  - found   array of discovery ids that have been found
 *  - (plus the usual Sticker placement props)
 */
export default function PlantSticker({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef, found = [] }) {
  const reduceMotion = useReducedMotion();
  const [activeNode, setActiveNode] = useState(null);
  const [scope, animate] = useAnimate();
  const prevCount = useRef(found.length);
  const bloomed = found.length >= discoveries.length;
  const t = (transition) => (reduceMotion ? { duration: 0 } : transition);

  // A happy little wiggle whenever a new leaf grows, so it catches the eye
  // even if the visitor wasn't looking at the plant.
  useEffect(() => {
    if (found.length > prevCount.current && !reduceMotion && scope.current) {
      animate(scope.current, { rotate: [0, -6, 5, -3, 1, 0] }, { duration: 0.8, ease: 'easeInOut' });
    }
    prevCount.current = found.length;
  }, [found.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeItem = activeNode !== null ? discoveries[activeNode] : null;
  const activeFound = activeItem && found.includes(activeItem.id);
  const tipNode = activeNode !== null ? NODES[activeNode] : null;

  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="plant-shell"
      label={`Little plant: ${found.length} of ${discoveries.length} leaves grown${bloomed ? ', in full bloom' : ''}`}
    >
      <div className="plant" ref={scope}>
        <svg
          className="plant-art"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width={VIEW_W * SCALE}
          height={VIEW_H * SCALE}
          aria-hidden="true"
        >
          <defs>
            {/* Die-cut border: grow the whole silhouette and fill it cream,
                so growing leaves and the flower get the border for free. */}
            <filter id="plant-diecut" x="-20%" y="-20%" width="140%" height="140%">
              <feMorphology in="SourceAlpha" operator="dilate" radius="3.5" result="grown" />
              <feFlood floodColor="#f4f1ea" />
              <feComposite in2="grown" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="plant-pot" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#d9794a" />
              <stop offset="0.55" stopColor="#c4643a" />
              <stop offset="1" stopColor="#9c4a2a" />
            </linearGradient>
            <linearGradient id="plant-leaf" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#8fcf6a" />
              <stop offset="1" stopColor="#4c9a3f" />
            </linearGradient>
          </defs>

          <g filter="url(#plant-diecut)">
            {/* Stem */}
            <path d={STEM} fill="none" stroke="#4f8a3c" strokeWidth="4" strokeLinecap="round" />

            {/* Leaves — each grows from its node once found */}
            {NODES.map((n, i) => {
              const isFound = found.includes(discoveries[i].id);
              return (
                <g
                  key={discoveries[i].id}
                  transform={`translate(${n.x} ${n.y}) scale(${n.side * n.size} ${n.size}) rotate(${n.angle})`}
                >
                  <motion.g
                    initial={false}
                    animate={{ scale: isFound ? 1 : 0, rotate: isFound ? 0 : -40 }}
                    transition={t(spring)}
                    style={{ originX: 0, originY: 0.5 }}
                  >
                    <path d={LEAF} fill="url(#plant-leaf)" />
                    <path d="M2 0 Q 15 -1.5, 26 0" fill="none" stroke="#3f7f33" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
                  </motion.g>
                </g>
              );
            })}

            {/* Top: a closed bud that opens into a flower on full bloom */}
            <g transform={`translate(${FLOWER.x} ${FLOWER.y})`}>
              <motion.path
                d="M0 6 C -6 2, -5 -6, 0 -10 C 5 -6, 6 2, 0 6 Z"
                fill="#6fae4f"
                initial={false}
                animate={{ scale: bloomed ? 0 : 1, opacity: bloomed ? 0 : 1 }}
                transition={t({ duration: 0.25 })}
              />
              {Array.from({ length: PETALS }, (_, i) => (
                <g key={i} transform={`rotate(${(360 / PETALS) * i})`}>
                  <motion.ellipse
                    cx="0"
                    cy="-9"
                    rx="5.6"
                    ry="9"
                    fill={i % 2 ? '#ff8f80' : '#ff7a6b'}
                    initial={false}
                    animate={{ scale: bloomed ? 1 : 0 }}
                    transition={t({ ...spring, delay: bloomed ? 0.15 + i * 0.07 : 0 })}
                    style={{ originX: 0.5, originY: 1 }}
                  />
                </g>
              ))}
              <motion.circle
                r="5"
                fill="#ffd35c"
                stroke="#e8a93a"
                strokeWidth="1.2"
                initial={false}
                animate={{ scale: bloomed ? 1 : 0 }}
                transition={t({ ...spring, delay: bloomed ? 0.6 : 0 })}
              />
            </g>

            {/* Pot */}
            <path d="M36 154 L94 154 L87.5 193 Q86.8 197 83 197 L47 197 Q43.2 197 42.5 193 Z" fill="url(#plant-pot)" />
            <rect x="29" y="140" width="72" height="16" rx="4" fill="#d47447" />
            <rect x="29" y="152" width="72" height="4" fill="#000" opacity="0.12" />
            <ellipse cx="65" cy="143.5" rx="30" ry="3.8" fill="#3e2a1e" />
          </g>

          {/* Node buds sit above the die-cut so they stay crisp. Hidden once
              their leaf has grown over them. */}
          {NODES.map((n, i) => {
            const isFound = found.includes(discoveries[i].id);
            return (
              <motion.circle
                key={discoveries[i].id}
                className={`plant-bud${activeNode === i ? ' is-active' : ''}`}
                cx={n.x}
                cy={n.y}
                r="3.6"
                initial={false}
                animate={{ scale: isFound ? 0 : 1 }}
                transition={t({ duration: 0.2 })}
              />
            );
          })}
        </svg>

        {/* Hit targets + hints. Real buttons so keyboard and screen-reader
            users can read the hints too. */}
        {NODES.map((n, i) => {
          const item = discoveries[i];
          const isFound = found.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className="plant-node"
              style={{ left: `${(n.x / VIEW_W) * 100}%`, top: `${(n.y / VIEW_H) * 100}%` }}
              aria-label={isFound ? `Leaf grown: ${item.done}` : `Hint: ${item.hint}`}
              onPointerEnter={() => setActiveNode(i)}
              onPointerLeave={() => setActiveNode((cur) => (cur === i ? null : cur))}
              onFocus={() => setActiveNode(i)}
              onBlur={() => setActiveNode((cur) => (cur === i ? null : cur))}
              onClick={() => setActiveNode(i)}
            />
          );
        })}

        {activeItem && tipNode && (
          <motion.div
            key={activeNode}
            className={`plant-tip plant-tip--${tipNode.side < 0 ? 'left' : 'right'}${activeFound ? ' is-found' : ''}`}
            style={{ top: `${(tipNode.y / VIEW_H) * 100}%` }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={t({ duration: 0.15 })}
            role="tooltip"
          >
            {activeFound ? activeItem.done : activeItem.hint}
          </motion.div>
        )}

        {bloomed && (
          <span className="plant-bloom-label" aria-live="polite">
            In full bloom
          </span>
        )}
      </div>
    </Sticker>
  );
}
