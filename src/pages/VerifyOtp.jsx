import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { FiMail, FiRefreshCw } from "react-icons/fi";

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getMe } = useAuth();

  // Router state is the primary source (never touches the URL); session
  // storage is only a fallback so a page refresh — which clears router
  // state — doesn't strand someone mid-flow. Neither one is a security
  // control: the challengeId is just a UI handle for "which pending
  // challenge is this page showing". Every real check (rate limits,
  // attempt limits, expiry, hashed comparison) happens server-side
  // regardless of what's held here or how it got here.
  const [challengeId] = useState(
    () => location.state?.challengeId || sessionStorage.getItem("otpChallengeId") || "",
  );
  const [email] = useState(
    () => location.state?.email || sessionStorage.getItem("otpEmail") || "",
  );
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // If there's nothing to verify (cold URL open, old bookmark, stale
  // tab), there's no point showing this page — send them back to start
  // a real flow. This is purely for a sane UX; it changes nothing about
  // what the server will accept.
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
      sessionStorage.removeItem("otpChallengeId");
      sessionStorage.removeItem("otpEmail");
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
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-4">
            <FiMail className="text-primary-600 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Check your email</h2>
          <p className="text-ink-muted text-sm mt-1">
            We sent a 6-digit code to
          </p>
          <p className="text-ink font-semibold text-sm mt-0.5 break-all">{email}</p>
        </div>

        <div className="bg-card border border-stroke rounded-2xl p-6 shadow-sm space-y-4">
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl border border-stroke bg-surface text-ink text-sm tracking-widest text-center placeholder:tracking-normal placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
          />

          <button
            onClick={handleVerify}
            disabled={loading || otp.length < 6}
            className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 shadow-sm"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>

          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full flex items-center justify-center gap-2 text-ink-sub border border-stroke rounded-xl py-2.5 text-sm font-medium hover:bg-surface transition disabled:opacity-50 disabled:cursor-not-allowed"
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
