import { useEffect, useRef, useState } from 'react';
import { useReducedMotion, useSpring } from 'framer-motion';
import StickyNote from './components/StickyNote/StickyNote';
import RecordPlayer from './components/RecordPlayer/RecordPlayer';
import RecordCrate, { Record } from './components/RecordCrate/RecordCrate';
import BookStack from './components/BookStack/BookStack';
import BookCovers from './components/BookCovers/BookCovers';
import FaceSticker from './components/FaceSticker/FaceSticker';
import XLink from './components/XLink/XLink';
import PlantSticker from './components/PlantSticker/PlantSticker';
import ExpandedOverlay from './components/ExpandedOverlay/ExpandedOverlay';
import { useTrackPreview } from './hooks/useTrackPreview';
import songs from './data/songs';
import discoveries from './data/discoveries';
import { getMood } from './data/reactions';
import './App.css';

const NOTES = [
  { id: 'n1', variant: 'yellow', small: false, x: '8.7%', y: '24.3%', rotate: -2, defaultText: 'Hello, welcome to my sticker board :)' },
];

// Plant progress is a per-visitor nicety, so it lives in localStorage. Any
// failure (private mode, blocked storage) just means a fresh plant.
// Add ?resetplant to the URL to start over.
const PLANT_KEY = 'sticker-board:plant';
const loadFound = () => {
  try {
    if (new URLSearchParams(window.location.search).has('resetplant')) {
      localStorage.removeItem(PLANT_KEY);
      return [];
    }
    const saved = JSON.parse(localStorage.getItem(PLANT_KEY) ?? '[]');
    const ids = discoveries.map((d) => d.id);
    return Array.isArray(saved) ? saved.filter((id) => ids.includes(id)) : [];
  } catch {
    return [];
  }
};

// Stickers are sized for a reference board (Tyler's: 1528×766). On other
// screens they scale with the board so the arrangement keeps its
// proportions: by whichever side is tighter, floored so text stays
// readable and capped so huge screens don't get cartoonish.
const REF_BOARD = { w: 1528, h: 766 };
const SCALE_MIN = 0.75;
const SCALE_MAX = 1.3;
const boardScaleFor = (w, h) =>
  Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.min(w / REF_BOARD.w, h / REF_BOARD.h)));

