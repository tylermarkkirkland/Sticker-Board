import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import discoveries from '../../data/discoveries';
import './PlantSticker.css';

// Art comes from one sticker sheet (public/plant/*.png), so every piece
// shares a scale. All positions below are in base.png pixels (the original
// cut, before padding).
//
// Each piece comes as a pair: NAME.png (art + its dark outline) and
// NAME-border.png (a smooth cream die-cut border, pre-rendered ~4px on
// screen). All borders are drawn in one layer underneath all art, so where
// a leaf meets the stem each border tucks under the other's art and the
// outline merges into one clean die-cut shape. Both images in a pair share
// the same padded canvas (PADS), so they always line up.
const PADS = {
  base: 14, bud: 14, 'leaf-left-b': 27, 'leaf-left-a': 29, 'leaf-right-b': 27, 'leaf-right-a': 29,
  'flower-bud': 31, 'flower-half': 26, 'flower-full': 22,
};

// The plant box adds room around base.png: on top for the flower, on the
// sides for leaves (and their borders) that reach past the pot.
const BASE = { w: 256, h: 661 };
const PAD = { top: 130, side: 44 };
const BOX = { w: BASE.w + PAD.side * 2, h: BASE.h + PAD.top + 16 };
const SCALE = 0.34; // rendered px per base.png px

// Bud centers along the stem, bottom to top (alternating sides). Each one
// is a discovery, in the order of data/discoveries.js. The buds were cut out
// of base.png into bud-N.png (box = where that piece sat on base.png), so
// the bare stem can sprout a leaf in the bud's place.
const NODES = [
  { x: 154, y: 397, side: 1, bud: { x: 134, y: 381, w: 36, h: 41 } },
  { x: 105, y: 335, side: -1, bud: { x: 91, y: 319, w: 33, h: 41 } },
  { x: 152, y: 277, side: 1, bud: { x: 132, y: 261, w: 34, h: 41 } },
  { x: 104, y: 213, side: -1, bud: { x: 90, y: 197, w: 32, h: 41 } },
  { x: 150, y: 157, side: 1, bud: { x: 131, y: 141, w: 33, h: 41 } },
  { x: 105, y: 90, side: -1, bud: { x: 91, y: 79, w: 30, h: 36 } },
];
// Stem center line on base.png, measured from its edges (it leans very
// slightly to the right).
const stemX = (y) => 125.5 + ((y - 30) * 3) / 410;

// Leaf art (unpadded size), with (ax, ay) = the tip of the leaf's own stem,
// where it attaches and grows from. Larger leaves go lower on the plant.
const LEAVES = {
  left: [
    { name: 'leaf-left-b', w: 228, h: 140, ax: 212, ay: 110 },
    { name: 'leaf-left-a', w: 197, h: 113, ax: 182, ay: 85 },
  ],
  right: [
    { name: 'leaf-right-b', w: 243, h: 146, ax: 14, ay: 116 },
    { name: 'leaf-right-a', w: 200, h: 114, ax: 14, ay: 85 },
  ],
};
const leafFor = (i) => {
  const set = NODES[i].side < 0 ? LEAVES.left : LEAVES.right;
  return set[i < 3 ? 0 : 1];
};
const leafScale = (i) => 0.5 - i * 0.015; // lower leaves a touch bigger
// Where a leaf's stem tip joins the main stem: just past the stem's center
// line, on the little nub where the bud's own stalk joined (~13px below).
const leafRoot = (n) => ({ x: stemX(n.y) + n.side * 2, y: n.y + 13 });

// Flower stages, anchored at the bottom of their stem, which sits on the
// stem just under the top bud of base.png.
const FLOWER_AT = { x: 124, y: 64 };
const FLOWER = [
  { name: 'flower-bud', w: 124, h: 208, ax: 62, ay: 194, scale: 0.42 },
  { name: 'flower-half', w: 186, h: 231, ax: 81, ay: 217, scale: 0.5 },
  { name: 'flower-full', w: 292, h: 261, ax: 135, ay: 248, scale: 0.6 },
];
const BLOOM_STEP_MS = 420;

const src = (name, layer) => `/plant/${name}${layer === 'border' ? '-border' : ''}.png`;

// Place a padded piece so its anchor (in unpadded px) lands on (x, y).
const placeAt = (art, x, y, scale) => {
  const pad = PADS[art.name];
  const w = art.w + pad * 2;
  const h = art.h + pad * 2;
  const ax = art.ax + pad;
  const ay = art.ay + pad;
  return {
    left: (PAD.side + x - ax * scale) * SCALE,
    top: (PAD.top + y - ay * scale) * SCALE,
    width: w * scale * SCALE,
    height: h * scale * SCALE,
    transformOrigin: `${(ax / w) * 100}% ${(ay / h) * 100}%`,
  };
};
// Place a padded piece that sat at (x, y) on base.png at full scale.
const placeBox = (x, y, w, h, pad) => ({
  left: (PAD.side + x - pad) * SCALE,
  top: (PAD.top + y - pad) * SCALE,
  width: (w + pad * 2) * SCALE,
  height: (h + pad * 2) * SCALE,
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

  // Every piece of the plant for one layer ('border' or 'art'). Both layers
  // get identical motion props, so a leaf and its border grow as one.
  const renderPieces = (layer) => (
    <>
      <img
        className="plant-piece"
        src={src('base', layer)}
        alt=""
        draggable="false"
        style={placeBox(0, 0, BASE.w, BASE.h, PADS.base)}
      />

      {/* Buds — shrink back into the stem as their leaf grows */}
      {NODES.map((n, i) => {
        const isFound = found.includes(discoveries[i].id);
        return (
          <motion.img
            key={`bud-${discoveries[i].id}`}
            className="plant-piece"
            src={src(`bud-${i + 1}`, layer)}
            alt=""
            draggable="false"
            style={{
              ...placeBox(n.bud.x, n.bud.y, n.bud.w, n.bud.h, PADS.bud),
              transformOrigin: n.side > 0 ? '20% 65%' : '80% 65%', // stem side
            }}
            initial={false}
            animate={{ scale: isFound ? 0 : 1, opacity: isFound ? 0 : 1 }}
            transition={t({ duration: 0.25 })}
          />
        );
      })}

      {/* Leaves — each grows from the stem where its bud was, once found */}
      {NODES.map((n, i) => {
        const art = leafFor(i);
        const isFound = found.includes(discoveries[i].id);
        return (
          <motion.img
            key={discoveries[i].id}
            className="plant-piece"
            src={src(art.name, layer)}
            alt=""
            draggable="false"
            style={placeAt(art, leafRoot(n).x, leafRoot(n).y, leafScale(i))}
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
            src={src(FLOWER[stage].name, layer)}
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
    </>
  );

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
        {/* Borders first, art on top: see PADS above. */}
        <div className="plant-layer">{renderPieces('border')}</div>
        <div className="plant-layer">{renderPieces('art')}</div>

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
