import { useRef, useState } from 'react';
import StickyNote from './components/StickyNote/StickyNote';
import RecordPlayer from './components/RecordPlayer/RecordPlayer';
import DesignBadge from './components/DesignBadge/DesignBadge';
import BookSticker from './components/BookSticker/BookSticker';
import ConcertPoster, { PosterFace } from './components/ConcertPoster/ConcertPoster';
import BlobSticker from './components/BlobSticker/BlobSticker';
import ExpandedOverlay from './components/ExpandedOverlay/ExpandedOverlay';
import './App.css';

export default function App() {
  const canvasRef = useRef(null);
  const [posterOpen, setPosterOpen] = useState(false);

  // Shared "bring to front" counter so the last-touched sticker sits on top.
  const topZ = useRef(20);
  const bringToFront = () => {
    topZ.current += 1;
    return topZ.current;
  };

  // Staggered entrance: each sticker drops in slightly after the previous.
  const delay = (i) => 0.15 + i * 0.09;

  return (
    <main className="canvas" ref={canvasRef}>
      <div className="canvas-intro">
        <h1>The Sticker Desk</h1>
        <p>
          A little corner of my world. Drag things around, spin the record,
          flip through the book, and leave yourself a note.
        </p>
      </div>

      {/* Each sticker carries its own entrance delay so they drop in staggered,
          then settle into drift/rest motion. */}
      <ConcertPoster
        x="42%"
        y="9%"
        rotate={-3}
        enterDelay={delay(0)}
        bringToFront={bringToFront}
        constraintsRef={canvasRef}
        onExpand={() => setPosterOpen(true)}
      />

      <RecordPlayer
        x="9%"
        y="20%"
        rotate={-4}
        enterDelay={delay(1)}
        bringToFront={bringToFront}
        constraintsRef={canvasRef}
      />

      <DesignBadge
        x="74%"
        y="16%"
        rotate={6}
        enterDelay={delay(2)}
        bringToFront={bringToFront}
        constraintsRef={canvasRef}
      />

      <BookSticker
        x="13%"
        y="62%"
        rotate={3}
        enterDelay={delay(3)}
        bringToFront={bringToFront}
        constraintsRef={canvasRef}
      />

      <StickyNote
        x="60%"
        y="58%"
        rotate={4}
        enterDelay={delay(4)}
        bringToFront={bringToFront}
        constraintsRef={canvasRef}
      />

      <BlobSticker
        x="80%"
        y="64%"
        rotate={-5}
        enterDelay={delay(5)}
        bringToFront={bringToFront}
        constraintsRef={canvasRef}
      />

      <p className="canvas-hint">drag · click · edit · play</p>

      {/* Focused view for the concert poster. */}
      <ExpandedOverlay open={posterOpen} onClose={() => setPosterOpen(false)}>
        <PosterFace detailed />
      </ExpandedOverlay>
    </main>
  );
}
