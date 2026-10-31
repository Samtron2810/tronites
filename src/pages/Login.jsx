import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import AuthLayout from "../components/AuthLayout";
import { Button, Input, FieldLabel } from "../components/ui";
import AppealModal from "../components/AppealModal";

const Login = () => {
  const navigate = useNavigate();
  const { login, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Server's rejection code ("ACCOUNT_BANNED"/"ACCOUNT_SUSPENDED") — when
  // present we swap the generic failure toast for a dedicated inline
  // panel so restricted users get a specific screen, not a vague error.
  const [errorCode, setErrorCode] = useState(null);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  // 3.1 — appeal entry point, shown only alongside the restricted panel.
  const [showAppealModal, setShowAppealModal] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  useEffect(() => {
    if (!loading && user) navigate("/home");
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorCode(null);
    try {
      await login(formData);
      toast.success("Welcome back!");
      // Navigation is handled by the useEffect watching `user` state —
      // no need for a separate setTimeout navigate here.
    } catch (error) {
      setErrorCode(error.response?.data?.code || null);
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      headline={
        <>
          Welcome <br />
          back<span className="text-primary-600">.</span>
        </>
      }
      sub="Your feed kept your seat warm."
    >
      <h2 className="mb-6 text-3xl font-extrabold tracking-[-0.03em] text-ink">
        Sign in
      </h2>

      {(errorCode === "ACCOUNT_BANNED" ||
        errorCode === "ACCOUNT_SUSPENDED") && (
        <div className="mb-6 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
          <p className="mb-0.5 text-base font-semibold text-red-600">
            {errorCode === "ACCOUNT_BANNED"
              ? "Account banned"
              : "Account suspended"}
          </p>
          <p className="text-sm leading-relaxed text-red-500">
            {errorCode === "ACCOUNT_BANNED"
              ? "This account has been permanently banned and can no longer sign in."
              : "This account is temporarily suspended. You can sign in again once the suspension ends."}
          </p>
          <button
            type="button"
            onClick={() => setShowAppealModal(true)}
            className="mt-2 text-sm font-semibold text-red-600 transition hover:text-red-800 hover:underline"
          >
            Appeal this decision
          </button>
        </div>
      )}

      {showAppealModal && (
        <AppealModal
          identifier={formData.identifier}
          onClose={() => setShowAppealModal(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FieldLabel htmlFor="login-identifier">Email or username</FieldLabel>
          <Input
            id="login-identifier"
            type="text"
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            required
            autoCapitalize="none"
            autoComplete="username"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="mono-label">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="link-amber font-mono text-xs"
            >
              Forgot it?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="pr-20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded border-[1.5px] border-line bg-card px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-ink transition hover:bg-sand"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" block loading={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between gap-3 border-t-2 border-dashed border-line pt-4 text-sm">
        <span className="text-ink-sub">New here?</span>
        <Link to="/signup" className="link-amber">
          Create an account
        </Link>
      </div>

      <p className="mt-6 text-center text-sm leading-relaxed text-ink-muted">
        By continuing, you agree to Tronites'{" "}
        <Link to="/terms" className="underline hover:text-ink">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline hover:text-ink">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthLayout>
  );
};

export default Login;
