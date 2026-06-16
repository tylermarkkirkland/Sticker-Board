import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import songs from '../../data/songs';
import { useTrackPreview } from '../../hooks/useTrackPreview';
import './MusicCorner.css';

const SPRING = { type: 'spring', stiffness: 300, damping: 28 };

/**
 * MusicCorner — the record player + a crate of draggable record stickers.
 *
 * Records behave like every other sticker: drag one anywhere on the board and
 * it stays where you drop it. The only special behavior is the turntable:
 *  - Drop a record on the platter → it docks (snaps center, spins, plays).
 *  - Drop a record on an ALREADY-occupied platter → the new one docks and the
 *    previously docked record returns to its crate slot (the only time a record
 *    auto-returns home).
 *  - Drag the docked record off → it undocks and stays wherever you drop it.
 *
 * The crate and each record are SEPARATE elements (records are independently
 * draggable) — placeholder sticker-style art now, swappable for PNGs later.
 */
export default function MusicCorner({ x, y, enterDelay = 0, bringToFront, constraintsRef }) {
  const platterRef = useRef(null);
  const { currentId, play, stop } = useTrackPreview();
  const [dockedId, setDockedId] = useState(null);
  // Imperative handles registered by each Record, so the parent can send a
  // bumped record home.
  const recordApis = useRef({});

  const dockedSong = songs.find((s) => s.id === dockedId) || null;

  const register = (id, api) => {
    recordApis.current[id] = api;
    return () => { delete recordApis.current[id]; };
  };

  // A record reports it landed on the platter. If a different record was
  // already docked, send THAT one home. Then dock + play the new one.
  const dockRecord = (song) => {
    if (dockedId && dockedId !== song.id) {
      recordApis.current[dockedId]?.goHome();
    }
    setDockedId(song.id);
    play(song);
  };

  // A record reports it was dragged off the platter (or away). Just clear the
  // dock + stop audio — the record stays wherever it was dropped.
  const releaseDock = (songId) => {
    if (dockedId === songId) {
      setDockedId(null);
      stop();
    }
  };

  // Hit-test: is a record element's center over the platter?
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

  return (
    <div className="music-corner" style={{ left: x, top: y }}>
      {/* Turntable / player */}
      <motion.div
        className="turntable"
        initial={{ opacity: 0, scale: 0.9, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          opacity: { delay: enterDelay, duration: 0.4 },
          scale: { delay: enterDelay, type: 'spring', stiffness: 220, damping: 18 },
          y: { delay: enterDelay, type: 'spring', stiffness: 220, damping: 20 },
        }}
      >
        <div className="turntable-body">
          {/* The platter is the drop target. */}
          <div ref={platterRef} className="platter">
            <span className="platter-spindle" />
          </div>
          {/* Tonearm swings in when a record is docked. */}
          <motion.div
            className="tonearm"
            animate={{ rotate: dockedSong ? -20 : -42 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
            <span className="tonearm-base" />
            <span className="tonearm-rod" />
            <span className="tonearm-head" />
          </motion.div>
        </div>

        <div className="turntable-caption">
          {dockedSong ? (
            <>
              <span className="np-row">
                <span className="np-eq" aria-hidden="true"><i /><i /><i /><i /></span>
                {dockedSong.title}
              </span>
              <a
                className="np-link"
                href={dockedSong.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
              >
                listen on Spotify ↗
              </a>
            </>
          ) : (
            <span className="np-hint">drag a record on →</span>
          )}
        </div>
      </motion.div>

      {/* Crate of records. Back wall + front lip sandwich the records so they
          look filed inside; each record is independently draggable. */}
      <div className="crate">
        <div className="crate-back" aria-hidden="true" />
        {songs.map((song, i) => (
          <Record
            key={song.id}
            song={song}
            slot={i}
            docked={dockedId === song.id}
            playing={currentId === song.id}
            constraintsRef={constraintsRef}
            bringToFront={bringToFront}
            isOverPlatter={isOverPlatter}
            onDock={dockRecord}
            onRelease={releaseDock}
            register={register}
            platterRef={platterRef}
          />
        ))}
        <div className="crate-front" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Record — one draggable record sticker.
 *
 * Position is a free motion value (like other stickers): it stays wherever
 * dropped. The parent can call the imperative `goHome()` (registered on mount)
 * to send it back to its crate slot when it gets bumped off the player.
 */
function Record({ song, slot, docked, playing, constraintsRef, bringToFront, isOverPlatter, onDock, onRelease, register, platterRef }) {
  const elRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const baseZ = 1 + slot;
  const [z, setZ] = useState(baseZ);
  // Tracks whether this record currently sits "out" (off its crate slot).
  const homeRef = useRef(true);

  const lift = () => {
    if (bringToFront) setZ(bringToFront());
  };

  const snapToPlatter = () => {
    const el = elRef.current;
    const platter = platterRef.current;
    if (!el || !platter) return;
    const r = el.getBoundingClientRect();
    const p = platter.getBoundingClientRect();
    const dx = (p.left + p.width / 2) - (r.left + r.width / 2);
    const dy = (p.top + p.height / 2) - (r.top + r.height / 2);
    animate(x, x.get() + dx, SPRING);
    animate(y, y.get() + dy, SPRING);
    homeRef.current = false;
  };

  const goHome = () => {
    animate(x, 0, SPRING);
    animate(y, 0, SPRING);
    setZ(baseZ); // reset stacking so it tucks behind the crate's front lip
    homeRef.current = true;
  };

  // Register/unregister the imperative handle so the parent can bump us home.
  useEffect(() => register(song.id, { goHome }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = () => {
    if (isOverPlatter(elRef.current)) {
      onDock(song);     // parent bumps any prior record + plays this one
      snapToPlatter();  // center on the platter
    } else {
      // Dropped in free space: stay put. If we were the docked record, undock
      // (clears now-playing + audio) but keep our position.
      if (docked) onRelease(song.id);
      homeRef.current = false;
    }
  };

  return (
    <motion.div
      ref={elRef}
      className={`record ${docked ? 'is-docked' : ''}`}
      style={{ x, y, zIndex: z }}
      data-slot={slot}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0}
      dragMomentum={false}
      onPointerDown={lift}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: 1.06 }}
      whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
      aria-label={`Record: ${song.title}. Drag onto the player to play.`}
    >
      <span className={`record-disc ${playing ? 'is-spinning' : ''}`} style={{ '--label': song.labelImage ? `url(${song.labelImage})` : song.color }}>
        <span className="record-label" />
        <span className="record-hole" />
      </span>
    </motion.div>
  );
}
