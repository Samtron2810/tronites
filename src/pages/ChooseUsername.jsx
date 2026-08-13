import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { FiHash, FiCheck, FiX, FiLoader } from "react-icons/fi";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const ChooseUsername = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | available | taken | invalid
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const clean = username.trim().toLowerCase();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!clean) {
      setStatus("idle");
      return;
    }
    if (!USERNAME_RE.test(clean)) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/users/check-username", {
          params: { username: clean },
        });
        setStatus(res.data.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [username]);

  const handleSubmit = async () => {
    if (status !== "available" || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.put("/users/username", {
        username: username.trim().toLowerCase(),
      });
      updateUser({ username: res.data.user.username });
      toast.success("Username set!");
      navigate("/");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to set username";
      toast.error(msg);
      if (error.response?.status === 409) setStatus("taken");
    } finally {
      setSubmitting(false);
    }
  };

  const statusIcon = {
    idle: null,
    checking: <FiLoader className="animate-spin text-ink-muted" size={16} />,
    available: <FiCheck className="text-green-500" size={16} />,
    taken: <FiX className="text-red-500" size={16} />,
    invalid: <FiX className="text-red-500" size={16} />,
  }[status];

  const statusMessage = {
    idle: "3-20 characters: lowercase letters, numbers, underscores",
    checking: "Checking availability...",
    available: "Username is available",
    taken: "That username is already taken",
    invalid: "3-20 chars: lowercase letters, numbers, underscores only",
  }[status];

  const statusColor = {
    idle: "text-ink-muted",
    checking: "text-ink-muted",
    available: "text-green-600",
    taken: "text-red-500",
    invalid: "text-red-500",
  }[status];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-4">
            <FiHash className="text-primary-600 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Choose your username</h2>
          <p className="text-ink-muted text-sm mt-1">
            This is how people will find and mention you
          </p>
        </div>

        <div className="bg-white border border-stroke rounded-2xl p-6 shadow-sm space-y-4">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-medium">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              placeholder="username"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full pl-8 pr-10 py-3 rounded-xl border border-stroke bg-surface text-ink text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {statusIcon}
            </span>
          </div>

          <p className={`text-xs ${statusColor}`}>{statusMessage}</p>

          <button
            onClick={handleSubmit}
            disabled={status !== "available" || submitting}
            className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 shadow-sm"
          >
            {submitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseUsername;
