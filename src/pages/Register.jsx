import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const Register = () => {
  const navigate = useNavigate();
  const { register, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  // Strips characters the backend would reject anyway (digits, most
  // symbols) as the user types. Allows Unicode letters/marks plus
  // apostrophes, hyphens, and spaces â€” O'Brien, Mary-Jane, AdÃ©á»lÃ¡, etc.
  const NAME_STRIP_PATTERN = /[^\p{L}\p{M}' -]/gu;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      setFormData({ ...formData, [name]: value.replace(NAME_STRIP_PATTERN, "") });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await register(formData);
      toast.success(res.message || "OTP sent to your email");
      // challengeId is an opaque, server-issued, single-use handle â€” not
      // the email itself, and not a security control on its own. It just
      // lets VerifyOtp know which pending challenge to show without
      // putting an email address in the URL. All real enforcement
      // (attempt limits, expiry, hashed comparison) happens server-side
      // regardless of what's carried here. Router state avoids the URL
      // entirely; sessionStorage is only a fallback so a page refresh
      // (which clears router state) doesn't strand the user.
      sessionStorage.setItem("otpChallengeId", res.challengeId);
      sessionStorage.setItem("otpEmail", res.email);
      navigate("/verify-otp", {
        state: { challengeId: res.challengeId, email: res.email },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
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
            Your voice. Your community.
          </p>
          <p className="text-primary-200 mt-4 text-lg leading-relaxed max-w-sm">
            Join thousands already sharing moments, ideas, and conversations.
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

          <h2 className="text-3xl font-bold text-ink mb-1">Create account</h2>
          <p className="text-ink-muted text-base mb-8">Join the community today.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={30}
                  pattern="[\p{L}\p{M}][\p{L}\p{M}' -]*"
                  title="Letters, apostrophes, hyphens, and spaces only"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
                />
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  minLength={2}
                  maxLength={30}
                  pattern="[\p{L}\p{M}][\p{L}\p{M}' -]*"
                  title="Letters, apostrophes, hyphens, and spaces only"
                  className="w-full pl-4 pr-4 py-3 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
                />
              </div>
            </div>

            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
            </div>

            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={10}
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-stroke bg-card text-ink text-base placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition"
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            <p className="text-sm text-ink-muted -mt-2 pl-1">At least 10 characters.</p>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-base transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-ink-muted text-base mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-ink-muted text-sm mt-8 leading-relaxed">
            By creating an account, you agree to Tronites'{" "}
            <Link to="/terms" className="text-primary-600 hover:underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
