import { useState, useEffect } from "react";
import {
  FiX, FiZap, FiExternalLink, FiLoader, FiAlertTriangle,
  FiTrash2, FiRefreshCw, FiChevronDown, FiChevronUp,
  FiTarget, FiMapPin, FiTag,
} from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";

const CTA_OPTIONS = [
  { value: "learn_more",    label: "Learn More" },
  { value: "shop_now",      label: "Shop Now" },
  { value: "sign_up",       label: "Sign Up" },
  { value: "contact_us",    label: "Contact Us" },
  { value: "download",      label: "Download" },
  { value: "get_quote",     label: "Get Quote" },
  { value: "visit_website", label: "Visit Website" },
  { value: "book_now",      label: "Book Now" },
];

const AVAILABLE_INTERESTS = [
  "technology","music","art","sports","gaming","science",
  "politics","food","travel","fashion","finance","health",
  "education","entertainment","news","business","nature",
  "photography","fitness","books",
];

const TIER_DISPLAY = {
  basic:    { color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200",  badge: "Basic" },
  standard: { color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", badge: "Standard" },
  premium:  { color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  badge: "Premium" },
};

const TierCard = ({ tierKey, config, selected, onSelect }) => {
  const d = TIER_DISPLAY[tierKey];
  return (
    <button
      onClick={() => onSelect(tierKey)}
      className={`w-full text-left p-3.5 rounded-xl border-2 transition ${
        selected
          ? `${d.bg} ${d.border} ${d.color}`
          : "border-stroke bg-card hover:border-primary-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.bg} ${d.color} border ${d.border}`}>
            {d.badge}
          </span>
          <span className="text-sm font-semibold text-ink">{config.label}</span>
        </div>
        <span className="text-sm font-bold text-ink">₦{config.amountNgn?.toLocaleString()}</span>
      </div>
      <p className="mt-1 text-[11px] text-ink-muted pl-0.5">
        {config.impressionCap
          ? `Up to ${config.impressionCap.toLocaleString()} impressions`
          : "Unlimited impressions"}
      </p>
    </button>
  );
};

const PromotePostModal = ({ postId, postText, promotionReference, onClose }) => {
  const [tiers, setTiers] = useState(null);
  const [selectedTier, setSelectedTier] = useState("basic");
  // Seeded from the prop: a returning payment is already pending, so the fee
  // fetch below never runs for it and the modal must not open in a loading
  // state waiting for a request that will not be made.
  const [loading, setLoading] = useState(!promotionReference);
  const [initiating, setInitiating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [hasPending, setHasPending] = useState(Boolean(promotionReference));
  const [pendingRef, setPendingRef] = useState(promotionReference || null);
  const [showTargeting, setShowTargeting] = useState(false);
  const [targetLocation, setTargetLocation] = useState("");
  const [targetInterests, setTargetInterests] = useState([]);
  const [ctaType, setCtaType] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");

  useEffect(() => {
    if (hasPending) return;
    api.get("/posts/promote/fees")
      .then((r) => setTiers(r.data.tiers))
      .catch(() => toast.error("Couldn't load promotion info."))
      .finally(() => setLoading(false));
  }, [hasPending]);

  const toggleInterest = (interest) => {
    setTargetInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleResume = async () => {
    if (resuming || !pendingRef) return;
    setResuming(true);
    try {
      await api.get(`/posts/promote/verify/${pendingRef}`);
      toast.success("Post promoted! It will now surface to more people.", { duration: 5000 });
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || "Payment not verified. Cancel and try again.", { duration: 6000 });
    } finally { setResuming(false); }
  };

  const handleCancelPending = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await api.delete(`/posts/promote/cancel/${postId}`);
      setHasPending(false);
      setPendingRef(null);
      setLoading(true);
      api.get("/posts/promote/fees")
        .then((r) => setTiers(r.data.tiers))
        .catch(() => toast.error("Couldn't load promotion info."))
        .finally(() => setLoading(false));
      toast.success("Pending promotion cleared. You can now start a new one.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't cancel promotion. Try again.");
    } finally { setCancelling(false); }
  };

  const handlePromote = async () => {
    if (initiating) return;
    if (destinationUrl.trim()) {
      try { new URL(destinationUrl.trim()); }
      catch { toast.error("Destination URL must be a valid URL (include https://)."); return; }
    }
    setInitiating(true);
    try {
      const res = await api.post("/posts/promote/initiate", {
        postId,
        tier: selectedTier,
        targeting: {
          location: targetLocation.trim(),
          interests: targetInterests,
        },
        ctaType: ctaType || null,
        destinationUrl: destinationUrl.trim() || null,
      });
      window.location.href = res.data.authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't start promotion. Try again.");
      setInitiating(false);
    }
  };

  const selectedTierConfig = tiers?.[selectedTier];

  return (
    <div data-modal-layer className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-stroke rounded-2xl w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stroke sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-50 text-primary-600">
              <FiZap size={16} />
            </span>
            <h2 className="text-base font-bold text-ink">Promote post</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface hover:text-ink transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {postText && (
            <div className="rounded-xl bg-surface border border-stroke px-3 py-2.5">
              <p className="text-sm text-ink-sub line-clamp-2 leading-relaxed">{postText}</p>
            </div>
          )}

          {hasPending ? (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <FiAlertTriangle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800 font-medium leading-snug">
                  A payment for this post is pending verification.
                </p>
              </div>
              <p className="text-xs text-yellow-700 leading-relaxed">
                If you already paid, tap <strong>Resume</strong> to complete activation. Otherwise, tap <strong>Cancel pending</strong> to start fresh.
              </p>
            </div>
          ) : (
            <>
              {/* Tier selection */}
              {loading ? (
                <div className="flex items-center gap-2 text-ink-muted text-sm py-4 justify-center">
                  <FiLoader size={14} className="animate-spin" />Loading packages…
                </div>
              ) : tiers ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Choose a package</p>
                  {Object.entries(tiers).map(([key, cfg]) => (
                    <TierCard
                      key={key}
                      tierKey={key}
                      config={cfg}
                      selected={selectedTier === key}
                      onSelect={setSelectedTier}
                    />
                  ))}
                </div>
              ) : null}

              {/* Audience targeting — collapsible */}
              {!loading && tiers && (
                <div className="border border-stroke rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowTargeting((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink hover:bg-surface transition"
                  >
                    <span className="flex items-center gap-2">
                      <FiTarget size={14} className="text-primary-500" />
                      Audience targeting
                      {(targetLocation || targetInterests.length > 0) && (
                        <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-bold">
                          {[targetLocation && "location", targetInterests.length > 0 && "interests"]
                            .filter(Boolean).join(" + ")}
                        </span>
                      )}
                    </span>
                    {showTargeting ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                  </button>

                  {showTargeting && (
                    <div className="px-4 pb-4 space-y-4 border-t border-stroke pt-3">
                      {/* Location */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                          <FiMapPin size={11} />Location (optional)
                        </label>
                        <input
                          type="text"
                          value={targetLocation}
                          onChange={(e) => setTargetLocation(e.target.value)}
                          placeholder="e.g. Lagos, Abuja, Nigeria"
                          className="w-full px-3 py-2 rounded-lg border border-stroke bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
                          maxLength={100}
                        />
                      </div>

                      {/* Interests */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                          <FiTag size={11} />Interests (optional)
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {AVAILABLE_INTERESTS.map((interest) => (
                            <button
                              key={interest}
                              onClick={() => toggleInterest(interest)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                                targetInterests.includes(interest)
                                  ? "bg-primary-600 text-white border-primary-600"
                                  : "bg-surface text-ink-muted border-stroke hover:border-primary-400"
                              }`}
                            >
                              {interest}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-ink-muted">
                          Leave blank to show to all users. When set, your post targets users with matching interests.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CTA button + destination URL */}
              {!loading && tiers && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-muted">CTA button (optional)</label>
                    <select
                      value={ctaType}
                      onChange={(e) => setCtaType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-surface text-sm text-ink focus:outline-none focus:border-primary-400 transition"
                    >
                      <option value="">No CTA button</option>
                      {CTA_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-muted">Destination URL (optional)</label>
                    <input
                      type="url"
                      value={destinationUrl}
                      onChange={(e) => setDestinationUrl(e.target.value)}
                      placeholder="https://your-site.com/offer"
                      className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
                      maxLength={2000}
                    />
                    <p className="text-[10px] text-ink-muted">
                      Blank = the CTA button opens the post itself.
                    </p>
                  </div>
                </div>
              )}

              {!loading && selectedTierConfig && (
                <p className="text-[11px] text-ink-muted">
                  You'll be redirected to Paystack to pay <strong>₦{selectedTierConfig.amountNgn?.toLocaleString()}</strong> for {selectedTierConfig.label}. Promotion activates immediately after successful charge.
                </p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          {hasPending ? (
            <>
              <button
                onClick={handleCancelPending}
                disabled={cancelling || resuming}
                className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? <><FiLoader size={13} className="animate-spin" />Cancelling…</> : <><FiTrash2 size={13} />Cancel pending</>}
              </button>
              <button
                onClick={handleResume}
                disabled={resuming || cancelling}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resuming ? <><FiLoader size={13} className="animate-spin" />Verifying…</> : <><FiRefreshCw size={13} />Resume</>}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stroke text-sm font-semibold text-ink-sub hover:bg-surface transition">
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={initiating || loading || !tiers}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {initiating
                  ? <><FiLoader size={13} className="animate-spin" />Redirecting…</>
                  : <><FiExternalLink size={13} />Pay & Promote</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromotePostModal;
