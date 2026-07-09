import { useRef, useState } from 'react';
import { useSpring } from 'framer-motion';
import StickyNote from './components/StickyNote/StickyNote';
import RecordPlayer from './components/RecordPlayer/RecordPlayer';
import RecordCrate, { Record } from './components/RecordCrate/RecordCrate';
import BookStack from './components/BookStack/BookStack';
import BookCovers from './components/BookCovers/BookCovers';
import FaceSticker from './components/FaceSticker/FaceSticker';
import XLink from './components/XLink/XLink';
import ExpandedOverlay from './components/ExpandedOverlay/ExpandedOverlay';
import { useTrackPreview } from './hooks/useTrackPreview';
import songs from './data/songs';
import { getMood } from './data/reactions';
import './App.css';

const NOTES = [
  { id: 'n1', variant: 'yellow', small: false, x: '3.3%', y: '13.7%', rotate: -2, defaultText: 'Hello, welcome to my sticker board :)' },
];

export default function App() {
  const padRef = useRef(null);
  const platterRef = useRef(null);
  const crateRef = useRef(null);
  const playerRef = useRef(null);
  const [booksOpen, setBooksOpen] = useState(false);

  const [currentMood, setCurrentMood] = useState('neutral');

  const handleNoteTextChange = (id, text) => {
    if (id !== 'n1') return;
    setCurrentMood(getMood(text));
  };

  // Track bin and player positions
  const binPosition = useRef(null);
  const playerPosition = useRef(null);
  const [binZIndex, setBinZIndex] = useState(2);
  const [playerIsHovering, setPlayerIsHovering] = useState(false);
  const [playerIsDragging, setPlayerIsDragging] = useState(false);

  // Spring that records mirror when the crate is hovered/dragged
  const binScaleMotion = useSpring(1, { stiffness: 320, damping: 26 });

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
      <div className="pad" ref={padRef}>
        <span className="pad-screw pad-screw--left" aria-hidden="true" />
        <span className="pad-screw pad-screw--right" aria-hidden="true" />

        <div className="pad-intro">
          <h1>The Sticker Board</h1>
        </div>

        <RecordPlayer
          x="79.5%"
          y="65.1%"
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
          x="65.9%"
          y="calc(64.0% + 64px)"
          rotate={0}
          z={2}
          enterDelay={delay(0)}
          bringToFront={bringBinToFront}
          constraintsRef={padRef}
          crateRef={crateRef}
          onBinMove={handleBinMove}
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
            playerScale={playerScale}
          />
        ))}

        <BookStack
          x="13.7%"
          y="65.0%"
          rotate={3}
          enterDelay={delay(1)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
          onExpand={() => setBooksOpen(true)}
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
          x="33.9%"
          y="23.1%"
          rotate={-2}
          enterDelay={delay(3)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
          mood={currentMood}
        />

        <XLink
          x="86.0%"
          y="12.6%"
          rotate={5}
          enterDelay={delay(4)}
          bringToFront={bringToFront}
          constraintsRef={padRef}
        />

        <p className="pad-hint">drag · click · edit · play</p>
      </div>

      <ExpandedOverlay open={booksOpen} onClose={() => setBooksOpen(false)}>
        <BookCovers />
      </ExpandedOverlay>
    </main>
  );
}
