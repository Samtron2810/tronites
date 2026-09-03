import { useState } from "react";
import { FiAlertTriangle, FiAward } from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { VERIFICATION_META } from "../constants/verification";
import useBackButtonClose from "../hooks/useBackButtonClose";

// Phase 1 — manual grant/revoke only, no self-service application flow.
// mode "grant" shows the type picker + entityName (required for
// business/government); mode "revoke" just confirms against an existing
// badge. "staff" is excluded from the grant type list — it derives from
// role and is rejected server-side if attempted; keeping it out of the
// picker avoids the round-trip.
const GRANTABLE_TYPES = ["individual", "business", "government", "creator"];

const ConfirmVerificationModal = ({
  mode, // "grant" | "revoke"
  targetUser,
  revokeType, // required when mode === "revoke"
  onConfirm, // grant: ({ type, entityName, expiresAt }) | revoke: ({ type, reason })
  onCancel,
}) => {
  const [type, setType] = useState(GRANTABLE_TYPES[0]);
  const [entityName, setEntityName] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useBackButtonClose(true, onCancel);

  const requiresEntity = mode === "grant" && ["business", "government"].includes(type);
  const meta = VERIFICATION_META[mode === "grant" ? type : revokeType];

  const handleConfirm = async () => {
    if (isSubmitting) return;
    if (requiresEntity && !entityName.trim()) return;
    setIsSubmitting(true);
    try {
      if (mode === "grant") {
        await onConfirm({ type, entityName: entityName.trim(), expiresAt: null });
      } else {
        await onConfirm({ type: revokeType, reason: reason.trim() });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${meta.color}1a` }}
          >
            <FiAward style={{ color: meta.color }} size={16} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {mode === "grant" ? "Grant verification badge" : "Revoke badge"}
            </h2>
            <p className="text-sm text-ink-muted">
              {mode === "grant"
                ? "Asserts a specific, checked claim — never generic importance."
                : "The account immediately stops showing this badge."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
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

        {mode === "grant" ? (
          <>
            <label className="block text-sm font-medium text-ink-sub mb-1.5">
              Badge type
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {GRANTABLE_TYPES.map((t) => {
                const m = VERIFICATION_META[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                      type === t
                        ? "border-primary-500 bg-primary-50"
                        : "border-stroke hover:bg-surface"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="text-sm font-medium text-ink">
                      {m.label.replace("Verified ", "")}
                    </span>
                  </button>
                );
              })}
            </div>

            {requiresEntity && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-ink-sub mb-1.5">
                  Entity name (required)
                </label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="e.g. Kabu Foods Ltd"
                  maxLength={120}
                  className="w-full border border-stroke rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card"
                />
                <p className="text-sm text-ink-muted mt-1">
                  Shown on the badge detail sheet — this is the whole point
                  of the claim.
                </p>
              </div>
            )}

            <p className="text-sm text-ink-muted leading-relaxed flex items-start gap-1.5">
              <FiAlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={12} />
              {type === "individual"
                ? "Never charge for this badge — the moment identity is purchasable, it stops proving identity."
                : "Confirm evidence has actually been checked before granting."}
            </p>
          </>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-sub mb-1.5">
              Reason (optional, internal)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. entity no longer active"
              maxLength={500}
              rows={2}
              className="w-full border border-stroke rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || (requiresEntity && !entityName.trim())}
            className={`flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed transition ${
              mode === "revoke"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-primary-600 hover:bg-primary-700"
            }`}
          >
            {isSubmitting
              ? "Saving..."
              : mode === "grant"
                ? "Grant badge"
                : "Revoke badge"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmVerificationModal;
