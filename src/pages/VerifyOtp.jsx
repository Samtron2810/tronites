import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const VerifyOtp = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getMe } = useAuth();

  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery]);

  const handleVerify = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.post("/auth/verify-otp", { email, otp });

      // refresh auth state
      await getMe();

      toast.success("Verified — welcome!");
      navigate("/");
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
      await api.post("/auth/resend-otp", { email });
      toast.success("OTP resent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Resend failed");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-400 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-4">Verify OTP</h1>

        <div className="space-y-4">
          <div className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 text-gray-700">
            <p className="text-sm text-gray-500">6-digit OTP sent to </p>
            <p className="mt-1 text-base font-medium break-all">{email}</p>
          </div>

          <input
            type="text"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-blue-500"
          />

          <button
            onClick={handleVerify}
            disabled={loading}
            className={`w-full text-white font-semibold py-3 rounded-lg transition duration-200 ${
              loading
                ? "bg-blue-300 cursor-not-allowed opacity-70"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>

          <button
            onClick={handleResend}
            disabled={resendLoading}
            className={`w-full text-gray-700 border rounded-lg py-2 ${
              resendLoading
                ? "opacity-60 cursor-not-allowed"
                : "hover:bg-gray-100"
            }`}
          >
            {resendLoading ? "Resending..." : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
