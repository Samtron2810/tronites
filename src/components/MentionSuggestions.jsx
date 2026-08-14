// Renders the floating suggestion list under/near an input. Positioned by
// the parent (relative wrapper); this just fills that wrapper's width.
const MentionSuggestions = ({ suggestions, onSelect, loading }) => {
  if (!suggestions.length && !loading) return null;

  return (
    <div className="absolute z-30 left-0 right-0 bottom-full mb-1 bg-white border border-stroke rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
      {suggestions.length === 0 && (
        <p className="px-3 py-2 text-xs text-ink-muted">No matches</p>
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
            src={u.profilePic || "https://i.pravatar.cc/150"}
            alt={u.name}
            className="w-6 h-6 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{u.name}</p>
            <p className="text-xs text-ink-muted truncate">@{u.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MentionSuggestions;
