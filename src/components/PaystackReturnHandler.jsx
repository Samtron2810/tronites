// Mounted at /paystack-return (see App.jsx). Paystack redirects back here
// after a payment attempt with ?paystack_ref=<reference> in the URL.
// We call /posts/promote/verify/:reference to apply the promotion, show a
// result toast, then navigate the user to their profile.
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";

const PaystackReturnHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const didRun = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-fire
    if (didRun.current) return;
    didRun.current = true;

    const ref = searchParams.get("paystack_ref") || searchParams.get("reference");

    if (!ref) {
      toast.error("No payment reference found.");
      navigate(user?._id ? `/profile/${user._id}` : "/", { replace: true });
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/posts/promote/verify/${ref}`);
        toast.success("Post promoted! It will now surface to more people.", {
          duration: 5000,
        });
      } catch (e) {
        const msg =
          e.response?.data?.message ||
          "Payment verification failed. If charged, contact support.";
        toast.error(msg, { duration: 7000 });
      } finally {
        // Always land back on own profile so they can see the promoted post
        navigate(user?._id ? `/profile/${user._id}` : "/", { replace: true });
      }
    };

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-ink-muted">
      <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Verifying payment…</p>
    </div>
  );
};

export default PaystackReturnHandler;
