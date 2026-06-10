import { useRef, useState } from 'react';
import Sticker from '../Sticker/Sticker';
import './StickyNote.css';

/**
 * StickyNote — the editable hero object.
 *
 * The text is inline-editable via contentEditable. Clicking the note focuses
 * the text for editing; Enter (without Shift) or clicking away confirms.
 * A small "edit" affordance appears so it never looks merely decorative.
 */
export default function StickyNote({ x, y, rotate, z, enterDelay, bringToFront, constraintsRef }) {
  const editRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  // Default note — feels handwritten and personal.
  const [text, setText] = useState('drag me around\n+ click to write\nyour own note ✎');

  const beginEdit = () => {
    setIsEditing(true);
    // Wait a tick so the element is focusable, then drop the caret at the end.
    requestAnimationFrame(() => {
      const el = editRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  };

  const commit = () => {
    setIsEditing(false);
    if (editRef.current) setText(editRef.current.innerText.trim());
  };

  const handleKeyDown = (e) => {
    // Enter confirms; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      editRef.current?.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      editRef.current?.blur();
    }
    // Don't let key presses bubble to the sticker's drag/keyboard handlers.
    e.stopPropagation();
  };

  return (
    <Sticker
      x={x}
      y={y}
      rotate={rotate}
      z={z}
      enterDelay={enterDelay}
      bringToFront={bringToFront}
      constraintsRef={constraintsRef}
      className="sticky-note-shell"
      label="Editable sticky note"
      onClick={beginEdit}
    >
      <div className={`sticky-note ${isEditing ? 'is-editing' : ''}`}>
        <span className="sticky-note-tape" aria-hidden="true" />
        <div
          ref={editRef}
          className="sticky-note-text"
          contentEditable={isEditing}
          suppressContentEditableWarning
          spellCheck={false}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          // Stop drag from starting while the caret is in the text.
          onPointerDown={(e) => isEditing && e.stopPropagation()}
        >
          {text}
        </div>
        <span className="sticky-note-edithint" aria-hidden="true">
          {isEditing ? 'press enter to save' : 'click to edit'}
        </span>
      </div>
    </Sticker>
  );
}
