import { useState, useMemo } from "react";
import {
  FiAlertTriangle,
  FiClock,
  FiSlash,
  FiCheckCircle,
} from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

// Duration presets for suspensions. "custom" reveals a datetime-local
// input; the chosen preset converts to a Date on submit.
const DURATIONS = [
  { value: "1h", label: "1 hour", hours: 1 },
  { value: "24h", label: "24 hours", hours: 24 },
  { value: "7d", label: "7 days", hours: 24 * 7 },
];

// Confirm modal for the three account-restriction actions (Phase 2),
// modeled on ConfirmRoleChangeModal. mode:
//   "suspend"    → duration picker + reason
//   "ban"        → reason only, permanent-action copy
//   "unrestrict" → plain confirm
// onConfirm receives ({ until, reason }) — `until` is null except for
// suspend — and the caller owns the API call.
const ConfirmRestrictionModal = ({
  mode,
  targetUser,
  onConfirm,
  onCancel,
  count = 1,
}) => {
  const [duration, setDuration] = useState("24h");
  const [customUntil, setCustomUntil] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // datetime-local floor: now + 1 minute. Computed once per mount via
  // useMemo — the purity rule rightly bans bare Date.now() in render,
  // and a minute-stale floor is harmless: past picks are rejected on
  // submit here and re-checked server-side against its own clock.
  const customMin = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/purity -- one-shot picker floor; stale-by-minutes is harmless (past picks rejected on submit + server re-checks)
      new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16),
    [],
  );

  if (!mode) return null;
  const isSuspend = mode === "suspend";
  const isBan = mode === "ban";

  const handleConfirm = async () => {
    if (isSubmitting) return;

    let until = null;
    if (isSuspend) {
      if (duration === "custom") {
        if (!customUntil || Number.isNaN(Date.parse(customUntil))) return;
        until = new Date(customUntil);
      } else {
        const preset = DURATIONS.find((d) => d.value === duration);
        until = new Date(Date.now() + preset.hours * 60 * 60 * 1000);
      }
      // Client-side guard so the obvious mistake never round-trips; the
      // server re-checks against its own clock regardless.
      if (until <= new Date()) return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({ until, reason: reason.trim() });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 6 — bulk mode triggers on count > 1 OR whenever the caller has
  // no single target to show (AdminUsers' selection bar passes
  // targetUser={null}, which also covers its one-account edge case).
  const isBulk = count > 1 || !targetUser;
  const actionWord = isBan ? "Ban" : isSuspend ? "Suspend" : "Restore access";
  const isPlainRestore = mode === "unrestrict";
  const header = isBulk
    ? count === 1
      ? `${actionWord} the selected account`
      : `${actionWord} ${count} accounts`
    : isPlainRestore
      ? "Restore access"
      : `${actionWord} account`;
  const canSubmit =
    !isSubmitting && (!isSuspend || duration !== "custom" || !!customUntil);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-60 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isBan ? "bg-red-50" : isSuspend ? "bg-amber-50" : "bg-primary-50"
            }`}
          >
            {isBan ? (
              <FiSlash className="text-red-500" size={16} />
            ) : isSuspend ? (
              <FiClock className="text-amber-500" size={16} />
            ) : (
              <FiCheckCircle className="text-primary-600" size={16} />
            )}
          </div>
          <h2 className="text-lg font-semibold text-ink">{header}</h2>
        </div>

        {isBulk ? (
          // Bulk mode — no single avatar to show; the parent passes only
          // the count. The amber treatment matches the suspend styling.
          <div className="flex items-center gap-3 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <FiAlertTriangle className="text-amber-500 shrink-0" size={16} />
            <p className="text-base font-medium text-ink">
              {count} accounts selected
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-3">
            <img
              src={resizedImageUrl(targetUser.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
              alt={targetUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-base font-semibold text-ink truncate">
                {targetUser.name}
              </p>
              <p className="text-sm text-ink-muted truncate">
                {targetUser.email}
              </p>
            </div>
          </div>
        )}

        {isSuspend && (
          <div className="mb-3">
            <p className="text-sm font-medium text-ink-sub mb-1.5">
              Suspension length
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDuration(d.value)}
                  className={`px-2 py-1.5 rounded-lg text-sm font-medium border transition ${
                    duration === d.value
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-stroke text-ink-sub hover:bg-surface"
                  }`}
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDuration("custom")}
                className={`px-2 py-1.5 rounded-lg text-sm font-medium border transition ${
                  duration === "custom"
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-stroke text-ink-sub hover:bg-surface"
                }`}
              >
                Custom
              </button>
            </div>
            {duration === "custom" && (
              <input
                type="datetime-local"
                value={customUntil}
                min={customMin}
                onChange={(e) => setCustomUntil(e.target.value)}
                className="mt-2 w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
              />
            )}
          </div>
        )}

        {!isBan && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder={
              isSuspend
                ? "Reason (shared with the user in their suspension notice)"
                : "Optional note for the moderation record"
            }
            rows={2}
            className="w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none mb-3"
          />
        )}
        {isBan && (
          <>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Reason for the ban"
              rows={2}
              className="w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-red-200 resize-none mb-3"
            />
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 mb-3">
              <FiAlertTriangle
                className="text-red-500 shrink-0 mt-0.5"
                size={15}
              />
              <p className="text-sm text-red-600 leading-relaxed">
                This is permanent. The account loses access immediately and can
                only be restored by an admin via "Restore access".
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={`flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed transition ${
              isBan
                ? "bg-red-500 hover:bg-red-600"
                : isSuspend
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-primary-600 hover:bg-primary-700"
            }`}
          >
            {isSubmitting
              ? "..."
              : isBulk
                ? count === 1
                  ? `${actionWord} selected account`
                  : `${actionWord} ${count} accounts`
                : isBan
                  ? "Ban permanently"
                  : actionWord}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRestrictionModal;
