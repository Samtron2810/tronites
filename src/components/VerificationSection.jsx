import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { FiAward, FiClock, FiCheck, FiX } from "react-icons/fi";
import { VERIFICATION_META } from "../constants/verification";
import VerifiedBadge from "./VerifiedBadge";
import KycConsentModal from "./KycConsentModal";
import DojahKycWidget from "./DojahKycWidget";

const APPLICABLE_TYPES = ["individual", "business", "government", "creator"];

const STATUS_META = {
  pending: { label: "Under review", icon: FiClock, color: "text-amber-600 bg-amber-50" },
  approved: { label: "Approved", icon: FiCheck, color: "text-primary-700 bg-primary-50" },
  denied: { label: "Not approved", icon: FiX, color: "text-red-600 bg-red-50" },
};

const VerificationSection = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [applying, setApplying] = useState(false);
  const [type, setType] = useState("individual");
  const [entityName, setEntityName] = useState("");
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // KYC widget state (Individual badge only)
  const [pendingKycRequest, setPendingKycRequest] = useState(null); // the submitted request doc
  const [showConsent, setShowConsent] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

  const heldTypes = new Set((user?.verifications || []).map((v) => v.type));
  const requiresEntity = ["business", "government"].includes(type);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await api.get("/verification-requests/mine");
      setRequests(res.data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // A type is blocked from a fresh application if the user already holds
  // it, or already has a pending request for it — mirrors the backend's
  // own guards (409s), checked here just to keep the picker honest.
  const pendingTypes = new Set(
    requests.filter((r) => r.status === "pending").map((r) => r.type),
  );
  const availableTypes = APPLICABLE_TYPES.filter(
    (t) => !heldTypes.has(t) && !pendingTypes.has(t),
  );

  const handleSubmit = async () => {
    if (submitting) return;
    if (requiresEntity && !entityName.trim()) return;
    if (statement.trim().length < 10) {
      toast.error("Give a bit more detail in your statement (10+ characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/verification-requests", {
        type,
        entityName: entityName.trim(),
        statement: statement.trim(),
      });
      toast.success("Application submitted.");
      setApplying(false);
      setStatement("");
      setEntityName("");

      // Individual badge → launch KYC widget flow right away.
      if (type === "individual") {
        setPendingKycRequest(res.data.request);
        setShowConsent(true);
      } else {
        loadRequests();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  // Called when the user ticks consent and clicks "Continue".
  // Records consent server-side (increments KYC attempt counter) BEFORE
  // the widget launches — consent must be recorded even if widget closes.
  const handleConsent = async () => {
    await api.post("/verification-requests/kyc/initiate", {
      requestId: pendingKycRequest._id,
    });
    setShowConsent(false);
    setShowWidget(true);
  };

  const handleKycDone = (result) => {
    setShowWidget(false);
    setPendingKycRequest(null);
    loadRequests();
    if (!result.success && !result.manualReview) {
      toast.error("Verification failed. Check your details and try again.");
    }
  };

  const handleKycClose = () => {
    setShowWidget(false);
    setPendingKycRequest(null);
    loadRequests();
    toast("Verification cancelled.", { icon: "ℹ️" });
  };

  return (
    <section className="bg-card border border-stroke rounded-2xl p-5 mt-4">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-ink flex items-center gap-2">
          <FiAward size={16} className="text-primary-600" />
          Verification
        </h2>
      </div>
      <p className="text-sm text-ink-muted mb-4">
        Each badge confirms one specific, checked claim about your account
        — never generic importance.
      </p>

      {/* Held badges */}
      {(user?.verifications || []).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {user.verifications.map((v) => {
            const m = VERIFICATION_META[v.type];
            if (!m) return null;
            return (
              <span
                key={v.type}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink bg-surface rounded-full px-3 py-1.5"
              >
                <VerifiedBadge type={v.type} verifiedAt={v.verifiedAt} entityName={v.entityName} size="sm" />
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Past/pending requests */}
      {!loadingRequests && requests.length > 0 && (
        <div className="space-y-2 mb-4">
          {requests.map((r) => {
            const sm = STATUS_META[r.status];
            const Icon = sm.icon;
            const m = VERIFICATION_META[r.type];
            return (
              <div
                key={r._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stroke px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{m?.label || r.type}</p>
                  {r.status === "denied" && r.decisionNote && (
                    <p className="text-sm text-ink-muted truncate">{r.decisionNote}</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full shrink-0 ${sm.color}`}
                >
                  <Icon size={11} />
                  {sm.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!applying ? (
        availableTypes.length > 0 ? (
          <button
            onClick={() => {
              setType(availableTypes[0]);
              setApplying(true);
            }}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Apply for a badge
          </button>
        ) : (
          <p className="text-sm text-ink-muted">
            No new badge types available to apply for right now.
          </p>
        )
      ) : (
        <div className="rounded-xl border border-stroke p-4">
          <label className="block text-sm font-medium text-ink-sub mb-1.5">
            Badge type
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {availableTypes.map((t) => {
              const m = VERIFICATION_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                    type === t
                      ? "border-primary-500 bg-primary-50"
                      : "border-stroke hover:bg-surface"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-sm font-medium text-ink">
                    {m.label.replace("Verified ", "")}
                  </span>
                </button>
              );
            })}
          </div>

          {requiresEntity && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-ink-sub mb-1.5">
                Entity name (required)
              </label>
              <input
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g. Kabu Foods Ltd"
                maxLength={120}
                className="w-full border border-stroke rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card"
              />
            </div>
          )}

          <label className="block text-sm font-medium text-ink-sub mb-1.5">
            Why should this account get this badge?
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Explain your case — links, context, or anything a reviewer should know."
            className="w-full border border-stroke rounded-xl px-3 py-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card resize-none mb-3"
          />

          <div className="flex gap-3">
            <button
              onClick={() => setApplying(false)}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (requiresEntity && !entityName.trim()) || statement.trim().length < 10}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-base font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Submitting..." : "Submit application"}
            </button>
          </div>
        </div>
      )}

      {/* KYC modals — Individual badge only */}
      {showConsent && pendingKycRequest && (
        <KycConsentModal
          onConsent={handleConsent}
          onCancel={() => {
            setShowConsent(false);
            setPendingKycRequest(null);
            loadRequests();
          }}
        />
      )}

      {showWidget && pendingKycRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <DojahKycWidget
              verificationRequest={pendingKycRequest}
              user={user}
              onDone={handleKycDone}
              onClose={handleKycClose}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default VerificationSection;
