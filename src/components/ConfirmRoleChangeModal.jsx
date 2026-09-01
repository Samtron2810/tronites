import { useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import useBackButtonClose from "../hooks/useBackButtonClose";

const ConfirmRoleChangeModal = ({
  targetUser,
  newRole,
  onConfirm,
  onCancel,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  const isPromotionToAdmin = newRole === "admin";

  const handleConfirm = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onConfirm();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isPromotionToAdmin ? "bg-red-50" : "bg-primary-50"
            }`}
          >
            <FiAlertTriangle
              className={
                isPromotionToAdmin ? "text-red-500" : "text-primary-600"
              }
              size={16}
            />
          </div>
          <h2 className="text-lg font-semibold text-ink">Change Role</h2>
        </div>

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

        <p className="text-base text-ink-muted leading-relaxed">
          Are you sure you want to change this user's role from{" "}
          <span className="font-semibold text-ink">{targetUser.role}</span> to{" "}
          <span
            className={`font-semibold ${isPromotionToAdmin ? "text-red-600" : "text-ink"}`}
          >
            {newRole}
          </span>
          ?
          {isPromotionToAdmin &&
            " Admins have full access to user and content management."}
        </p>

        <div className="flex gap-3 mt-6">
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
            className={`flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed transition ${
              isPromotionToAdmin
                ? "bg-red-500 hover:bg-red-600"
                : "bg-primary-600 hover:bg-primary-700"
            }`}
          >
            {isUpdating ? "Updating..." : "Change Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmRoleChangeModal;
