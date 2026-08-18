import { useState } from "react";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { FiEye, FiEyeOff, FiUsers } from "react-icons/fi";

const VISIBILITY_OPTIONS = [
  {
    value: "everyone",
    label: "Everyone",
    description: "Anyone can see when you're online.",
    icon: FiEye,
  },
  {
    value: "followers",
    label: "People who follow you",
    description: "Only accounts that follow you back can see your status.",
    icon: FiUsers,
  },
  {
    value: "nobody",
    label: "Nobody",
    description: "Your online status is always hidden.",
    icon: FiEyeOff,
  },
];

const Settings = () => {
  const { user, updateUser } = useAuth();
  // Track both the local (possibly optimistic) value and the last server
  // value we synced from, in one state object — avoids a useEffect sync
  // and avoids reading/writing refs during render.
  const [state, setState] = useState(() => ({
    visibility: user?.presenceVisibility || "everyone",
    syncedFrom: user?.presenceVisibility,
  }));
  const [saving, setSaving] = useState(false);

  if (user?.presenceVisibility && user.presenceVisibility !== state.syncedFrom) {
    setState({ visibility: user.presenceVisibility, syncedFrom: user.presenceVisibility });
  }
  const visibility = state.visibility;
  const setVisibility = (value) =>
    setState((prev) => ({ ...prev, visibility: value }));

  const handleChange = async (value) => {
    if (value === visibility || saving) return;
    const previous = visibility;
    setVisibility(value); // optimistic
    setSaving(true);
    try {
      const res = await api.put("/users/presence-visibility", {
        presenceVisibility: value,
      });
      updateUser?.({ presenceVisibility: res.data.presenceVisibility });
      toast.success("Online status setting updated.");
    } catch (e) {
      console.error(e);
      setVisibility(previous);
      toast.error("Couldn't update setting. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <h1 className="text-xl font-bold text-ink mb-1">Settings</h1>
      <p className="text-sm text-ink-muted mb-6">Manage your privacy and account preferences.</p>

      <section className="bg-white border border-stroke rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">Who can see you're online</h2>
        <p className="text-sm text-ink-muted mb-4">
          Controls the green dot on your profile and in chat.
        </p>

        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = visibility === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                disabled={saving}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition disabled:opacity-60 ${
                  selected
                    ? "border-primary-400 bg-primary-50"
                    : "border-stroke hover:bg-surface"
                }`}
              >
                <Icon
                  size={16}
                  className={`mt-0.5 shrink-0 ${selected ? "text-primary-600" : "text-ink-muted"}`}
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-ink">{opt.label}</span>
                  <span className="block text-xs text-ink-muted mt-0.5">{opt.description}</span>
                </span>
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${
                    selected ? "border-primary-500 bg-primary-500" : "border-stroke"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>
    </MainLayout>
  );
};

export default Settings;
