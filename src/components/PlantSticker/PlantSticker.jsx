import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import discoveries from '../../data/discoveries';
import './PlantSticker.css';

// Art comes from one sticker sheet (public/plant/*.png), so every piece
// shares a scale. All positions below are in base.png pixels.
//
// The plant box adds room around base.png: on top for the flower, on the
// sides for leaves that reach past the pot.
const BASE = { w: 256, h: 661 };
const PAD = { top: 120, side: 34 };
const BOX = { w: BASE.w + PAD.side * 2, h: BASE.h + PAD.top };
const SCALE = 0.34; // rendered px per base.png px

// Bud centers on base.png's stem, bottom to top (alternating sides). Each
// one is a discovery, in the order of data/discoveries.js.
const NODES = [
  { x: 154, y: 397, side: 1 },
  { x: 105, y: 335, side: -1 },
  { x: 152, y: 277, side: 1 },
  { x: 104, y: 213, side: -1 },
  { x: 150, y: 157, side: 1 },
  { x: 105, y: 90, side: -1 },
];

// Leaf art, with (ax, ay) = the tip of the leaf's own stem, which is where it
// attaches to the bud and grows from. Larger leaves go lower on the plant.
const LEAVES = {
  left: [
    { src: '/plant/leaf-left-b.png', w: 228, h: 140, ax: 225, ay: 111 },
    { src: '/plant/leaf-left-a.png', w: 197, h: 113, ax: 194, ay: 84 },
  ],
  right: [
    { src: '/plant/leaf-right-b.png', w: 243, h: 146, ax: 2, ay: 113 },
    { src: '/plant/leaf-right-a.png', w: 200, h: 114, ax: 2, ay: 83 },
  ],
};
const leafFor = (i) => {
  const set = NODES[i].side < 0 ? LEAVES.left : LEAVES.right;
  return set[i < 3 ? 0 : 1];
};
const leafScale = (i) => 0.5 - i * 0.015; // lower leaves a touch bigger
// Attach a little in from the bud center (toward the main stem) so the
// leaf's own stem covers the bud instead of leaving it peeking out.
const LEAF_TUCK = 12;

// Flower stages, anchored at the bottom of their stem, which sits on the
// stem just under the top bud of base.png.
const FLOWER_AT = { x: 124, y: 64 };
const FLOWER = [
  { src: '/plant/flower-bud.png', w: 124, h: 208, ax: 59, ay: 205, scale: 0.42 },
  { src: '/plant/flower-half.png', w: 186, h: 231, ax: 82, ay: 228, scale: 0.5 },
  { src: '/plant/flower-full.png', w: 292, h: 261, ax: 129, ay: 258, scale: 0.6 },
];
const BLOOM_STEP_MS = 420;

// Place an image so its anchor lands on (x, y) in base.png px.
const placeAt = (art, x, y, scale) => ({
  left: (PAD.side + x - art.ax * scale) * SCALE,
  top: (PAD.top + y - art.ay * scale) * SCALE,
  width: art.w * scale * SCALE,
  height: art.h * scale * SCALE,
  transformOrigin: `${(art.ax / art.w) * 100}% ${(art.ay / art.h) * 100}%`,
});
const pct = (x, y) => ({
  left: `${((PAD.side + x) / BOX.w) * 100}%`,
  top: `${((PAD.top + y) / BOX.h) * 100}%`,
});

const spring = { type: 'spring', stiffness: 170, damping: 13 };

/**
 * PlantSticker — a little potted plant that grows as visitors explore.
 * Each bud on the stem stands for one discovery (see data/discoveries.js):
 * hovering it shows a hint, and finding it grows a leaf there. When every
 * leaf has grown, the top bud opens into a flower.
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
  // Flower stage: -1 none, 0 bud, 1 half-open, 2 full. Already bloomed on
  // load? Show it open; blooming live plays the stages in order.
  const [stage, setStage] = useState(bloomed ? 2 : -1);
  const t = (transition) => (reduceMotion ? { duration: 0 } : transition);

  // A happy little wiggle whenever a new leaf grows, so it catches the eye
  // even if the visitor wasn't looking at the plant.
  useEffect(() => {
    if (found.length > prevCount.current && !reduceMotion && scope.current) {
      animate(scope.current, { rotate: [0, -6, 5, -3, 1, 0] }, { duration: 0.8, ease: 'easeInOut' });
    }
    prevCount.current = found.length;
  }, [found.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bloomed) {
      setStage(-1);
      return undefined;
    }
    if (stage === 2) return undefined;
    if (reduceMotion) {
      setStage(2);
      return undefined;
    }
    // Let the last leaf finish growing, then bud -> half -> full.
    const timers = [0, 1, 2].map((s) => setTimeout(() => setStage(s), 500 + s * BLOOM_STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [bloomed]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="plant" ref={scope} style={{ width: BOX.w * SCALE, height: BOX.h * SCALE }}>
        <img
          className="plant-piece"
          src="/plant/base.png"
          alt=""
          draggable="false"
          style={{ left: PAD.side * SCALE, top: PAD.top * SCALE, width: BASE.w * SCALE, height: BASE.h * SCALE }}
        />

        {/* Leaves — each grows from its bud once found */}
        {NODES.map((n, i) => {
          const art = leafFor(i);
          const isFound = found.includes(discoveries[i].id);
          return (
            <motion.img
              key={discoveries[i].id}
              className="plant-piece"
              src={art.src}
              alt=""
              draggable="false"
              style={placeAt(art, n.x - n.side * LEAF_TUCK, n.y + 4, leafScale(i))}
              initial={false}
              animate={{ scale: isFound ? 1 : 0, rotate: isFound ? 0 : 40 * n.side }}
              transition={t(spring)}
            />
          );
        })}

        {/* Flower opens over the top bud of base.png, covering it. */}
        <AnimatePresence>
          {stage >= 0 && (
            <motion.img
              key={stage}
              className="plant-piece"
              src={FLOWER[stage].src}
              alt=""
              draggable="false"
              style={placeAt(FLOWER[stage], FLOWER_AT.x, FLOWER_AT.y, FLOWER[stage].scale)}
              initial={reduceMotion ? false : { scale: stage === 0 ? 0 : 0.85, opacity: stage === 0 ? 1 : 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              transition={t(spring)}
            />
          )}
        </AnimatePresence>

        {/* Hit targets + hints. Real buttons so keyboard and screen-reader
            users can read the hints too. */}
        {NODES.map((n, i) => {
          const item = discoveries[i];
          const isFound = found.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`plant-node${activeNode === i ? ' is-active' : ''}${isFound ? ' is-found' : ''}`}
              style={pct(n.x, n.y)}
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
            style={{ top: pct(tipNode.x, tipNode.y).top }}
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
