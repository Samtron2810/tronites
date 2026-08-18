import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import { FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const Login = () => {
  const navigate = useNavigate();
  const { login, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ identifier: "", password: "" });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  useEffect(() => {
    if (!loading && user) navigate("/");
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await login(formData);
      toast.success("Welcome back!");
      setTimeout(() => navigate("/"), 800);
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary-600 flex-col justify-between p-12">
        <span className="text-white font-bold text-2xl tracking-tight">
          Tron<span className="text-primary-200">ites</span>
        </span>
        <div>
          <p className="text-primary-100 text-4xl font-bold leading-tight max-w-xs">
            Connect with your community.
          </p>
          <p className="text-primary-200 mt-4 text-base leading-relaxed max-w-sm">
            Share posts, follow people, and stay in the loop with what matters
            to you.
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

          <h2 className="text-2xl font-bold text-ink mb-1">Sign in</h2>
          <p className="text-ink-muted text-sm mb-8">
            Welcome back. Good to see you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm" />
              <input
                type="text"
                name="identifier"
                placeholder="Email or username"
                value={formData.identifier}
                onChange={handleChange}
                required
                autoCapitalize="none"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-stroke bg-white text-ink text-sm placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
            </div>

            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-stroke bg-white text-ink text-sm placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink transition"
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>

            <div className="flex justify-end -mt-1">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline transition"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-ink-muted text-sm mt-6">
            No account?{" "}
            <Link
              to="/signup"
              className="text-primary-600 font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
