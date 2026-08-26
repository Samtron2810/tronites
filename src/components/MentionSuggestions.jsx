// Renders the floating suggestion list near an input. Positioned by the
// parent (relative wrapper); this just fills that wrapper's width. Opens
// above the input by default ("up"); pass direction="down" to open below
// it (mount points at the top of a scroll-clipped container must, e.g.
// CreatePostModal). maxHeightClass lets a caller shrink the visible rows
// when the space in the chosen direction is tight.
import defaultAvatar from "../assets/defaultAvatar";

const MentionSuggestions = ({
  suggestions,
  onSelect,
  loading,
  direction = "up", // "up" opens above the input (bottom-full); "down" opens below (top-full)
  maxHeightClass = "max-h-48",
}) => {
  if (!suggestions.length && !loading) return null;

  return (
    <div
      className={`absolute z-30 left-0 right-0 ${
        direction === "down" ? "top-full mt-1" : "bottom-full mb-1"
      } bg-card border border-stroke rounded-xl shadow-lg overflow-hidden ${maxHeightClass} overflow-y-auto`}
    >
      {suggestions.length === 0 && (
        <p className="px-3 py-2 text-sm text-ink-muted">No matches</p>
      )}
      {suggestions.map((u) => (
        <button
          key={u._id}
          type="button"
          onMouseDown={(e) => {
            // mousedown (not click) so this fires before the input blurs
            e.preventDefault();
            onSelect(u.username);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface transition text-left"
        >
          <img
            src={u.profilePic || defaultAvatar}
            alt={u.name}
            className="w-6 h-6 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{u.name}</p>
            <p className="text-sm text-ink-muted truncate">@{u.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MentionSuggestions;
