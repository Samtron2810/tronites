import { useState } from "react";
import { FiLogOut } from "react-icons/fi";
import useBackButtonClose from "../hooks/useBackButtonClose";
import ModalPortal from "./ModalPortal";

const LogoutModal = ({ onConfirm, onCancel }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onCancel);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try { await onConfirm(); }
    finally { setIsLoggingOut(false); }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-hard-lg p-6 w-full max-w-sm max-h-[90dvh] overflow-y-auto border-2 border-line">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <FiLogOut className="text-primary-600" size={16} />
          </div>
          <h2 className="text-lg font-semibold text-ink">Log Out</h2>
        </div>
        <p className="text-base text-ink-muted leading-relaxed">
          Are you sure you want to log out of your account?
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isLoggingOut}
            className="btn flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn btn-danger flex-1"
          >
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default LogoutModal;
