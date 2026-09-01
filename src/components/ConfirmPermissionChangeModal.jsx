import { useState } from "react";
import { FiAlertTriangle, FiShield } from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { PERMISSION_OPTIONS } from "../constants/permissions";
import useBackButtonClose from "../hooks/useBackButtonClose";

// Sibling of ConfirmRoleChangeModal (Phase 5): checkbox draft editor for
// a moderator's explicit permission set. The draft lives here so the
// admin sees exactly what they're about to save; onConfirm receives the
// final array and the parent owns the API call + row update.
const ConfirmPermissionChangeModal = ({
  targetUser,
  initialPermissions,
  onConfirm,
  onCancel,
}) => {
  const [draft, setDraft] = useState(() => new Set(initialPermissions || []));
  const [isUpdating, setIsUpdating] = useState(false);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  const toggle = (value) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onConfirm([...draft]);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary-50">
            <FiShield className="text-primary-600" size={16} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Moderator permissions
            </h2>
            <p className="text-sm text-ink-muted">
              Saved as an explicit set — it overrides the defaults entirely.
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

        <div className="space-y-1 mb-2">
          {PERMISSION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition ${
                opt.locked
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:bg-surface"
              }`}
            >
              <input
                type="checkbox"
                checked={draft.has(opt.value)}
                onChange={() => toggle(opt.value)}
                disabled={opt.locked || isUpdating}
                className="mt-0.5 accent-primary-600"
              />
              <span className="min-w-0">
                <span className="block text-base font-medium text-ink">
                  {opt.label}
                </span>
                <span className="block text-sm text-ink-muted">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <p className="text-sm text-ink-muted leading-relaxed flex items-start gap-1.5">
          <FiAlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={12} />
          Saving replaces the whole set. An empty selection means this
          moderator keeps working under the default set — tick nothing you
          don't mean to grant.
        </p>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={isUpdating}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isUpdating}
            className="flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isUpdating ? "Saving..." : "Save permissions"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPermissionChangeModal;
