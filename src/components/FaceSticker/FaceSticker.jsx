import { AnimatePresence, motion } from 'framer-motion';
import Sticker from '../Sticker/Sticker';
import './FaceSticker.css';

const faceImgs = {
  neutral: '/face.png',
  happy:   '/face-happy.png',
  sad:     '/face-sad.png',
  secret:  '/face-secret.png',
};

const bubbleText = {
  happy:  'Thank you!',
  sad:    'Awww',
  secret: 'Strength before weakness',
};

// Curved tail as SVG — starts bottom-left of bubble, curves toward the mouth
function BubbleTail({ wide = false }) {
  return (
    <svg
      className={`face-bubble-tail${wide ? ' face-bubble-tail--wide' : ''}`}
      viewBox="0 0 30 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cream fill — top extends behind bubble so there's no visible seam */}
      <path
        d="M 2 0 L 28 0 Q 16 6, 2 24 Q 6 12, 2 0 Z"
        fill="#fffdf4"
        stroke="none"
      />
    </svg>
  );
}

export default function FaceSticker({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef, mood = 'neutral' }) {
  const text = bubbleText[mood] ?? null;

  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="face-shell"
      label="A sticker of me"
    >
      <div className="face">
        {/* Clip wrapper trims the ~5px transparent edges and ~8px top pad from the PNG */}
        <div className="face-img-clip">
          <AnimatePresence mode="wait">
            <motion.img
              key={mood}
              className="face-img"
              src={faceImgs[mood] ?? faceImgs.neutral}
              alt=""
              draggable="false"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
            />
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {text && (
            <motion.div
              key={mood}
              className="face-bubble-wrap"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            >
              {/* Bubble rendered first = in front; tail behind via z-index */}
              <div className={`face-bubble${mood === 'secret' ? ' face-bubble--wide' : ''}`}>
                {text}
              </div>
              <BubbleTail wide={mood === 'secret'} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sticker>
  );
}
