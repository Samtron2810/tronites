// 1.2 — compact grouped reaction display: "❤️ 3  😂 1" style pill.
// Deliberately not a "who reacted" list here (that's the future
// listReactors-backed bottom sheet, out of scope for this pass) — this
// is the always-visible summary row, same information tier as a like
// count today.
const ReactionSummaryBar = ({ summary, myReaction, onToggle, justUpdated }) => {
  const entries = Object.entries(summary || {}).filter(([, count]) => count > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {entries.map(([emoji, count]) => {
        const mine = myReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition ${
              mine
                ? "bg-primary-100 border-primary-400 text-primary-800"
                : "bg-surface border-stroke text-ink-sub hover:border-primary-200"
            } ${justUpdated === emoji ? "animate-reaction-badge" : ""}`}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ReactionSummaryBar;
