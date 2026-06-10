import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ExpandedOverlay.css';

/**
 * ExpandedOverlay — centered focus view for an expanded sticker.
 *
 * Blurs and dims the board behind it, springs the content into the middle,
 * and can be dismissed by the close button, a backdrop click, or Escape.
 */
export default function ExpandedOverlay({ open, onClose, children }) {
  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="overlay-content"
            initial={{ scale: 0.82, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.86, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
            <button
              className="overlay-close"
              onClick={onClose}
              aria-label="Close"
              autoFocus
            >
              ×
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
