import { useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";

// Mirrors DeletePostModal's visual pattern (same red-warning treatment
// for a destructive action) but adds a password field, since account
// deletion is a much higher-stakes action than deleting a single post —
// a stray click here shouldn't be enough on its own, and the backend
// (deleteMyAccount) requires the password regardless, so the field is
// mandatory here, not just a nice-to-have.
const DeleteAccountModal = ({ onConfirm, onCancel }) => {
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (isDeleting || !password) return;
    setIsDeleting(true);
    setError("");
    try {
      await onConfirm(password);
    } catch (e) {
      setError(e?.response?.data?.message || "Couldn't delete your account. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="text-red-500" size={16} />
          </div>
          <h2 className="text-base font-semibold text-ink">Delete Account</h2>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          This deactivates your account immediately. It's permanently erased after 30 days —
          contact support before then if you change your mind.
        </p>

        <label className="block mt-4">
          <span className="block text-xs font-medium text-ink-sub mb-1.5">
            Enter your password to confirm
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            autoFocus
            disabled={isDeleting}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stroke bg-white text-ink text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition disabled:opacity-60"
            placeholder="Password"
          />
        </label>
        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink-sub hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || !password}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
