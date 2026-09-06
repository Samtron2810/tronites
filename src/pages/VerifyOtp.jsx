import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { FiMail, FiRefreshCw } from "react-icons/fi";

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getMe, user, loading: authLoading } = useAuth();

  // Router state is the primary source (never touches the URL); session
  // storage is only a fallback so a page refresh — which clears router
  // state — doesn't strand someone mid-flow. Namespaced keys prevent
  // collision with the reset-password flow which uses its own keys.
  const [challengeId] = useState(
    () => location.state?.challengeId || sessionStorage.getItem("otp:register:challengeId") || "",
  );
  const [email] = useState(
    () => location.state?.email || sessionStorage.getItem("otp:register:email") || "",
  );
  // _duplicate flag from the server (via router state): the email was
  // already registered. No real OTP was sent; show a helpful sign-in hint.
  const [isDuplicate] = useState(() => !!location.state?.duplicate);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Bug 7 fix: redirect already-logged-in users away (matches guard on
  // Login, Register, ForgotPassword, ResetPassword).
  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  // If there's nothing to verify (cold URL open, old bookmark, stale
  // tab), send them back to start a real flow.
  useEffect(() => {
    if (!challengeId) {
      toast.error("Please start by creating an account or logging in.");
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { challengeId, otp });
      sessionStorage.removeItem("otp:register:challengeId");
      sessionStorage.removeItem("otp:register:email");
      await getMe();
      toast.success("Verified. Welcome!");
      navigate("/choose-username");
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendLoading) return;
    setResendLoading(true);
    try {
      await api.post("/auth/resend-otp", { challengeId });
      toast.success("OTP resent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Resend failed");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-4">
            <FiMail className="text-primary-600 text-3xl" />
          </div>
          <h2 className="text-3xl font-bold text-ink">Check your email</h2>
          <p className="text-ink-muted text-base mt-1">
            We sent a 6-digit code to
          </p>
          <p className="text-ink font-semibold text-base mt-0.5 break-all">{email}</p>
        </div>

        {isDuplicate && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-700 mb-0.5">This email is already registered</p>
            <p className="text-sm text-amber-600 leading-relaxed">
              No code was sent. You can{" "}
              <Link to="/login" className="font-semibold underline hover:text-amber-800">
                sign in
              </Link>{" "}
              or{" "}
              <Link to="/forgot-password" className="font-semibold underline hover:text-amber-800">
                reset your password
              </Link>{" "}
              instead.
            </p>
          </div>
        )}

        <div className="bg-card border border-stroke rounded-2xl p-6 shadow-sm space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl border border-stroke bg-surface text-ink text-base tracking-widest text-center placeholder:tracking-normal placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
          />

          <button
            onClick={handleVerify}
            disabled={loading || otp.length < 6}
            className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-base transition-all duration-200 shadow-sm"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>

          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full flex items-center justify-center gap-2 text-ink-sub border border-stroke rounded-xl py-2.5 text-base font-medium hover:bg-surface transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRefreshCw className={resendLoading ? "animate-spin" : ""} size={14} />
            {resendLoading ? "Resending..." : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
