import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import Peel from '../Peel/Peel';
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

// A leaf's white border stops where it meets the stem's own border, so the
// stem keeps one clean, even strip of white and the leaf's green stalk
// crosses it to join the stem. This is the distance from the stem's center
// line to the outer edge of its border (≈6px half-width + ≈12px border,
// minus a hair of overlap so no seam shows), in base.png px.
const STEM_BORDER_REACH = 16;

// clip-path that keeps only one side of the stem's border strip, in the
// plant box's rendered px. Follows the stem's slight lean.
const sideOfStem = (side) => {
  const W = BOX.w * SCALE;
  const H = BOX.h * SCALE;
  const edge = (y) => (PAD.side + stemX(y) + side * STEM_BORDER_REACH) * SCALE;
  const yTop = -PAD.top;
  const yBot = BOX.h - PAD.top;
  const far = side < 0 ? -60 : W + 60;
  return `polygon(${edge(yTop)}px -60px, ${edge(yBot)}px ${H + 60}px, ${far}px ${H + 60}px, ${far}px -60px)`;
};

// The closed bud that tops the stem was cut out of base.png into
// top-bud.png (box = where it sat on base.png, padding included), so the
// stem ends at y = 51. On bloom it shrinks away and the flower head takes
// its place.
const STEM_TOP = 51;
const TOP_BUD = { x: 95, y: -2, w: 60, h: 60 };

