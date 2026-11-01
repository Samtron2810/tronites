import { FiAlertTriangle } from "react-icons/fi";
import useBackButtonClose from "../hooks/useBackButtonClose";
import ModalPortal from "./ModalPortal";

const ConfirmDiscardModal = ({ onConfirm, onCancel }) => {
  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-hard-lg p-6 w-full max-w-sm max-h-[90dvh] overflow-y-auto border-2 border-line">
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
            className="btn flex-1"
          >
            Keep editing
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-danger flex-1"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default ConfirmDiscardModal;
