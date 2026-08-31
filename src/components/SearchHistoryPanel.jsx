import { FiClock, FiStar, FiX, FiTrash2 } from "react-icons/fi";

// Renders below the search bar when it's focused and empty. Both lists
// come from the server (SavedSearch model) — no localStorage involved,
// so history/saved searches follow the account across devices.
const summarizeFilters = (filters) => {
  if (!filters) return "";
  const parts = [];
  if (filters.from) parts.push(`from @${filters.from}`);
  if (filters.startDate || filters.endDate) parts.push("date range");
  if (filters.hasMedia === true) parts.push("has media");
  if (filters.hasMedia === false) parts.push("text only");
  if (filters.minLikes) parts.push(`${filters.minLikes}+ likes`);
  return parts.join(" · ");
};

const SearchHistoryPanel = ({
  history,
  savedSearches,
  onSelect,
  onDeleteHistory,
  onClearHistory,
  onDeleteSaved,
}) => {
  if (history.length === 0 && savedSearches.length === 0) return null;

  return (
    <div className="bg-card border border-stroke rounded-2xl divide-y divide-stroke overflow-hidden">
      {savedSearches.length > 0 && (
        <div className="p-3">
          <p className="text-sm font-semibold text-ink-sub px-1 mb-1.5">
            Saved searches
          </p>
          {savedSearches.map((s) => (
            <div
              key={s._id}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface transition group"
            >
              <button
                onClick={() => onSelect(s)}
                className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
              >
                <FiStar className="text-primary-500 shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-base text-ink truncate">
                    {s.label || s.query || "Untitled search"}
                  </p>
                  {(s.query && s.label) || summarizeFilters(s.filters) ? (
                    <p className="text-xs text-ink-muted truncate">
                      {[s.label && s.query ? s.query : null, summarizeFilters(s.filters)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              </button>
              <button
                onClick={() => onDeleteSaved(s._id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-ink-muted hover:text-red-500 transition p-1"
                aria-label="Remove saved search"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="p-3">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <p className="text-sm font-semibold text-ink-sub">Recent searches</p>
            <button
              onClick={onClearHistory}
              className="text-xs text-ink-muted hover:text-red-500 transition flex items-center gap-1"
            >
              <FiTrash2 size={12} />
              Clear all
            </button>
          </div>
          {history.map((h) => (
            <div
              key={h._id}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-surface transition group"
            >
              <button
                onClick={() => onSelect(h)}
                className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
              >
                <FiClock className="text-ink-muted shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-base text-ink truncate">
                    {h.query || summarizeFilters(h.filters) || "Search"}
                  </p>
                  {h.query && summarizeFilters(h.filters) && (
                    <p className="text-xs text-ink-muted truncate">
                      {summarizeFilters(h.filters)}
                    </p>
                  )}
                </div>
              </button>
              <button
                onClick={() => onDeleteHistory(h._id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-ink-muted hover:text-red-500 transition p-1"
                aria-label="Remove from history"
              >
                <FiX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchHistoryPanel;
