import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import useBackButtonClose from "../hooks/useBackButtonClose";
import ModalPortal from "./ModalPortal";

// Mirrors DeleteAccountModal's visual pattern (same overlay + centered
// card + icon header) but uses neutral/primary styling since exporting
// data is non-destructive — a stray click shouldn't trigger a download,
// but it's not a red-warning action either.
const ExportDataModal = ({ onConfirm, onCancel }) => {
  const [isExporting, setIsExporting] = useState(false);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await onConfirm();
    } catch {
      // Errors intentionally propagate to the parent (it shows a toast)
      // and the modal stays open so the user can retry.
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-hard-lg p-6 w-full max-w-sm max-h-[90dvh] overflow-y-auto border-2 border-line">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <FiDownload className="text-primary-600" size={16} />
          </div>
          <h2 className="text-lg font-semibold text-ink">
            Download your data
          </h2>
        </div>
        <p className="text-base text-ink-muted leading-relaxed">
          This will download a copy of everything tied to your account — posts,
          comments, likes, bookmarks, follows, messages, and more — as a JSON
          file.
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isExporting}
            className="btn flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn btn-primary flex-1"
          >
            {isExporting ? "Preparing export..." : "Download my data"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default ExportDataModal;
