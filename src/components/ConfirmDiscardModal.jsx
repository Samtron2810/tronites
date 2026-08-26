import { FiAlertTriangle } from "react-icons/fi";

const ConfirmDiscardModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="text-red-500" size={16} />
          </div>
          <h2 className="text-lg font-semibold text-ink">Discard post?</h2>
        </div>
        <p className="text-base text-ink-muted leading-relaxed">
          Your post won't be saved. Are you sure you want to discard it?
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface transition"
          >
            Keep editing
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white bg-red-500 hover:bg-red-600 transition"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDiscardModal;
