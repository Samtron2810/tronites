import { useState } from "react";
import { FiDownload } from "react-icons/fi";

// Mirrors DeleteAccountModal's visual pattern (same overlay + centered
// card + icon header) but uses neutral/primary styling since exporting
// data is non-destructive — a stray click shouldn't trigger a download,
// but it's not a red-warning action either.
const ExportDataModal = ({ onConfirm, onCancel }) => {
  const [isExporting, setIsExporting] = useState(false);

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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <FiDownload className="text-primary-600" size={16} />
          </div>
          <h2 className="text-base font-semibold text-ink">
            Download your data
          </h2>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          This will download a copy of everything tied to your account — posts,
          comments, likes, bookmarks, follows, messages, and more — as a JSON
          file.
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isExporting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isExporting ? "Preparing export..." : "Download my data"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDataModal;
