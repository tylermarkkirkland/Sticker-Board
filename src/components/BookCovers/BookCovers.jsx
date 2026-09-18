import { useState } from 'react';
import { motion } from 'framer-motion';
import './BookCovers.css';

// Per-book data. Tags + quotes are sample picks — swap in your real ones
// anytime. cover = the sliced front-cover PNG in public/.
const BOOKS = [
  {
    title: 'Red Rising',
    author: 'Pierce Brown',
    cover: '/book-cover-1.png',
    tags: ['Brutal', 'Sci-fi', 'Quick Paced'],
    quote: 'I would have lived in peace. But my enemies brought me war.',
  },
  {
    title: 'The Way of Kings',
    author: 'Brandon Sanderson',
    cover: '/book-cover-2.png',
    tags: ['Epic Fantasy', 'Inspiring', 'War'],
    quote: 'Life before death, strength before weakness, journey before destination.',
  },
  {
    title: 'The Sword of Kaigen',
    author: 'M. L. Wang',
    cover: '/book-cover-3.png',
    tags: ['Heartbreaking', 'Feudal Japan', 'Magic'],
    quote: 'A warrior may scheme, lie, and break, but a real one always gets back up.',
  },
  {
    title: 'Mistborn',
    author: 'Brandon Sanderson',
    cover: '/book-cover-4.png',
    tags: ['Heist', 'Inventive', 'Clever'],
    quote: "There's always another secret.",
  },
];

// Cover image paths, exported so the always-mounted BookStack can preload them
// before the overlay ever opens (the covers only mount when it does).
export const bookCoverImages = BOOKS.map((b) => b.cover);

// Slight fan: rotation + vertical offset per card so the row arcs gently.
const FAN = [
  { rotate: -8, y: 10 },
  { rotate: -3, y: -6 },
  { rotate: 3, y: -6 },
  { rotate: 8, y: 10 },
];

function Tags({ tags }) {
  return (
    <div className="cover-tags" aria-label={`Tags: ${tags.join(', ')}`}>
      {tags.map((tag) => (
        <span key={tag} className="cover-tag">{tag}</span>
      ))}
    </div>
  );
}

/**
 * BookCovers — the expanded view. Four covers fan out; clicking a cover flips
 * it to a back showing its tags and a favorite quote.
 */
export default function BookCovers() {
  const [flipped, setFlipped] = useState(() => BOOKS.map(() => false));

  const toggle = (i) =>
    setFlipped((f) => f.map((v, j) => (j === i ? !v : v)));

  return (
    <div className="book-covers">
      <p className="book-covers-title">On my shelf</p>
      <div className="book-covers-row">
        {BOOKS.map((book, i) => (
          <motion.button
            key={book.title}
            className="cover-card"
            type="button"
            onClick={() => toggle(i)}
            initial={{ opacity: 0, y: 30, rotate: 0 }}
            animate={{ opacity: 1, y: FAN[i].y, rotate: FAN[i].rotate }}
            transition={{ delay: 0.06 * i, type: 'spring', stiffness: 240, damping: 22 }}
            whileHover={{ y: FAN[i].y - 14, rotate: FAN[i].rotate * 0.5, zIndex: 5 }}
            aria-label={`${book.title} by ${book.author}. Click to ${flipped[i] ? 'see the cover' : 'read a favorite quote'}.`}
          >
            {/* Perspective lives here (not on the motion element, whose own
                transform would otherwise consume it and flatten the flip). */}
            <span className="cover-persp">
              <span className={`cover-inner ${flipped[i] ? 'is-flipped' : ''}`}>
                <span className="cover-face cover-front">
                  <img src={book.cover} alt={book.title} draggable="false" />
                </span>
                <span className="cover-face cover-back">
                  <span className="cover-back-title">{book.title}</span>
                  <Tags tags={book.tags} />
                  <span className="cover-quote">“{book.quote}”</span>
                  <span className="cover-flip-hint">click to flip back</span>
                </span>
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
