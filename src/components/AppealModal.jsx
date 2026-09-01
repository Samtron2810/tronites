import { useState } from "react";
import { FiFileText, FiX } from "react-icons/fi";
import api from "../services/api";

// 3.1 — restricted-account recourse. Rendered from Login.jsx's restricted
// panel. The account has no session (a restricted user can't log in), so
// this re-collects identifier+password to prove ownership server-side —
// same shape as the login form it sits next to, just posted to /appeals
// instead of /auth/login.
const AppealModal = ({ identifier: initialIdentifier, onClose }) => {
  const [identifier, setIdentifier] = useState(initialIdentifier || "");
  const [password, setPassword] = useState("");
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { message } | { error }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post("/appeals", { identifier, password, statement });
      setResult({ message: res.data.message });
    } catch (err) {
      setResult({
        error: err.response?.data?.message || "Couldn't submit your appeal.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <FiFileText className="text-primary-600" size={16} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Appeal this decision</h3>
              <p className="text-sm text-ink-muted">
                A moderator will review your statement.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink shrink-0"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        {result?.message ? (
          <div className="text-center py-4">
            <p className="text-base text-ink mb-4">{result.message}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-800 text-white font-semibold text-base transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-ink-muted">
              Confirm your account details, then explain why you believe this
              restriction should be lifted.
            </p>

            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email or username"
              required
              autoCapitalize="none"
              className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
            />
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value.slice(0, 1000))}
              placeholder="Explain your appeal (at least 10 characters)"
              rows={4}
              required
              minLength={10}
              className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition resize-none"
            />
            <p className="text-sm text-ink-muted text-right -mt-1">
              {statement.length}/1000
            </p>

            {result?.error && (
              <p className="text-sm text-red-600">{result.error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-base transition"
            >
              {submitting ? "Submitting..." : "Submit appeal"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AppealModal;
