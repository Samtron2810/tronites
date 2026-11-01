import { useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import useBackButtonClose from "../hooks/useBackButtonClose";
import ModalPortal from "./ModalPortal";

// Same visual pattern as DeletePostModal, parameterized so it also
// covers comment/reply deletion without a near-duplicate component.
const ConfirmDeleteModal = ({
  title = "Delete",
  message = "Are you sure you want to delete this? This action cannot be undone.",
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-hard-lg p-6 w-full max-w-sm max-h-[90dvh] overflow-y-auto border-2 border-line">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="text-red-500" size={16} />
          </div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
        </div>
        <p className="text-base text-ink-muted leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="btn flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn btn-danger flex-1"
          >
            {isDeleting ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default ConfirmDeleteModal;
