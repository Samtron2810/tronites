import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import {
  FiAward,
  FiClock,
  FiCheck,
  FiX,
  FiChevronRight,
  FiChevronLeft,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiExternalLink,
  FiCreditCard,
  FiLock,
} from "react-icons/fi";
import { VERIFICATION_META } from "../constants/verification";
import VerifiedBadge from "./VerifiedBadge";

const APPLICABLE_TYPES = ["individual", "business", "government", "creator"];

const CATEGORIES = [
  "Content Creator",
  "Journalist / Media",
  "Musician / Artist",
  "Athlete / Sports",
  "Business / Brand",
  "Government / Official",
  "Academic / Researcher",
  "Public Figure",
  "Other",
];

const STATUS_META = {
  pending: {
    label: "Under review",
    icon: FiClock,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  approved: {
    label: "Approved",
    icon: FiCheckCircle,
    color: "text-primary-700 bg-primary-50 border-primary-200",
  },
  denied: {
    label: "Not approved",
    icon: FiX,
    color: "text-red-600 bg-red-50 border-red-200",
  },
};

const TYPE_DESCRIPTIONS = {
  individual:
    "Confirms this is a real, uniquely identified person — journalists, public figures, creators.",
  business:
    "Confirms this is the official account of a registered business or organisation.",
  government:
    "Confirms this is an official government body, agency, or public institution.",
  creator:
    "Confirms notable creators and public figures who already hold an Individual badge.",
};

const ACCOUNT_MIN_AGE_DAYS = 30;
const LAST_LOGIN_MAX_MS = 180 * 24 * 60 * 60 * 1000;

const useEligibility = (user) => {
  const checks = [
    { id: "username", label: "Username set", ok: Boolean(user?.username) },
    { id: "bio", label: "Bio added", ok: Boolean(user?.bio?.trim()) },
    { id: "photo", label: "Profile photo uploaded", ok: Boolean(user?.profilePic) },
    { id: "public", label: "Account is public", ok: !user?.isPrivate },
    {
      id: "age",
      label: "Account is at least 30 days old",
      ok: user?.createdAt
        ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24) >=
          ACCOUNT_MIN_AGE_DAYS
        : false,
    },
    {
      id: "login",
      label: "Logged in within the last 6 months",
      ok: user?.lastLoginAt
        ? Date.now() - new Date(user.lastLoginAt).getTime() <= LAST_LOGIN_MAX_MS
        : false,
    },
  ];
  return { checks, allMet: checks.every((c) => c.ok) };
};

// ── Step: Requirements checklist ─────────────────────────────────────
const StepEligibility = ({ checks, allMet, onProceed }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-base font-semibold text-ink mb-0.5">Requirements</h3>
      <p className="text-sm text-ink-muted">All must be met before applying.</p>
    </div>
    <div className="rounded-xl border border-stroke overflow-hidden divide-y divide-stroke">
      {checks.map((c) => (
        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
          {c.ok ? (
            <FiCheckCircle size={16} className="text-primary-600 shrink-0" />
          ) : (
            <FiAlertCircle size={16} className="text-amber-500 shrink-0" />
          )}
          <span className={`text-sm ${c.ok ? "text-ink" : "text-ink-muted"}`}>{c.label}</span>
        </div>
      ))}
    </div>
    {!allMet && (
      <p className="text-[12px] text-ink-muted">Complete the requirements above to apply.</p>
    )}
    {allMet && (
      <button
        onClick={onProceed}
        className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white transition flex items-center justify-center gap-1.5"
      >
        Choose a badge <FiChevronRight size={16} />
      </button>
    )}
  </div>
);

// ── Step: Badge type picker ───────────────────────────────────────────
const StepType = ({ availableTypes, selectedType, onSelect, onNext, feeInfo }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-base font-semibold text-ink mb-0.5">Choose a badge type</h3>
      <p className="text-sm text-ink-muted">Each badge confirms a specific claim.</p>
    </div>
    <div className="space-y-2">
      {availableTypes.map((t) => {
        const m = VERIFICATION_META[t];
        const selected = selectedType === t;
        const fee = feeInfo[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(t)}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
              selected ? "border-primary-500 bg-primary-50" : "border-stroke hover:bg-surface"
            }`}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white"
              style={{
                backgroundColor: m.color,
                boxShadow: selected ? `0 0 0 2px ${m.color}40` : "none",
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${selected ? "text-primary-700" : "text-ink"}`}>
                  {m.label}
                </p>
                {fee?.requiresPayment && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                    ₦{fee.feeNgn?.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-ink-muted leading-snug mt-0.5">
                {TYPE_DESCRIPTIONS[t]}
              </p>
            </div>
            {selected && <FiCheck size={15} className="text-primary-600 shrink-0" />}
          </button>
        );
      })}
    </div>
    <button
      onClick={onNext}
      disabled={!selectedType}
      className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
    >
      Continue <FiChevronRight size={16} />
    </button>
  </div>
);

