import { useState } from "react";
import { FiSliders, FiX } from "react-icons/fi";
import useBackButtonClose from "../hooks/useBackButtonClose";

// Local editable draft of the applied filters — Cancel discards edits,
// Apply commits them back to Explore.jsx in one shot rather than firing
// a search request per keystroke/toggle inside the modal.
const emptyFilters = { from: "", startDate: "", endDate: "", hasMedia: null, minLikes: "" };

const SearchFiltersModal = ({ initialFilters, onApply, onCancel }) => {
  const [draft, setDraft] = useState({ ...emptyFilters, ...initialFilters });

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  const activeCount = Object.entries(draft).filter(([k, v]) => {
    if (k === "hasMedia") return v !== null;
    return String(v || "").trim().length > 0;
  }).length;

  const handleApply = () => {
    onApply({
      from: draft.from.trim().replace(/^@/, ""),
      startDate: draft.startDate || null,
      endDate: draft.endDate || null,
      hasMedia: draft.hasMedia,
      minLikes: draft.minLikes ? Math.max(0, parseInt(draft.minLikes, 10) || 0) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <FiSliders className="text-primary-600" size={16} />
            </div>
            <h2 className="text-lg font-semibold text-ink">Search filters</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-ink-muted hover:text-ink transition p-1"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-ink-sub block mb-1.5">
              From user
            </label>
            <div className="flex items-center gap-2 bg-surface border border-stroke rounded-xl px-3 py-2">
              <span className="text-ink-muted text-base">@</span>
              <input
                type="text"
                value={draft.from}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                placeholder="username"
                className="flex-1 bg-transparent outline-none text-base text-ink placeholder:text-ink-muted"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-ink-sub block mb-1.5">
              Date range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                className="bg-surface border border-stroke rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-primary-400"
              />
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                className="bg-surface border border-stroke rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-primary-400"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-ink-sub block mb-1.5">
              Media
            </label>
            <div className="flex gap-2">
              {[
                { label: "Any", value: null },
                { label: "Has media", value: true },
                { label: "Text only", value: false },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setDraft((d) => ({ ...d, hasMedia: opt.value }))}
                  className={`flex-1 text-sm font-semibold py-2 rounded-xl border transition ${
                    draft.hasMedia === opt.value
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-stroke text-ink-sub hover:bg-surface"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-ink-sub block mb-1.5">
              Minimum likes
            </label>
            <input
              type="number"
              min="0"
              value={draft.minLikes}
              onChange={(e) => setDraft((d) => ({ ...d, minLikes: e.target.value }))}
              placeholder="0"
              className="w-full bg-surface border border-stroke rounded-xl px-3 py-2 text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary-400"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setDraft(emptyFilters)}
            disabled={activeCount === 0}
            className="flex-1 text-sm font-semibold py-2.5 rounded-xl border border-stroke text-ink-sub hover:bg-surface transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-800 transition"
          >
            Apply{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchFiltersModal;