export default function App() {
  const padRef = useRef(null);
  const [boardScale, setBoardScale] = useState(1);

  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return undefined;
    const update = () => setBoardScale(boardScaleFor(pad.clientWidth, pad.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(pad);
    return () => ro.disconnect();
  }, []);
  const platterRef = useRef(null);
  const crateRef = useRef(null);
  const playerRef = useRef(null);
  const [booksOpen, setBooksOpen] = useState(false);

  const [currentMood, setCurrentMood] = useState('neutral');

  // Plant: each discovery grows a leaf; all of them make it bloom.
  const [found, setFound] = useState(loadFound);
  const discover = (id) => {
    setFound((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(PLANT_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the leaf still grows for this visit.
      }
      return next;
    });
  };

  // Start the plant over (from the flower's "Start over?" bubble).
  const resetPlant = () => {
    setFound([]);
    try {
      localStorage.removeItem(PLANT_KEY);
    } catch {
      // Storage unavailable: it's reset for this visit.
    }
  };

  const handleNoteTextChange = (id, text) => {
    if (id !== 'n1') return;
    const mood = getMood(text);
    setCurrentMood(mood);
    if (mood !== 'neutral') discover(mood); // 'happy' | 'sad' | 'secret'
  };

  // Track bin and player positions
  const binPosition = useRef(null);
  const playerPosition = useRef(null);
  const [binZIndex, setBinZIndex] = useState(2);
  const [playerIsHovering, setPlayerIsHovering] = useState(false);
  const [playerIsDragging, setPlayerIsDragging] = useState(false);

  // Spring that records mirror when the crate is hovered/dragged
  const binScaleMotion = useSpring(1, { stiffness: 320, damping: 26 });

  // Crate fan: 0 = records resting in the crate, 1 = fanned out above it.
  // The crate and every in-crate record form one hover zone, with a short
  // grace period so moving the cursor between them doesn't collapse the fan.
  const reduceMotion = useReducedMotion();
  const binSpread = useSpring(0, { stiffness: 260, damping: 22 });
  const crateHovered = useRef(false);
  const fanHovered = useRef(new Set());
  const fanCloseTimer = useRef(null);
  const crateDragging = useRef(false);
  const [inBinIds, setInBinIds] = useState(() => songs.map((s) => s.id));

  const updateFan = () => {
    // Folded away while the crate itself is being dragged.
    const open = !crateDragging.current && (crateHovered.current || fanHovered.current.size > 0);
    clearTimeout(fanCloseTimer.current);
    const apply = (on) => {
      if (reduceMotion) binSpread.jump(on ? 1 : 0);
      else binSpread.set(on ? 1 : 0);
      // The crate owns its scale while dragging (1.07 lift).
      if (!crateDragging.current) binScaleMotion.set(on ? 1.04 : 1);
    };
    if (open) apply(true);
    else fanCloseTimer.current = setTimeout(() => apply(false), 140);
  };

  const handleBinHoverChange = (hovering) => {
    crateHovered.current = hovering;
    updateFan();
  };

  const handleBinDragChange = (dragging) => {
    crateDragging.current = dragging;
    if (dragging) {
      clearTimeout(fanCloseTimer.current);
      binSpread.set(0);
    } else {
      updateFan();
    }
  };

  const handleFanHover = (id, hovering) => {
    if (hovering) fanHovered.current.add(id);
    else fanHovered.current.delete(id);
    updateFan();
  };

  const handleBinStateChange = (id, inBin) => {
    setInBinIds((ids) => {
      const has = ids.includes(id);
      if (inBin === has) return ids;
      // Keep crate order stable (song order), so the fan never reshuffles.
      const next = inBin ? [...ids, id] : ids.filter((x) => x !== id);
      return songs.map((s) => s.id).filter((x) => next.includes(x));
    });
  };

  // Calculate player scale based on state
  const playerScale = playerIsDragging ? 1.07 : playerIsHovering ? 1.04 : 1;

  // Music state
  const { play, stop } = useTrackPreview();
  const [dockedId, setDockedId] = useState(null);
  const recordApis = useRef({});
  const recordMotionValues = useRef({});

  const dockedSong = songs.find((s) => s.id === dockedId) || null;

  // Shared "bring to front" counter
  const topZ = useRef(20);
  const bringToFront = () => {
    topZ.current += 1;
    return topZ.current;
  };

  // Special bring to front for bin - also updates state so records/lip follow
  const bringBinToFront = () => {
    const newZ = bringToFront();
    setBinZIndex(newZ);
    return newZ;
  };

  const delay = (i) => 0.15 + i * 0.09;

  // Record management
  const register = (id, api) => {
    recordApis.current[id] = api;
    return () => { delete recordApis.current[id]; };
  };

  const registerRecordMotion = (id, x, y, elementRef) => {
    recordMotionValues.current[id] = { x, y, elementRef };
  };

  const dockRecord = (song) => {
    if (dockedId && dockedId !== song.id) {
      recordApis.current[dockedId]?.goHome();
    }
    setDockedId(song.id);
    play(song);
    discover('record');
  };

  const releaseDock = (songId) => {
    if (dockedId === songId) {
      setDockedId(null);
      stop();
    }
  };

  const isOverPlatter = (recordEl) => {
    const platter = platterRef.current;
    if (!platter || !recordEl) return false;
    const p = platter.getBoundingClientRect();
    const r = recordEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const slack = 36;
    return cx > p.left - slack && cx < p.right + slack && cy > p.top - slack && cy < p.bottom + slack;
  };

  const isOverCrate = (recordEl) => {
    const crate = crateRef.current;
    if (!crate || !recordEl) return false;
    const c = crate.getBoundingClientRect();
    const r = recordEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const slack = 20;
    return cx > c.left - slack && cx < c.right + slack && cy > c.top - slack && cy < c.bottom + slack;
  };

  // Position getters for records
  const getBinPosition = () => binPosition.current;
  const getPlayerPosition = () => playerPosition.current;

  // Position updaters
  const handleBinMove = (pos) => {
    binPosition.current = pos;
  };

  const handlePlayerMove = (pos) => {
    playerPosition.current = pos;
  };


  // State updaters for player hover/drag
  const handlePlayerHoverChange = (isHovering) => {
    setPlayerIsHovering(isHovering);
  };

  const handlePlayerDragChange = (isDragging) => {
    setPlayerIsDragging(isDragging);
  };

  return (
    <main className="wall">
      <div className="pad" ref={padRef} style={{ '--board-scale': boardScale }}>
        <span className="pad-screw pad-screw--left" aria-hidden="true" />
        <span className="pad-screw pad-screw--right" aria-hidden="true" />

        <div className="pad-intro">
          <h1>The Sticker Board</h1>
        </div>

        <RecordPlayer
          x="89.8%"
          y="81.9%"
          rotate={0}
          z={1}
          enterDelay={delay(0)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
          dockedSong={dockedSong}
          platterRef={platterRef}
          playerRef={playerRef}
          onPlayerMove={handlePlayerMove}
          onPlayerHoverChange={handlePlayerHoverChange}
          onPlayerDragChange={handlePlayerDragChange}
        />

        <RecordCrate
          x="74.9%"
          y="84.2%"
          rotate={0}
          z={2}
          enterDelay={delay(0)}
          bringToFront={bringBinToFront}
          constraintsRef={padRef}
          crateRef={crateRef}
          onBinMove={handleBinMove}
          onBinHoverChange={handleBinHoverChange}
          onBinDragChange={handleBinDragChange}
          binScaleMotion={binScaleMotion}
        />

        {/* Records render at pad level */}
        {songs.map((song, i) => (
          <Record
            key={song.id}
            song={song}
            slot={i}
            docked={dockedId === song.id}
            constraintsRef={padRef}
            bringToFront={bringToFront}
            isOverPlatter={isOverPlatter}
            isOverCrate={isOverCrate}
            onDock={dockRecord}
            onRelease={releaseDock}
            register={register}
            registerMotion={registerRecordMotion}
            platterRef={platterRef}
            getBinPosition={getBinPosition}
            binZIndex={binZIndex}
            binScaleMotion={binScaleMotion}
            binSpread={binSpread}
            boardScale={boardScale}
            fanIndex={inBinIds.indexOf(song.id)}
            fanCount={inBinIds.length}
            onFanHover={handleFanHover}
            onBinStateChange={handleBinStateChange}
            playerScale={playerScale}
          />
        ))}

        <BookStack
          x="18.9%"
          y="74.4%"
          rotate={3}
          enterDelay={delay(1)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
          onExpand={() => {
            setBooksOpen(true);
            discover('books');
          }}
        />

        {NOTES.map((note, i) => (
          <StickyNote
            key={note.id}
            id={note.id}
            variant={note.variant}
            small={note.small}
            defaultText={note.defaultText}
            x={note.x}
            y={note.y}
            rotate={note.rotate}
            enterDelay={delay(2) + i * 0.06}
            bringToFront={bringToFront}
            constraintsRef={padRef}
            onTextChange={handleNoteTextChange}
          />
        ))}

        <FaceSticker
          x="44.0%"
          y="40.0%"
          rotate={-2}
          enterDelay={delay(3)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
          mood={currentMood}
        />

        <XLink
          x="87.7%"
          y="16.1%"
          rotate={5}
          enterDelay={delay(4)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
          onOpen={() => discover('x')}
        />

        <PlantSticker
          x="70.6%"
          y="32.6%"
          rotate={-3}
          enterDelay={delay(5)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
          found={found}
          onReset={resetPlant}
        />

        <p className="pad-hint">drag · click · edit · play</p>
      </div>

      <ExpandedOverlay open={booksOpen} onClose={() => setBooksOpen(false)}>
        <BookCovers />
      </ExpandedOverlay>
    </main>
  );
}