// ── Step: Paystack payment (business only) ────────────────────────────
const StepPayment = ({ feeNgn, onInitiate, onBack, initiating, paid, paymentId }) => {
  if (paid) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
            <FiCheckCircle size={24} className="text-primary-600" />
          </div>
          <p className="text-base font-semibold text-ink text-center">Payment confirmed</p>
          <p className="text-sm text-ink-muted text-center">
            Your ₦{feeNgn?.toLocaleString()} payment was verified. Continue to fill in your details.
          </p>
        </div>
        <button
          onClick={() => onInitiate(true)}
          className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white transition flex items-center justify-center gap-1.5"
        >
          Continue to application <FiChevronRight size={16} />
        </button>
        <button onClick={onBack} className="w-full text-sm text-ink-muted hover:text-ink transition">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink mb-0.5">Payment required</h3>
        <p className="text-sm text-ink-muted">
          The Business badge requires a one-time application fee.
        </p>
      </div>

      <div className="rounded-xl border border-stroke bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">Business badge application</span>
          <span className="text-sm font-semibold text-ink">
            ₦{feeNgn?.toLocaleString() ?? "—"}
          </span>
        </div>
        <div className="h-px bg-stroke" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Total</span>
          <span className="text-base font-bold text-ink">₦{feeNgn?.toLocaleString() ?? "—"}</span>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 text-[13px] text-amber-800">
        <FiInfo size={14} className="shrink-0 mt-0.5" />
        <p>
          This fee covers the review process and is non-refundable if your application
          is denied. Payment is processed securely via Paystack.
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-ink-muted">
        <FiLock size={12} className="shrink-0" />
        <span>Secure payment powered by Paystack</span>
      </div>

      <button
        onClick={() => onInitiate(false)}
        disabled={initiating}
        className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
      >
        <FiCreditCard size={15} />
        {initiating ? "Opening Paystack…" : `Pay ₦${feeNgn?.toLocaleString()} & continue`}
      </button>
      <button
        onClick={onBack}
        className="w-full text-sm text-ink-muted hover:text-ink transition"
      >
        Back
      </button>
    </div>
  );
};

