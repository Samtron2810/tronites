import { useState } from "react";
import { FiGlobe, FiUsers, FiLock, FiAlertTriangle, FiCheck } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import useBackButtonClose from "../hooks/useBackButtonClose";
import ModalPortal from "./ModalPortal";
import { useAuth } from "../context/useAuth";
import { canPostSubscribersOnly } from "../utils/tierLimits";

const OPTIONS = [
  { value: "public", label: "Public", hint: "Anyone can see, repost and quote it", icon: FiGlobe },
  { value: "followers", label: "Followers", hint: "You and the people who follow you", icon: FiUsers },
  { value: "subscribers", label: "Subscribers only", hint: "Paying subscribers of your creator page", icon: FaStar },
  { value: "only-me", label: "Only me", hint: "A private copy on your profile", icon: FiLock },
];

// Post-audience editor. Opened from the owner's post menu; mirrors the
// creation-time audience choices, plus a heads-up when narrowing a public
// post that already has reposts/quotes (the backend removes them).
const ChangeAudienceModal = ({ currentPrivacy = "public", repostCount = 0, isPromoted = false, onConfirm, onCancel }) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState(currentPrivacy);
  const [saving, setSaving] = useState(false);

  useBackButtonClose(true, onCancel);

  const options = OPTIONS.filter((o) => o.value !== "subscribers" || canPostSubscribersOnly(user) || currentPrivacy === "subscribers");
  const narrowing = currentPrivacy === "public" && selected !== "public";
  const blockedByPromotion = isPromoted && selected !== "public";
  const unchanged = selected === currentPrivacy;

  const handleSave = async () => {
    if (saving || unchanged || blockedByPromotion) return;
    setSaving(true);
    try {
      await onConfirm(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div data-modal-layer className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] sm:px-4">
        <div className="bg-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-xl p-5 max-h-[90dvh] overflow-y-auto">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stroke sm:hidden" />
          <h2 className="text-lg font-semibold text-ink">Who can see this post?</h2>
          <p className="text-sm text-ink-muted mt-0.5">Likes, comments and reactions stay with the post.</p>

          <div role="radiogroup" className="mt-4 space-y-2">
            {options.map(({ value, label, hint, icon: Icon }) => {
              const active = selected === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(value)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                    active ? "border-primary-600 bg-primary-50 ring-2 ring-primary-100" : "border-stroke hover:bg-surface"
                  }`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-primary-600 text-white" : "bg-surface text-ink-sub"}`}>
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium text-ink">
                      {label}
                      {value === currentPrivacy && <span className="ml-2 text-xs font-normal text-ink-muted">current</span>}
                    </span>
                    <span className="block text-sm text-ink-muted truncate">{hint}</span>
                  </span>
                  {active && <FiCheck size={16} className="text-primary-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {blockedByPromotion && (
            <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <FiAlertTriangle size={15} className="mt-0.5 shrink-0" />
              This post is currently promoted, so it has to stay public until the promotion ends.
            </p>
          )}
          {narrowing && !blockedByPromotion && repostCount > 0 && (
            <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <FiAlertTriangle size={15} className="mt-0.5 shrink-0" />
              Its {repostCount} {repostCount === 1 ? "repost/quote" : "reposts and quotes"} will be removed. Quotes keep their own text but stop showing this post, and this can't be undone.
            </p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink-sub hover:bg-surface disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || unchanged || blockedByPromotion}
              className="flex-1 px-4 py-2.5 rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ChangeAudienceModal;
