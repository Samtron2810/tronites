import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import AuthLayout from "../components/AuthLayout";
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
      sessionStorage.getItem("otp:reset:challengeId") ||
      "",
  );
  const [email] = useState(
    () => location.state?.email || sessionStorage.getItem("otp:reset:email") || "",
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
    if (!loading && user) navigate("/home");
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

      sessionStorage.removeItem("otp:reset:challengeId");
      sessionStorage.removeItem("otp:reset:email");

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
    <AuthLayout
      size="xl"
      headline={<>Almost <br />there<span className="text-primary-600">.</span></>}
      sub="Enter the code we sent you, then choose a new password."
    >

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-4">
              <FiMail className="text-primary-600 text-3xl" />
            </div>
            <h2 className="text-3xl font-bold text-ink">Check your email</h2>
            <p className="text-ink-muted text-base mt-1">
              We sent a 6-digit code to
            </p>
            <p className="text-ink font-semibold text-base mt-0.5 break-all">
              {email}
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              className="field px-4"
            />

            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                className="field pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition"
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            <p className="text-sm text-ink-muted -mt-3 pl-1">
              At least 10 characters.
            </p>

            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={10}
                className="field pl-10 pr-10"
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
              <p className="text-sm text-red-500 -mt-3 pl-1">
                Passwords do not match.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="btn btn-primary btn-lg btn-block"
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </button>

            <button
              onClick={handleResend}
              disabled={isResending}
              className="btn btn-block"
            >
              <FiRefreshCw
                className={isResending ? "animate-spin" : ""}
                size={14}
              />
              {isResending ? "Resending..." : "Resend code"}
            </button>
          </div>

          <p className="text-center text-ink-muted text-base mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 link-amber"
            >
              <FiArrowLeft size={14} />
              Back to sign in
            </Link>
          </p>
    </AuthLayout>
  );
};

export default ResetPassword;