// ── Step: Account & identity details ─────────────────────────────────
const StepDetails = ({ type, form, onChange, onNext, onBack }) => {
  const requiresEntity = ["business", "government"].includes(type);
  const canProceed =
    form.legalName.trim().length >= 2 &&
    form.dateOfBirth.trim().length === 10 &&
    form.country.trim().length >= 2 &&
    form.category.trim().length > 0 &&
    (!requiresEntity || form.entityName.trim().length >= 2);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink mb-0.5">Account details</h3>
        <p className="text-sm text-ink-muted">For review only — not shown publicly.</p>
      </div>

      {requiresEntity && (
        <div>
          <label className="block text-sm font-medium text-ink-sub mb-1.5">
            {type === "business" ? "Business / entity name" : "Institution name"}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.entityName}
            onChange={(e) => onChange("entityName", e.target.value)}
            placeholder={type === "business" ? "e.g. Kabu Foods Ltd" : "e.g. Lagos State Government"}
            maxLength={120}
            className="w-full border border-stroke rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card"
          />
          <p className="text-[12px] text-ink-muted mt-1">This name appears on your badge.</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink-sub mb-1.5">
          Legal / real name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.legalName}
          onChange={(e) => onChange("legalName", e.target.value)}
          placeholder="Your full legal name"
          maxLength={120}
          className="w-full border border-stroke rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-sub mb-1.5">
            Date of birth <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full border border-stroke rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-sub mb-1.5">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => onChange("country", e.target.value)}
            placeholder="e.g. Nigeria"
            maxLength={80}
            className="w-full border border-stroke rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-sub mb-1.5">
          Category / profession <span className="text-red-500">*</span>
        </label>
        <select
          value={form.category}
          onChange={(e) => onChange("category", e.target.value)}
          className="w-full border border-stroke rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card appearance-none"
        >
          <option value="">Select a category…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink-sub hover:bg-surface transition"
        >
          <FiChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
        >
          Continue <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ── Step: Statement + public links ────────────────────────────────────
const StepStatement = ({ form, onChange, onSubmit, onBack, submitting }) => {
  const [linkInputs, setLinkInputs] = useState(
    form.publicLinks.length > 0 ? form.publicLinks : [""],
  );

  const updateLink = (i, val) => {
    const next = [...linkInputs];
    next[i] = val;
    setLinkInputs(next);
    onChange("publicLinks", next.filter((l) => l.trim()));
  };
  const addLink = () => {
    if (linkInputs.length < 3) setLinkInputs([...linkInputs, ""]);
  };
  const removeLink = (i) => {
    const next = linkInputs.filter((_, idx) => idx !== i);
    setLinkInputs(next.length ? next : [""]);
    onChange("publicLinks", next.filter((l) => l.trim()));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink mb-0.5">Make your case</h3>
        <p className="text-sm text-ink-muted">Tell the reviewer why this account qualifies.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-sub mb-1.5">
          Statement <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.statement}
          onChange={(e) => onChange("statement", e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder={
            "Explain what makes this account authentic or notable.\n\nExamples:\n• I'm a music journalist with 5 years at Beats & Frequencies.\n• My brand \"Kabu Foods\" has been registered since 2020 with 12,000+ customers.\n• I'm a creator with 80k+ followers across platforms."
          }
          className="w-full border border-stroke rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card resize-none"
        />
        <p className="text-[12px] text-ink-muted mt-1 text-right">{form.statement.length}/1000</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-sub mb-1.5">
          Public links{" "}
          <span className="text-ink-muted font-normal">(optional, up to 3)</span>
        </label>
        <p className="text-[12px] text-ink-muted mb-2">
          Official website, LinkedIn, YouTube, or other public profiles that support your claim.
        </p>
        <div className="space-y-2">
          {linkInputs.map((link, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="url"
                value={link}
                onChange={(e) => updateLink(i, e.target.value)}
                placeholder="https://example.com"
                className="flex-1 border border-stroke rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary-200 bg-card"
              />
              {linkInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="p-2.5 rounded-xl border border-stroke text-ink-muted hover:bg-surface hover:text-red-500 transition"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {linkInputs.length < 3 && (
          <button
            type="button"
            onClick={addLink}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add another link
          </button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 text-[13px] text-amber-800">
        <FiInfo size={14} className="shrink-0 mt-0.5" />
        <p>
          Once submitted, your request is locked until reviewed. Reviews typically
          take 1–3 business days. You'll be notified of the outcome.
        </p>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink-sub hover:bg-surface transition"
        >
          <FiChevronLeft size={16} /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={form.statement.trim().length < 20 || submitting}
          className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────
const VerificationSection = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [feeInfo, setFeeInfo] = useState({});

  // view: idle | eligibility | step-type | step-payment | step-details | step-statement
  const [view, setView] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  const [selectedType, setSelectedType] = useState("individual");
  const [paymentId, setPaymentId] = useState(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [form, setForm] = useState({
    entityName: "",
    legalName: "",
    dateOfBirth: "",
    country: "",
    category: "",
    statement: "",
    publicLinks: [],
  });

  const { checks, allMet } = useEligibility(user);
  const heldTypes = new Set((user?.verifications || []).map((v) => v.type));
  const pendingTypes = new Set(
    requests.filter((r) => r.status === "pending").map((r) => r.type),
  );
  const availableTypes = APPLICABLE_TYPES.filter(
    (t) => !heldTypes.has(t) && !pendingTypes.has(t),
  );

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

  const loadFees = useCallback(async () => {
    try {
      const res = await api.get("/verification-requests/fees");
      setFeeInfo(res.data || {});
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadFees();
  }, [loadRequests, loadFees]);

  // After returning from Paystack redirect, check ?paystack_ref in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("paystack_ref");
    if (!ref) return;

    // Clean the URL immediately
    window.history.replaceState({}, "", window.location.pathname);

    // Verify the payment
    (async () => {
      try {
        const res = await api.get(`/verification-requests/payment/verify/${ref}`);
        if (res.data.verified) {
          setPaymentId(res.data.paymentId);
          setPaymentVerified(true);
          setSelectedType("business");
          setView("step-payment");
          toast.success("Payment confirmed — continue your application.");
        }
      } catch (e) {
        toast.error(e.response?.data?.message || "Could not verify payment.");
      }
    })();
  }, []);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const resetForm = () => {
    setSelectedType("individual");
    setPaymentId(null);
    setPaymentVerified(false);
    setForm({
      entityName: "",
      legalName: "",
      dateOfBirth: "",
      country: "",
      category: "",
      statement: "",
      publicLinks: [],
    });
    setView("idle");
  };

  // Called from StepPayment — skip=true means payment already verified (returning from redirect)
  const handleInitiatePayment = async (skip) => {
    if (skip) {
      setView("step-details");
      return;
    }
    setInitiatingPayment(true);
    try {
      const res = await api.post("/verification-requests/payment/initiate", {
        type: "business",
      });
      if (res.data.alreadyPaid) {
        // Unconsumed verified payment exists — skip Paystack
        setPaymentId(res.data.paymentId);
        setPaymentVerified(true);
        setView("step-details");
        return;
      }
      // Redirect to Paystack checkout. Paystack will redirect back to
      // ?paystack_ref=<reference> which the useEffect above catches.
      const returnUrl = `${window.location.origin}${window.location.pathname}?paystack_ref=${res.data.reference}`;
      // Paystack inline doesn't support external redirect on mobile PWA well;
      // use a full page redirect via authorization_url appended with callback.
      window.location.href = res.data.authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not start payment.");
    } finally {
      setInitiatingPayment(false);
    }
  };

  const handleTypeNext = () => {
    const fee = feeInfo[selectedType];
    if (fee?.requiresPayment) {
      setView("step-payment");
    } else {
      setView("step-details");
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const statementWithCategory = form.category
        ? `[${form.category}] ${form.statement.trim()}`
        : form.statement.trim();

      await api.post("/verification-requests", {
        type: selectedType,
        entityName: form.entityName.trim(),
        legalName: form.legalName.trim(),
        dateOfBirth: form.dateOfBirth,
        country: form.country.trim(),
        statement: statementWithCategory,
        publicLinks: form.publicLinks,
        ...(paymentId ? { paymentId } : {}),
      });
      toast.success("Application submitted — you'll be notified of the outcome.");
      resetForm();
      loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const detailsBack = () => {
    const fee = feeInfo[selectedType];
    setView(fee?.requiresPayment ? "step-payment" : "step-type");
  };

  return (
    <section className="bg-card border border-stroke rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <FiAward size={15} className="text-primary-600" />
        </div>
        <h2 className="text-base font-semibold text-ink">Verification</h2>
      </div>
      <p className="text-sm text-ink-muted mb-4">
        Each badge confirms one specific claim about your account — never generic importance.
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink bg-surface rounded-full px-3 py-1.5 border border-stroke"
              >
                <VerifiedBadge
                  type={v.type}
                  verifiedAt={v.verifiedAt}
                  entityName={v.entityName}
                  size="sm"
                />
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
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-3 ${
                  r.status === "pending" ? "border-stroke" : sm.color
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{m?.label || r.type}</p>
                  {r.status === "pending" && (
                    <p className="text-[12px] text-ink-muted mt-0.5">
                      Submitted — locked until reviewed.
                    </p>
                  )}
                  {r.status === "denied" && r.decisionNote && (
                    <p className="text-[12px] text-ink-muted mt-0.5">{r.decisionNote}</p>
                  )}
                  {r.status === "approved" && (
                    <p className="text-[12px] text-ink-muted mt-0.5">Badge active on your profile.</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 border ${sm.color}`}
                >
                  <Icon size={11} />
                  {sm.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Flow */}
      {view === "idle" && (
        <>
          {availableTypes.length > 0 ? (
            <button
              onClick={() => setView("eligibility")}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Apply for a badge <FiChevronRight size={14} />
            </button>
          ) : (
            requests.length === 0 &&
            (user?.verifications || []).length === 0 && (
              <p className="text-sm text-ink-muted">No badge types available to apply for.</p>
            )
          )}
        </>
      )}

      {view === "eligibility" && (
        <StepEligibility checks={checks} allMet={allMet} onProceed={() => setView("step-type")} />
      )}

      {view === "step-type" && (
        <StepType
          availableTypes={availableTypes}
          selectedType={selectedType}
          onSelect={setSelectedType}
          onNext={handleTypeNext}
          feeInfo={feeInfo}
        />
      )}

      {view === "step-payment" && (
        <StepPayment
          feeNgn={feeInfo["business"]?.feeNgn}
          onInitiate={handleInitiatePayment}
          onBack={() => setView("step-type")}
          initiating={initiatingPayment}
          paid={paymentVerified}
          paymentId={paymentId}
        />
      )}

      {view === "step-details" && (
        <StepDetails
          type={selectedType}
          form={form}
          onChange={setField}
          onNext={() => setView("step-statement")}
          onBack={detailsBack}
        />
      )}

      {view === "step-statement" && (
        <StepStatement
          form={form}
          onChange={setField}
          onSubmit={handleSubmit}
          onBack={() => setView("step-details")}
          submitting={submitting}
        />
      )}

      {view !== "idle" && (
        <button
          onClick={resetForm}
          className="mt-3 text-sm text-ink-muted hover:text-ink transition"
        >
          Cancel application
        </button>
      )}
    </section>
  );
};

export default VerificationSection;
