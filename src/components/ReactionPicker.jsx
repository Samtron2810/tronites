import { useEffect, useRef } from "react";

// 1.2 — fixed 6-emoji reaction set, shared between post cards and chat
// bubbles. Deliberately NOT a full emoji picker (see roadmap decision):
// a tight, thumb-friendly row beats scrolling a full picker on mobile,
// and a fixed set keeps the aggregation/notification text simple
// ("X reacted ❤️" always reads correctly).
export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

// Positioned relative to a wrapping `relative` parent — pass `align` to
// flip the popover left/right when the trigger sits near a screen edge
// (e.g. the last message bubble column in a chat thread).
const ReactionPicker = ({ open, onSelect, onClose, align = "left" }) => {
  const ref = useRef(null);

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

  if (!open) return null;

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
