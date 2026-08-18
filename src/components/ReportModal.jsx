import { useState } from "react";
import { FiFlag } from "react-icons/fi";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "violence", label: "Violence" },
  { value: "nudity_sexual_content", label: "Nudity or sexual content" },
  { value: "self_harm", label: "Self-harm" },
  { value: "impersonation", label: "Impersonation" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

// targetLabel is shown in the header, e.g. "this user", "this post",
// "this comment" — kept generic since the same modal is reused for
// user/post/comment/message reports (see targetType).
const ReportModal = ({ targetLabel, onConfirm, onCancel }) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({ reason, details: details.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <FiFlag className="text-amber-500" size={16} />
          </div>
          <h2 className="text-base font-semibold text-ink">Report {targetLabel}</h2>
        </div>

        <p className="text-sm text-ink-muted mb-3">
          What's the issue? This is sent to our moderation team, not to{" "}
          {targetLabel}.
        </p>

        <div className="space-y-1.5 mb-4">
          {REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm cursor-pointer transition ${
                reason === r.value
                  ? "border-primary-400 bg-primary-50 text-ink"
                  : "border-stroke text-ink-sub hover:bg-surface"
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-primary-500"
              />
              {r.label}
            </label>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 500))}
          placeholder="Add details (optional)"
          rows={3}
          className="w-full rounded-xl border border-stroke px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
        />
        <p className="text-right text-xs text-ink-muted mt-1">{details.length}/500</p>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !reason}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? "..." : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
