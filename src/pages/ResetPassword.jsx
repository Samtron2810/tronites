import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import {
  FiLock,
  FiEye,
  FiEyeOff,
  FiMail,
  FiRefreshCw,
  FiArrowLeft,
} from "react-icons/fi";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Same pattern as VerifyOtp: router state is the primary source;
  // sessionStorage is only a fallback so a page refresh doesn't strand
  // someone mid-flow. Neither is a security control — the server
  // enforces everything via the challengeId.
  const [challengeId] = useState(
    () =>
      location.state?.challengeId ||
      sessionStorage.getItem("otpChallengeId") ||
      "",
  );
  const [email] = useState(
    () => location.state?.email || sessionStorage.getItem("otpEmail") || "",
  );
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // No challenge in progress — send them back to start a real flow.
  useEffect(() => {
    if (!challengeId) {
      toast.error("Please start by requesting a password reset.");
      navigate("/forgot-password", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Already signed in — nothing to recover.
  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    otp.length === 6 &&
    password.length >= 10 &&
    confirmPassword.length >= 10 &&
    passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        challengeId,
        otp,
        newPassword: password,
      });

      sessionStorage.removeItem("otpChallengeId");
      sessionStorage.removeItem("otpEmail");

      toast.success("Password reset successful. Please sign in.");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    try {
      await api.post("/auth/resend-otp", { challengeId });
      toast.success("Code resent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Resend failed");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen app-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary-600 flex-col justify-between p-12">
        <span className="text-white font-bold text-2xl tracking-tight">
          Tron<span className="text-primary-200">ites</span>
        </span>
        <div>
          <p className="text-primary-100 text-4xl font-bold leading-tight max-w-xs">
            Almost there.
          </p>
          <p className="text-primary-200 mt-4 text-base leading-relaxed max-w-sm">
            Enter the code we sent you, then choose a new password.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-400" />
          <div className="w-8 h-8 rounded-full bg-primary-200" />
          <div className="w-8 h-8 rounded-full bg-white/30" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <span className="text-ink font-bold text-3xl">
              Tron<span className="text-primary-600">ites</span>
            </span>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-4">
              <FiMail className="text-primary-600 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-ink">Check your email</h2>
            <p className="text-ink-muted text-sm mt-1">
              We sent a 6-digit code to
            </p>
            <p className="text-ink font-semibold text-sm mt-0.5 break-all">
              {email}
            </p>
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

            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-stroke bg-surface text-ink text-sm placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition"
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            <p className="text-xs text-ink-muted -mt-3 pl-1">
              At least 10 characters.
            </p>

            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={10}
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-stroke bg-surface text-ink text-sm placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition"
              >
                {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-500 -mt-3 pl-1">
                Passwords do not match.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 shadow-sm"
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </button>

            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full flex items-center justify-center gap-2 text-ink-sub border border-stroke rounded-xl py-2.5 text-sm font-medium hover:bg-surface transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiRefreshCw
                className={isResending ? "animate-spin" : ""}
                size={14}
              />
              {isResending ? "Resending..." : "Resend code"}
            </button>
          </div>

          <p className="text-center text-ink-muted text-sm mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-primary-600 font-semibold hover:underline"
            >
              <FiArrowLeft size={14} />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
