import { useRef, useState } from 'react';
import Sticker from '../Sticker/Sticker';
import './StickyNote.css';

const PLACEHOLDER = 'write your note here ✎';

export default function StickyNote({
  x, y, rotate, z, enterDelay, bringToFront, constraintsRef,
  id, variant = 'yellow', small = false, defaultText = '', onTextChange,
}) {
  const editRef = useRef(null);
  const lastValidText = useRef(defaultText);
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(defaultText);

  const beginEdit = () => {
    lastValidText.current = text;
    setIsEditing(true);
    requestAnimationFrame(() => {
      const el = editRef.current;
      if (!el) return;
      el.focus();
      // Place cursor at end of text without selecting anything.
      const sel = window.getSelection();
      sel.collapse(el, el.childNodes.length);
    });
  };

  const beginEditSelectAll = () => {
    lastValidText.current = text;
    setIsEditing(true);
    requestAnimationFrame(() => {
      const el = editRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  };

  const commit = () => {
    const newText = editRef.current?.innerText.trim() ?? '';
    setText(newText);
    setIsEditing(false);
    onTextChange?.(id, newText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      editRef.current?.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      editRef.current?.blur();
    }
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
      onDoubleClick={beginEditSelectAll}
    >
      <div className={`sticky-note sticky-note--${variant} ${small ? 'sticky-note--small' : ''} ${isEditing ? 'is-editing' : ''}`}>
        <div
          ref={editRef}
          className="sticky-note-text"
          contentEditable={isEditing}
          suppressContentEditableWarning
          spellCheck={false}
          data-placeholder={PLACEHOLDER}
          onBlur={commit}
          onInput={() => {
            const el = editRef.current;
            if (!el) return;
            let overflow = el.scrollHeight > el.clientHeight;
            // For the yellow variant, also prevent text from crossing the fold
            // on line 4 — block anything past 75% of the text area width.
            if (!overflow && variant === 'yellow') {
              const sel = window.getSelection();
              if (sel?.rangeCount > 0) {
                const r = sel.getRangeAt(0).getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const relY = r.bottom - elRect.top;
                const relX = r.right - elRect.left;
                const isLastLine = relY > el.clientHeight - 8;
                if (isLastLine && relX > el.clientWidth * 0.75) overflow = true;
              }
            }
            if (overflow) {
              el.innerText = lastValidText.current;
              const sel = window.getSelection();
              sel.collapse(el, el.childNodes.length);
            } else {
              lastValidText.current = el.innerText;
            }
            onTextChange?.(id, el.innerText.trim());
          }}
          onKeyDown={handleKeyDown}
          onPointerDown={(e) => isEditing && e.stopPropagation()}
        >
          {text}
        </div>
      </div>
    </Sticker>
  );
}
