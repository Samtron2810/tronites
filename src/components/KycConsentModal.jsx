import { useState } from "react";
import { FiShield, FiX, FiExternalLink } from "react-icons/fi";
import useBackButtonClose from "../hooks/useBackButtonClose";

// KYC CONSENT MODAL (Phase 3)
// Shown to the user BEFORE the Dojah widget is launched. This screen is
// a legal requirement under NDPR (Nigeria Data Protection Regulation),
// not a UX flourish — a user must give informed, specific consent before
// their identity document and biometric data flow to any sub-processor.
//
// What this screen discloses (per NDPR Article 2.2 and 2.3):
//   • The categories of data being collected (NIN, liveness photo)
//   • The sub-processor handling it (Dojah Technologies Ltd)
//   • Why it's being collected (to confirm a specific identity claim)
//   • That raw data is NOT stored by Tronites
//   • That consent is freely withdrawable (by not ticking the box)
//
// The ticked-checkbox state is sent to the backend (POST /verification-
// requests/kyc/initiate) BEFORE the widget opens, so consent is
// recorded even if the user closes the widget mid-flow.
const KycConsentModal = ({ onConsent, onCancel }) => {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useBackButtonClose(true, onCancel);

  const handleProceed = async () => {
    if (!agreed || submitting) return;
    setSubmitting(true);
    try {
      await onConsent();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <FiShield size={16} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Identity verification
              </h2>
              <p className="text-sm text-ink-muted">
                Before we continue, please read this carefully.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-surface text-ink-muted"
            aria-label="Cancel"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="space-y-4 text-sm text-ink-muted leading-relaxed">
          <div className="bg-surface rounded-xl p-4 space-y-3">
            <p className="font-medium text-ink">What will be collected</p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>Your NIN (National Identification Number) or BVN</li>
              <li>A liveness photo for face-match verification</li>
            </ul>
          </div>

          <div className="bg-surface rounded-xl p-4 space-y-3">
            <p className="font-medium text-ink">Who processes this data</p>
            <p>
              Your identity data is processed by{" "}
              <a
                href="https://dojah.io/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline inline-flex items-center gap-0.5"
              >
                Dojah Technologies Ltd <FiExternalLink size={11} />
              </a>{" "}
              — a licensed KYC sub-processor. They verify your identity
              against NIMC and CBN records.
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4 space-y-3">
            <p className="font-medium text-ink">What Tronites stores</p>
            <p>
              Tronites <strong className="text-ink">never</strong> stores your
              NIN, BVN, document scans, or biometric images. We only receive a
              pass/fail result and an opaque reference ID from Dojah. Your raw
              identity data stays with Dojah and NIMC.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-[13px]">
            <strong>Note:</strong> If using NIN, you'll need a Virtual NIN
            (VNIN) from the NIMC app or by dialling *346#. VNINs expire after
            72 hours.
          </div>

          <p>
            You can withdraw consent at any time by not completing the process.
            Already-submitted data held by Dojah is subject to{" "}
            <a
              href="https://dojah.io/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Dojah's privacy policy
            </a>
            . See Tronites'{" "}
            <a
              href="/privacy"
              className="text-primary-600 hover:underline"
            >
              Privacy Policy
            </a>{" "}
            §&nbsp;Identity Verification for full details.
          </p>
        </div>

        {/* Explicit consent checkbox — NDPR requires this to be
            unbundled from other consents and freely given. */}
        <label className="flex items-start gap-3 mt-5 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary-600 shrink-0 cursor-pointer"
          />
          <span className="text-sm text-ink leading-relaxed">
            I understand that my NIN/BVN and a liveness photo will be sent to
            Dojah Technologies Ltd for identity verification, and I freely
            consent to this processing for the purpose of obtaining a Tronites
            Individual verification badge.
          </span>
        </label>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={!agreed || submitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-base font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Recording consent…" : "Continue to verification"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KycConsentModal;
