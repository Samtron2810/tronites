import { useEffect, useRef, useState } from "react";

// 1.2 — fixed 6-emoji reaction set, shared between post cards and chat
// bubbles. Deliberately NOT a full emoji picker (see roadmap decision):
// a tight, thumb-friendly row beats scrolling a full picker on mobile,
// and a fixed set keeps the aggregation/notification text simple
// ("X reacted ❤️" always reads correctly).
export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const PICKER_WIDTH = 232; // approx rendered width (6 emojis + padding), for viewport clamping
const PICKER_HEIGHT = 44;
const VIEWPORT_MARGIN = 8;
const POINT_GAP = 10; // px above the click/touch point, per design

// Two positioning modes:
// - Default (no `anchorPoint`): `absolute bottom-full`, positioned by the
//   wrapping `relative` parent — original behavior, used by PostCard.jsx
//   where the picker should sit above the whole card.
// - `anchorPoint` given `{ x, y }` (viewport coords, e.g. from the
//   triggering click/touch event): renders `fixed`, 10px above that exact
//   point instead of above the whole bubble — used by ChatModal.jsx so
//   the picker opens where you actually pressed, not always flush above
//   a potentially tall message bubble/image/video.
const ReactionPicker = ({ open, onSelect, onClose, align = "left", anchorPoint }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  // Compute fixed-position coords once per open, clamped so the picker
  // never renders off-screen (edge bubbles, near top of viewport, etc.).
  useEffect(() => {
    if (!open || !anchorPoint) {
      setPos(null);
      return;
    }
    let left = anchorPoint.x - PICKER_WIDTH / 2;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, window.innerWidth - PICKER_WIDTH - VIEWPORT_MARGIN),
    );
    let top = anchorPoint.y - POINT_GAP - PICKER_HEIGHT;
    // Not enough room above the point (near top of viewport/screen) —
    // flip to just below the point instead of clipping.
    if (top < VIEWPORT_MARGIN) {
      top = anchorPoint.y + POINT_GAP;
    }
    setPos({ left, top });
  }, [open, anchorPoint]);

  if (!open) return null;

  if (anchorPoint) {
    return (
      <div
        ref={ref}
        role="menu"
        style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden" }}
        className="fixed flex items-center gap-0.5 bg-card border border-stroke rounded-full shadow-lg px-1.5 py-1 z-50 animate-reaction-pop"
      >
        {REACTION_EMOJIS.map((emoji, i) => (
          <button
            key={emoji}
            type="button"
            role="menuitem"
            onClick={() => onSelect(emoji)}
            style={{ animationDelay: `${i * 25}ms` }}
            className="text-xl leading-none p-1.5 rounded-full hover:bg-surface hover:scale-125 active:scale-95 transition-transform duration-150 animate-reaction-item"
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="menu"
      className={`absolute bottom-full mb-2 ${
        align === "right" ? "right-0" : "left-0"
      } flex items-center gap-0.5 bg-card border border-stroke rounded-full shadow-lg px-1.5 py-1 z-50 animate-reaction-pop`}
    >
      {REACTION_EMOJIS.map((emoji, i) => (
        <button
          key={emoji}
          type="button"
          role="menuitem"
          onClick={() => onSelect(emoji)}
          style={{ animationDelay: `${i * 25}ms` }}
          className="text-xl leading-none p-1.5 rounded-full hover:bg-surface hover:scale-125 active:scale-95 transition-transform duration-150 animate-reaction-item"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default ReactionPicker;
