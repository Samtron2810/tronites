import { useState } from "react";
import {
  FiX, FiZap, FiLoader, FiChevronDown, FiChevronUp,
  FiTarget, FiMapPin, FiTag, FiShield,
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

// Mirrors PROMO_TIERS' day options on the paid side, plus a couple of
// longer presets since there's no price attached here — still capped
// at MAX_ADMIN_PROMO_DAYS (30) server-side regardless of what's picked.
const DAY_PRESETS = [3, 7, 14, 30];
const MAX_DAYS = 30;

// Admin/moderator comp — grants an eligible creator's/business's post a
// free promotion (no Paystack charge). Deliberately a separate component
// from PromotePostModal rather than a payment-skipping variant of it:
// the two have almost no UI in common (no tiers, no price, no
// pending/resume/cancel payment states) and mixing "am I the owner
// paying" branches into one component would make both harder to read.
const AdminPromotePostModal = ({
  postId,
  postText,
  authorName,
  authorUsername,
  onClose,
  // Called with the new promotedUntil Date/string on success so the
  // caller can update its local state without a refetch.
  onPromoted,
}) => {
  const [days, setDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);
  const [targetLocation, setTargetLocation] = useState("");
  const [targetInterests, setTargetInterests] = useState([]);
  const [ctaType, setCtaType] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");

  const toggleInterest = (interest) => {
    setTargetInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (destinationUrl.trim()) {
      try { new URL(destinationUrl.trim()); }
      catch { toast.error("Destination URL must be a valid URL (include https://)."); return; }
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/posts/promote/admin/${postId}`, {
        days,
        targeting: {
          location: targetLocation.trim(),
          interests: targetInterests,
        },
        ctaType: ctaType || null,
        destinationUrl: destinationUrl.trim() || null,
      });
      toast.success(`Promoted for ${days} day${days === 1 ? "" : "s"} — no charge.`);
      onPromoted?.(res.data.promotedUntil);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't promote this post. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
              <FiShield size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Promote for creator</h2>
              <p className="text-[11px] text-ink-muted">No charge — granted by you</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:bg-surface hover:text-ink transition">
            <FiX size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {(authorName || authorUsername) && (
            <p className="text-xs text-ink-muted">
              For <span className="font-semibold text-ink">{authorName}</span>
              {authorUsername && <span> @{authorUsername}</span>}
            </p>
          )}

          {postText && (
            <div className="rounded-xl bg-surface border border-stroke px-3 py-2.5">
              <p className="text-sm text-ink-sub line-clamp-2 leading-relaxed">{postText}</p>
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Duration</p>
            <div className="flex flex-wrap gap-2">
              {DAY_PRESETS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                    days === d
                      ? "bg-primary-50 border-primary-300 text-primary-600"
                      : "border-stroke text-ink-sub hover:border-primary-300"
                  }`}
                >
                  {d} day{d === 1 ? "" : "s"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={MAX_DAYS}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="flex-1 accent-primary-600"
              />
              <span className="text-xs font-semibold text-ink w-16 text-right">
                {days} day{days === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[10px] text-ink-muted">Max {MAX_DAYS} days per grant.</p>
          </div>

          {/* Audience targeting — collapsible, same shape as PromotePostModal */}
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
                </div>
              </div>
            )}
          </div>

          {/* CTA button + destination URL */}
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
                placeholder="https://their-site.com/offer"
                className="w-full px-3 py-2.5 rounded-xl border border-stroke bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-400 transition"
                maxLength={2000}
              />
            </div>
          </div>

          <p className="text-[11px] text-ink-muted flex items-start gap-1.5">
            <FiShield size={12} className="mt-0.5 shrink-0 text-primary-500" />
            This grants promotion immediately, with no payment. The creator is
            notified, and the grant is recorded in the moderation audit log.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-stroke text-sm font-semibold text-ink-sub hover:bg-surface transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><FiLoader size={13} className="animate-spin" />Promoting…</>
              : <><FiZap size={13} />Promote — free</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPromotePostModal;
