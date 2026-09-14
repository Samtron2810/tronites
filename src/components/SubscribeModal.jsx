import { useState, useEffect } from "react";
import { FaTimes, FaStar, FaLock, FaCheckCircle } from "react-icons/fa";
import api from "../services/api";
import toast from "react-hot-toast";

const SubscribeModal = ({ creator, onClose, onAlreadySubscribed }) => {
  const [plan, setPlan] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [planRes, statusRes] = await Promise.all([
          api.get(`/creator-monetization/plan/${creator._id}`),
          api.get(`/creator-monetization/subscribe/status/${creator._id}`),
        ]);
        setPlan(planRes.data.plan);
        setSubStatus(statusRes.data);
      } catch {
        // plan might 404 if creator hasn't set one up
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [creator._id]);

  const handleSubscribe = async () => {
    setInitiating(true);
    try {
      const { data } = await api.post("/creator-monetization/subscribe/initiate", {
        creatorId: creator._id,
      });
      window.location.href = data.authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not start subscription.");
      setInitiating(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel your subscription? You'll keep access until the current period ends.")) return;
    try {
      const { data } = await api.delete(`/creator-monetization/subscribe/${creator._id}`);
      toast.success(data.message);
      setSubStatus((s) => ({ ...s, subscribed: false, status: "cancelled" }));
      onAlreadySubscribed?.();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not cancel.");
    }
  };

  const isActive = subStatus?.subscribed;
  const isCancelled = subStatus?.status === "cancelled";
  const accessUntil = subStatus?.currentPeriodEnd
    ? new Date(subStatus.currentPeriodEnd).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-stroke shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stroke">
          <div className="flex items-center gap-3">
            {creator.profilePic ? (
              <img
                src={creator.profilePic}
                alt={creator.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-base">
                {creator.name?.[0] || "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-ink leading-none">
                Subscribe to {creator.name}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">@{creator.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition p-1">
            <FaTimes size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <span className="h-6 w-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !plan ? (
            <div className="text-center py-8">
              <p className="text-ink-muted text-sm">
                {creator.name} hasn't set up a subscription plan yet.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Plan card */}
              <div className="bg-surface border border-stroke rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-ink text-sm leading-tight">{plan.name}</p>
                    {plan.perks && (
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">{plan.perks}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xl font-bold text-ink leading-none">
                      ₦{plan.priceNgn?.toLocaleString()}
                    </p>
                    <p className="text-xs text-ink-muted">/ month</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    "Access subscriber-only posts",
                    "Support " + creator.name + " directly",
                    "Cancel any time",
                  ].map((perk) => (
                    <div key={perk} className="flex items-center gap-2">
                      <FaCheckCircle size={11} className="text-primary-500 shrink-0" />
                      <span className="text-xs text-ink-muted">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active subscription state */}
              {isActive && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 flex items-center gap-2">
                  <FaCheckCircle size={13} className="text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-400">
                    You're subscribed · renews {accessUntil}
                  </p>
                </div>
              )}
              {isCancelled && accessUntil && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Cancelled · access until {accessUntil}
                  </p>
                </div>
              )}

              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <FaLock size={10} /> Payments secured by Paystack
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {plan && (
          <div className="px-6 pb-6 space-y-2">
            {!isActive ? (
              <button
                onClick={handleSubscribe}
                disabled={initiating}
                className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary-700 transition"
              >
                {initiating ? (
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FaStar size={12} />
                    Subscribe for ₦{plan.priceNgn?.toLocaleString()}/mo
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="w-full py-3 rounded-xl border border-stroke text-ink-muted text-sm font-medium hover:bg-surface transition"
              >
                Cancel subscription
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscribeModal;
