import { useState, useEffect, useRef } from "react";
import Dojah from "react-dojah";
import { FiCheckCircle, FiAlertCircle, FiClock } from "react-icons/fi";

// DOJAH KYC WIDGET (Phase 3)
// Wraps react-dojah, passes reference_id = verificationRequest._id so
// the backend webhook can look up the right request. Handles success,
// error, and close events and transitions to a result screen. Then polls
// for the actual badge grant (the webhook is async — the widget closing
// doesn't mean the badge is live yet).
//
// Props:
//   verificationRequest  — the VerificationRequest document from the backend
//   user                 — current user (first_name, last_name for pre-fill)
//   onDone(result)       — called when the widget flow is finished (success
//                          or error), result = { success, autoApproved? }
//   onClose              — called when the user closes without completing

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // 60 seconds total

const DojahKycWidget = ({ verificationRequest, user, onDone, onClose }) => {
  const [widgetState, setWidgetState] = useState("loading"); // loading | open | success | manual_review | error
  const pollRef = useRef(null);
  const pollCount = useRef(0);

  const DOJAH_APP_ID = import.meta.env.VITE_DOJAH_APP_ID;
  const DOJAH_PUBLIC_KEY = import.meta.env.VITE_DOJAH_PUBLIC_KEY;

  // Poll the backend until the badge appears on the user or the max
  // attempts are exhausted. Auto-approve via webhook is async — the
  // widget may have already closed before Dojah fires the webhook.
  const startPolling = () => {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      try {
        const res = await fetch("/api/verification-requests/mine", {
          credentials: "include",
        });
        const data = await res.json();
        const thisRequest = (data.requests || []).find(
          (r) => r._id === verificationRequest._id,
        );
        if (!thisRequest) {
          clearInterval(pollRef.current);
          return;
        }
        if (thisRequest.status === "approved") {
          clearInterval(pollRef.current);
          setWidgetState("success");
          onDone({ success: true, autoApproved: true });
          return;
        }
        if (thisRequest.kycStatus === "manual_review") {
          clearInterval(pollRef.current);
          setWidgetState("manual_review");
          onDone({ success: false, manualReview: true });
          return;
        }
        if (thisRequest.kycStatus === "failed") {
          clearInterval(pollRef.current);
          setWidgetState("error");
          onDone({ success: false });
          return;
        }
      } catch {
        // Network error during poll — keep trying until max attempts.
      }
      if (pollCount.current >= POLL_MAX_ATTEMPTS) {
        clearInterval(pollRef.current);
        // Timed out — likely under manual review.
        setWidgetState("manual_review");
        onDone({ success: false, manualReview: true });
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleResponse = (type, data) => {
    if (type === "loading") {
      setWidgetState("loading");
      return;
    }
    if (type === "begin") {
      setWidgetState("open");
      return;
    }
    if (type === "success") {
      // Widget reported success — start polling for badge grant.
      setWidgetState("loading");
      startPolling();
      return;
    }
    if (type === "error") {
      setWidgetState("error");
      onDone({ success: false, error: data });
      return;
    }
    if (type === "close") {
      // User closed without completing.
      if (widgetState !== "success" && widgetState !== "manual_review") {
        onClose();
      }
    }
  };

  // Dojah widget config — NIN + liveness (face). No BVN by default for
  // the Individual badge, since NIN + face is the most reliable signal.
  // To enable BVN instead: set bvn: true, nin: false.
  const config = {
    debug: import.meta.env.DEV,
    pages: [
      {
        page: "government-data",
        config: {
          nin: true,
          bvn: false,
          dl: false,
          mobile: false,
          otp: true,
          selfie: true,
        },
      },
      { page: "selfie" },
    ],
  };

  const userData = {
    first_name: user?.name?.split(" ")[0] || "",
    last_name: user?.name?.split(" ").slice(1).join(" ") || "",
  };

  // metadata.reference_id = our VerificationRequest._id so the webhook
  // can look up the correct request. This is the ONLY user-data linkage
  // we pass; no email, phone, or other PII.
  const metadata = {
    reference_id: verificationRequest._id,
    user_id: user?._id,
  };

  if (widgetState === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <FiCheckCircle size={40} className="text-primary-600" />
        <p className="text-lg font-semibold text-ink">Verification successful</p>
        <p className="text-sm text-ink-muted max-w-xs">
          Your Individual badge has been granted and is now showing on your profile.
        </p>
      </div>
    );
  }

  if (widgetState === "manual_review") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <FiClock size={40} className="text-amber-500" />
        <p className="text-lg font-semibold text-ink">Under review</p>
        <p className="text-sm text-ink-muted max-w-xs">
          Your verification is being reviewed by the Tronites team. This
          usually takes 1–3 business days. You'll get a notification when it's done.
        </p>
      </div>
    );
  }

  if (widgetState === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <FiAlertCircle size={40} className="text-red-500" />
        <p className="text-lg font-semibold text-ink">Verification failed</p>
        <p className="text-sm text-ink-muted max-w-xs">
          We couldn't verify your identity. Please check that your NIN/VNIN is
          correct and try again. If the problem persists, contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[300px] flex items-center justify-center">
      {widgetState === "loading" && (
        <p className="text-sm text-ink-muted animate-pulse">
          Loading verification widget…
        </p>
      )}
      <Dojah
        response={handleResponse}
        appID={DOJAH_APP_ID}
        publicKey={DOJAH_PUBLIC_KEY}
        type="verification"
        config={config}
        userData={userData}
        metadata={metadata}
      />
    </div>
  );
};

export default DojahKycWidget;
