import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { MIN_SIGNUP_AGE } from "../constants/legal";

// Pages the gate stays out of, so someone can actually read what they're
// being asked to accept.
const LEGAL_PATHS = new Set([
  "/terms",
  "/privacy",
  "/guidelines",
  "/refunds",
  "/copyright",
]);

const pad = (n) => String(n).padStart(2, "0");

const ageFromIso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dob = new Date(y, mo - 1, d);
  if (dob.getFullYear() !== y || dob.getMonth() !== mo - 1 || dob.getDate() !== d) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - y;
  if (
    now.getMonth() < mo - 1 ||
    (now.getMonth() === mo - 1 && now.getDate() < d)
  ) {
    age -= 1;
  }
  return age;
};

// One-time prompt for accounts that predate date-of-birth collection, or
// that haven't accepted the current Terms/Privacy version. Blocks the app
// until answered. If the status check itself fails, the gate stays out of
// the way rather than locking people out.
const ComplianceGate = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [status, setStatus] = useState(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const userId = user?._id || null;
  const maxDob = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    api
      .get("/users/me/compliance")
      .then((res) => {
        if (!cancelled) setStatus({ ...res.data, userId });
      })
      .catch(() => {
        // Fail open: never lock someone out because the check errored.
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (
    !userId ||
    status?.userId !== userId ||
    !status.required ||
    LEGAL_PATHS.has(pathname)
  ) {
    return null;
  }

  const age = ageFromIso(dateOfBirth);
  const tooYoung = status.needsDateOfBirth && age !== null && age < MIN_SIGNUP_AGE;
  const dobInvalid =
    status.needsDateOfBirth &&
    dateOfBirth !== "" &&
    (age === null || age < 0 || age > 120);
  const canSubmit =
    agreed &&
    !saving &&
    !tooYoung &&
    !dobInvalid &&
    (!status.needsDateOfBirth || age !== null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.post("/users/me/compliance", {
        ...(status.needsDateOfBirth ? { dateOfBirth } : {}),
        acceptTerms: true,
      });
      setStatus({ ...status, required: false });
    } catch (error) {
      const data = error.response?.data;
      if (data?.code === "UNDERAGE") {
        toast.error(data.message);
        try {
          await logout();
        } catch {
          // cookies are already cleared server-side; fall through
        }
        window.location.assign("/");
        return;
      }
      toast.error(data?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-card border border-stroke p-6 shadow-xl"
      >
        <h2 id="compliance-title" className="text-xl font-bold text-ink mb-1">
          A quick update
        </h2>
        <p className="text-base text-ink-muted mb-5">
          {status.needsDateOfBirth
            ? "We've updated our Terms and Privacy Policy, and we now check that everyone is old enough to use Tronites."
            : "We've updated our Terms and Privacy Policy. Please review and accept them to keep using Tronites."}
        </p>

        {status.needsDateOfBirth && (
          <div className="mb-4">
            <label
              htmlFor="compliance-dob"
              className="block text-sm font-medium text-ink mb-1.5"
            >
              Date of birth
            </label>
            <input
              id="compliance-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              min="1900-01-01"
              max={maxDob}
              required
              aria-invalid={tooYoung || dobInvalid}
              aria-describedby="compliance-dob-help"
              className={`w-full px-4 py-3 rounded-xl border bg-card text-ink text-base outline-none focus:ring-2 transition ${
                tooYoung || dobInvalid
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : "border-stroke focus:border-primary-600 focus:ring-primary-100"
              }`}
            />
            <p
              id="compliance-dob-help"
              role={tooYoung || dobInvalid ? "alert" : undefined}
              className={`text-sm mt-1.5 ${
                tooYoung || dobInvalid ? "text-red-600" : "text-ink-muted"
              }`}
            >
              {tooYoung
                ? `You must be at least ${MIN_SIGNUP_AGE} to use Tronites.`
                : dobInvalid
                  ? "Enter a valid date of birth."
                  : "Used only to check your age. It's never shown on your profile and can't be changed later."}
            </p>
          </div>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer select-none mb-5">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stroke accent-primary-600"
          />
          <span className="text-sm text-ink-muted leading-snug">
            I agree to the{" "}
            <Link
              to="/terms"
              target="_blank"
              rel="noopener"
              className="text-primary-600 hover:underline"
            >
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              target="_blank"
              rel="noopener"
              className="text-primary-600 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-base transition"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
};

export default ComplianceGate;
