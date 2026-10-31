import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import AuthLayout from "../components/AuthLayout";
import api from "../services/api";
import { FiMail, FiArrowLeft } from "react-icons/fi";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Already signed in — nothing to recover.
  useEffect(() => {
    if (!loading && user) navigate("/home");
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
      sessionStorage.setItem("otp:reset:challengeId", res.data.challengeId);
      sessionStorage.setItem("otp:reset:email", res.data.email);

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
    <AuthLayout
      size="xl"
      headline={<>We'll get you <br />back in<span className="text-primary-600">.</span></>}
      sub="Enter your account email and we'll send you a code to reset your password."
    >

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
                className="field pl-10 pr-4"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-lg btn-block"
            >
              {isLoading ? "Sending..." : "Send reset code"}
            </button>
          </form>

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

export default ForgotPassword;