// Flower stages with their own stems trimmed off just under the sepals, so
// the plant's one stem runs straight up into the flower. (ax, ay) = the
// center of the sepals' base, seated on the top of the stem.
const FLOWER_AT = { x: stemX(STEM_TOP), y: STEM_TOP + 2 };
const FLOWER = [
  { name: 'flower-bud', w: 124, h: 208, ax: 62, ay: 142, scale: 0.42 },
  { name: 'flower-half', w: 186, h: 231, ax: 83, ay: 170, scale: 0.5 },
  { name: 'flower-full', w: 292, h: 261, ax: 140, ay: 207, scale: 0.6 },
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

// Corner peel on the pot's bottom-right. The pot's sides slant, so its
// corner is ~104° rather than square: the fold starts at the outline's
// outermost point there and points 52° below horizontal (splitting the
// corner evenly). The flap takes the shape of base.png's border silhouette.
// All in rendered plant-box px.
const POT_TIP_ANGLE = (52 * Math.PI) / 180;
const PLANT_PEEL = {
  sides: [{
    x: (PAD.side + 200) * SCALE,
    y: (PAD.top + 644) * SCALE,
    nx: Math.cos(POT_TIP_ANGLE),
    ny: Math.sin(POT_TIP_ANGLE),
  }],
  size: 10,
  back: '#f4f1ea',
  mask: {
    src: '/plant/base-border.png',
    size: `${(BASE.w + PADS.base * 2) * SCALE}px auto`,
    x: (PAD.side - PADS.base) * SCALE,
    y: (PAD.top - PADS.base) * SCALE,
  },
};

/**
 * PlantSticker — a little potted plant that grows as visitors explore.
 * Each bud on the stem stands for one discovery (see data/discoveries.js):
 * hovering it shows a hint, and finding it grows a leaf there. When every
 * leaf has grown, the top bud opens into a flower.
 *
 * Once it's in full bloom, clicking the flower asks "Reset the plant?"
 * so a visitor can go through the discoveries and watch it grow again.
 *
 * Props:
 *  - found   array of discovery ids that have been found
 *  - onReset called when the visitor confirms starting over
 *  - (plus the usual Sticker placement props)
 */
export default function PlantSticker({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef, found = [], onReset }) {
  const reduceMotion = useReducedMotion();
  const [activeNode, setActiveNode] = useState(null);
  const [scope, animate] = useAnimate();
  const prevCount = useRef(found.length);
  const bloomed = found.length >= discoveries.length;
  // Flower stage: -1 none, 0 bud, 1 half-open, 2 full. Already bloomed on
  // load? Show it open; blooming live plays the stages in order.
  const [stage, setStage] = useState(bloomed ? 2 : -1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pressAt = useRef(null);
  const confirmRef = useRef(null);
  const yesRef = useRef(null);
  const flowerBtnRef = useRef(null);

  // Close the "Reset the plant?" bubble on Escape or a click anywhere else, and
  // put focus on "Yes" when it opens so keyboard users land in it.
  useEffect(() => {
    if (!confirmOpen) return undefined;
    yesRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setConfirmOpen(false);
        flowerBtnRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!confirmRef.current?.contains(e.target) && !flowerBtnRef.current?.contains(e.target)) setConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [confirmOpen]);

  // Only fully open flowers can be clicked; reset closes the bubble too.
  useEffect(() => {
    if (stage !== 2) setConfirmOpen(false);
  }, [stage]);

  const handleFlowerPointerDown = (e) => {
    pressAt.current = [e.clientX, e.clientY];
  };
  const handleFlowerClick = (e) => {
    // A click at the end of dragging the plant by its flower isn't a click.
    const [px, py] = pressAt.current ?? [e.clientX, e.clientY];
    if (Math.hypot(e.clientX - px, e.clientY - py) > 5) return;
    setConfirmOpen((open) => !open);
  };
  const confirmReset = () => {
    setConfirmOpen(false);
    onReset?.();
  };
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

      {/* The closed bud on top — gives way to the flower on bloom */}
      <motion.img
        className="plant-piece"
        src={src('top-bud', layer)}
        alt=""
        draggable="false"
        style={{ ...placeBox(TOP_BUD.x, TOP_BUD.y, TOP_BUD.w, TOP_BUD.h, 0), transformOrigin: '50% 90%' }}
        initial={false}
        animate={{ scale: stage >= 0 ? 0 : 1, opacity: stage >= 0 ? 0 : 1 }}
        transition={t({ duration: 0.2 })}
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

      {/* Leaves — each grows from the stem where its bud was, once found.
          In the border layer, each side's leaf borders are trimmed at the
          stem's border (see sideOfStem). */}
      {[-1, 1].map((side) => (
        <div
          key={side}
          className="plant-layer"
          style={layer === 'border' ? { clipPath: sideOfStem(side) } : undefined}
        >
          {NODES.map((n, i) => {
            if (n.side !== side) return null;
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
        </div>
      ))}

      {/* Flower head opens on the top of the stem, in the top bud's place. */}
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
        {/* The peel wraps the art and the bud buttons, but not the hint
            bubbles below: the fold line runs on past the pot, and the
            lower hints would otherwise be cut while the corner is lifted. */}
        <Peel {...PLANT_PEEL} fill>
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
        </Peel>

        {/* Full bloom: the flower becomes a button that offers a restart. */}
        {stage === 2 && (
          <button
            ref={flowerBtnRef}
            type="button"
            className="plant-flower-btn"
            style={placeAt(FLOWER[2], FLOWER_AT.x, FLOWER_AT.y, FLOWER[2].scale)}
            aria-label="Flower in full bloom. Reset the plant?"
            aria-haspopup="dialog"
            aria-expanded={confirmOpen}
            onPointerDown={handleFlowerPointerDown}
            onClick={handleFlowerClick}
          />
        )}

        <AnimatePresence>
          {confirmOpen && (
            <motion.div
              ref={confirmRef}
              className="plant-confirm"
              role="dialog"
              aria-label="Reset the plant"
              style={pct(FLOWER_AT.x, FLOWER_AT.y - FLOWER[2].ay * FLOWER[2].scale)}
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              transition={t({ duration: 0.16 })}
              // Pressing inside the bubble shouldn't start dragging the plant.
              onPointerDown={(e) => e.stopPropagation()}
            >
              <p className="plant-confirm-text">Reset the plant?</p>
              <div className="plant-confirm-actions">
                <button ref={yesRef} type="button" className="plant-confirm-btn plant-confirm-btn--yes" onClick={confirmReset}>
                  Yes
                </button>
                <button
                  type="button"
                  className="plant-confirm-btn"
                  onClick={() => {
                    setConfirmOpen(false);
                    flowerBtnRef.current?.focus();
                  }}
                >
                  No
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
