// Mounted at /paystack-return (see App.jsx). Paystack redirects back here
// after any payment attempt with ?paystack_ref=<reference>&flow=<flow>.
//
// Flows handled:
//   promo        → POST promotion verify  → /profile/:id
//   verify       → badge payment verify   → /profile/:id
//   tip          → creator tip verify     → /profile/:id of creator
//   subscription → creator sub verify     → /profile/:id of creator
//
// "flow" param is set on the callback URL by each initiation endpoint.
// Falls back to "promo" if absent so existing promotions land correctly.
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

    const ref  = searchParams.get("paystack_ref") || searchParams.get("reference");
    const flow = searchParams.get("flow") || "promo";

    if (!ref) {
      toast.error("No payment reference found.");
      navigate(user?._id ? `/profile/${user._id}` : "/", { replace: true });
      return;
    }

    const verify = async () => {
      const home = user?._id ? `/profile/${user._id}` : "/";

      try {
        if (flow === "tip") {
          const { data } = await api.get(`/creator-monetization/tips/verify/${ref}`);
          toast.success(
            `Tip of ₦${data.amountNgn?.toLocaleString()} sent! 🎉`,
            { duration: 5000 },
          );
          // Navigate back — we don't know which creator without parsing the
          // reference, so land on home feed. The creator is notified in-app.
          navigate("/", { replace: true });
          return;
        }

        if (flow === "subscription") {
          await api.get(`/creator-monetization/subscribe/verify/${ref}`);
          toast.success(
            "Subscribed! You now have access to subscriber-only posts. 🎉",
            { duration: 5000 },
          );
          navigate("/", { replace: true });
          return;
        }

        if (flow === "verify") {
          // Badge verification payment — existing handler path
          await api.get(`/verification/paystack/verify?reference=${ref}`);
          toast.success("Payment confirmed. Verification submitted!", {
            duration: 5000,
          });
          navigate(home, { replace: true });
          return;
        }

        // Default: promo flow (legacy)
        await api.get(`/posts/promote/verify/${ref}`);
        toast.success("Post promoted! It will now surface to more people.", {
          duration: 5000,
        });
        navigate(home, { replace: true });

      } catch (e) {
        const msg =
          e.response?.data?.message ||
          "Payment verification failed. If charged, contact support.";
        toast.error(msg, { duration: 7000 });
        navigate(home, { replace: true });
      }
    };

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const FLOW_LABELS = {
    tip: "Sending your tip…",
    subscription: "Activating subscription…",
    verify: "Confirming payment…",
    promo: "Verifying payment…",
  };
  const flow = searchParams.get("flow") || "promo";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-ink-muted">
      <div className="h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">{FLOW_LABELS[flow] || "Verifying payment…"}</p>
    </div>
  );
};

export default PaystackReturnHandler;
