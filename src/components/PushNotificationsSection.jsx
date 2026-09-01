import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiBell, FiBellOff, FiLoader } from "react-icons/fi";
import {
  isPushSupported,
  getPushPermission,
  getExistingSubscription,
  enablePush,
  disablePush,
  getPushPrefs,
  updatePushPrefs,
} from "../services/push";

// Order/labels mirror Notification.js's type enum on the backend, minus
// moderator_warning (never user-toggleable — those must always reach
// the recipient) and grouped so "commentLike" reads naturally next to
// "comment" rather than following the model's declaration order.
const PREF_ROWS = [
  { key: "like", label: "Likes", helper: "When someone likes your post" },
  { key: "comment", label: "Comments", helper: "When someone comments on your post" },
  { key: "reply", label: "Replies", helper: "When someone replies to your comment" },
  { key: "commentLike", label: "Comment likes", helper: "When someone likes your comment" },
  { key: "follow", label: "New followers", helper: "When someone follows you" },
  { key: "mention", label: "Mentions", helper: "When someone mentions you" },
  { key: "repost", label: "Reposts", helper: "When someone reposts your post" },
  { key: "quote", label: "Quotes", helper: "When someone quotes your post" },
  { key: "reaction", label: "Reactions", helper: "When someone reacts to your post" },
  { key: "message", label: "Messages", helper: "New direct messages" },
];

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition shrink-0 disabled:opacity-50 ${
      checked ? "bg-primary-600" : "bg-stroke"
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

const PushNotificationsSection = () => {
  const supported = isPushSupported();
  const [permission, setPermission] = useState(getPushPermission());
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(supported);
  const [toggling, setToggling] = useState(false);
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    if (!supported) return;
    (async () => {
      const existing = await getExistingSubscription();
      setSubscribed(Boolean(existing));
      if (existing) {
        try {
          setPrefs(await getPushPrefs());
        } catch {
          // prefs endpoint failing shouldn't block showing the toggle itself
        }
      }
      setChecking(false);
    })();
  }, [supported]);

  const handleMasterToggle = async (next) => {
    setToggling(true);
    try {
      if (next) {
        const result = await enablePush();
        setPermission(result.permission);
        if (result.permission === "denied") {
          toast.error("Notifications are blocked in your browser settings.");
          setSubscribed(false);
          return;
        }
        setSubscribed(result.subscribed);
        if (result.subscribed) {
          setPrefs(await getPushPrefs());
          toast.success("Push notifications enabled");
        }
      } else {
        await disablePush();
        setSubscribed(false);
        toast.success("Push notifications turned off");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't update notification settings.");
    } finally {
      setToggling(false);
    }
  };

  const handlePrefToggle = async (key, value) => {
    const previous = prefs;
    setPrefs((p) => ({ ...p, [key]: value }));
    try {
      await updatePushPrefs({ [key]: value });
    } catch {
      setPrefs(previous);
      toast.error("Couldn't save that preference.");
    }
  };

  if (!supported) {
    return (
      <section className="bg-card border border-stroke rounded-2xl p-5 mt-4">
        <h2 className="text-base font-semibold text-ink mb-1">
          Push notifications
        </h2>
        <p className="text-sm text-ink-muted">
          Not supported in this browser. Try Chrome, Edge, or Safari 16.4+.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-card border border-stroke rounded-2xl mt-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center shrink-0">
            {subscribed ? (
              <FiBell className="text-primary-600" size={16} />
            ) : (
              <FiBellOff className="text-ink-muted" size={16} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">
              Push notifications
            </h2>
            <p className="text-sm text-ink-muted">
              {permission === "denied"
                ? "Blocked — enable in browser settings"
                : "Get notified even when Tronites is closed"}
            </p>
          </div>
        </div>
        {checking ? (
          <FiLoader className="animate-spin text-ink-muted shrink-0" size={16} />
        ) : (
          <Toggle
            checked={subscribed}
            onChange={handleMasterToggle}
            disabled={toggling || permission === "denied"}
          />
        )}
      </div>

      {subscribed && prefs && (
        <div className="divide-y divide-stroke border-t border-stroke">
          {PREF_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{row.label}</p>
                <p className="text-xs text-ink-muted">{row.helper}</p>
              </div>
              <Toggle
                checked={prefs[row.key] !== false}
                onChange={(value) => handlePrefToggle(row.key, value)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PushNotificationsSection;
