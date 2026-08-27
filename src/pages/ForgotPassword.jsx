import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import { FiMail, FiArrowLeft } from "react-icons/fi";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Already signed in — nothing to recover.
  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });

      toast.success(
        res.data.message || "If this address is registered, we've sent a code.",
      );

      // challengeId is an opaque, server-issued, single-use handle — not
      // the email itself, and not a security control on its own. It just
      // lets ResetPassword know which pending challenge to show without
      // putting an email address in the URL. Same pattern as Register.jsx.
      sessionStorage.setItem("otpChallengeId", res.data.challengeId);
      sessionStorage.setItem("otpEmail", res.data.email);

      navigate("/reset-password", {
        state: { challengeId: res.data.challengeId, email: res.data.email },
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary-600 flex-col justify-between p-12">
        <span className="text-white font-bold text-3xl tracking-tight">
          Tron<span className="text-primary-200">ites</span>
        </span>
        <div>
          <p className="text-primary-100 text-5xl font-bold leading-tight max-w-xs">
            We'll get you back in.
          </p>
          <p className="text-primary-200 mt-4 text-lg leading-relaxed max-w-sm">
            Enter your account email and we'll send you a code to reset your
            password.
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
            <span className="text-ink font-bold text-4xl">
              Tron<span className="text-primary-600">ites</span>
            </span>
          </div>

          <h2 className="text-3xl font-bold text-ink mb-1">
            Forgot your password?
          </h2>
          <p className="text-ink-muted text-base mb-8">
            Enter your email and we'll send you a code to reset it.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoCapitalize="none"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-base transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {isLoading ? "Sending..." : "Send reset code"}
            </button>
          </form>

          <p className="text-center text-ink-muted text-base mt-6">
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

export default ForgotPassword;
