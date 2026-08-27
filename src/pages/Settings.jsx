import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";
import DeleteAccountModal from "../components/DeleteAccountModal";
import ExportDataModal from "../components/ExportDataModal";
import AccountIdentitySection from "../components/AccountIdentitySection";
import { Link } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiUsers,
  FiDownload,
  FiTrash2,
  FiMoon,
  FiSun,
  FiShield,
  FiFileText,
  FiHelpCircle,
  FiChevronRight,
} from "react-icons/fi";

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
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  // Track both the local (possibly optimistic) value and the last server
  // value we synced from, in one state object — avoids a useEffect sync
  // and avoids reading/writing refs during render.
  const [state, setState] = useState(() => ({
    visibility: user?.presenceVisibility || "everyone",
    syncedFrom: user?.presenceVisibility,
  }));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (
    user?.presenceVisibility &&
    user.presenceVisibility !== state.syncedFrom
  ) {
    setState({
      visibility: user.presenceVisibility,
      syncedFrom: user.presenceVisibility,
    });
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

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await api.get("/users/me/export");
      // Standard blob-download pattern — no server-side file, the JSON
      // response itself becomes the downloaded file entirely client-side.
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tronites-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
      toast.success("Your data export has downloaded.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't export your data. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (password) => {
    // Errors intentionally propagate to the modal (it catches them and
    // shows the message inline) rather than being caught here — the
    // modal needs to know the attempt failed so it can stay open and
    // re-enable the form, not just show a toast and silently close.
    await api.delete("/users/me", { data: { password } });
    setShowDeleteModal(false);
    toast.success("Your account has been deleted.");
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold text-ink mb-1">Settings</h1>
      <p className="text-base text-ink-muted mb-6">
        Manage your privacy and account preferences.
      </p>

      <AccountIdentitySection />

      <section className="bg-card border border-stroke rounded-2xl p-5 mt-4">
        <h2 className="text-base font-semibold text-ink mb-1">Appearance</h2>
        <p className="text-base text-ink-muted mb-4">
          Choose between light and dark mode. Your choice is saved on this
          device.
        </p>
        <button
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink hover:bg-surface transition"
        >
          {theme === "dark" ? <FiSun size={15} /> : <FiMoon size={15} />}
          {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        </button>
      </section>

      <section className="bg-card border border-stroke rounded-2xl p-5 mt-4">
        <h2 className="text-base font-semibold text-ink mb-1">
          Who can see you're online
        </h2>
        <p className="text-base text-ink-muted mb-4">
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
                  <span className="block text-base font-medium text-ink">
                    {opt.label}
                  </span>
                  <span className="block text-sm text-ink-muted mt-0.5">
                    {opt.description}
                  </span>
                </span>
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${
                    selected
                      ? "border-primary-500 bg-primary-500"
                      : "border-stroke"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-card border border-stroke rounded-2xl p-5 mt-4">
        <h2 className="text-base font-semibold text-ink mb-1">Your data</h2>
        <p className="text-base text-ink-muted mb-4">
          Download a copy of everything tied to your account — posts, comments,
          likes, bookmarks, follows, messages, and more.
        </p>
        <button
          onClick={() => setShowExportModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stroke text-base font-medium text-ink hover:bg-surface transition"
        >
          <FiDownload size={15} />
          Download my data
        </button>
      </section>

      <section className="bg-card border border-stroke rounded-2xl mt-4 overflow-hidden">
        <h2 className="text-base font-semibold text-ink px-5 pt-5 pb-1">
          Legal & support
        </h2>
        <div className="divide-y divide-stroke mt-2">
          <Link
            to="/help"
            className="flex items-center gap-3 px-5 py-3.5 text-base text-ink hover:bg-surface transition"
          >
            <FiHelpCircle size={15} className="text-primary-600" />
            <span className="flex-1">Help & Support</span>
            <FiChevronRight size={14} className="text-ink-muted" />
          </Link>
          <Link
            to="/privacy"
            className="flex items-center gap-3 px-5 py-3.5 text-base text-ink hover:bg-surface transition"
          >
            <FiShield size={15} className="text-primary-600" />
            <span className="flex-1">Privacy Policy</span>
            <FiChevronRight size={14} className="text-ink-muted" />
          </Link>
          <Link
            to="/terms"
            className="flex items-center gap-3 px-5 py-3.5 text-base text-ink hover:bg-surface transition"
          >
            <FiFileText size={15} className="text-primary-600" />
            <span className="flex-1">Terms of Use</span>
            <FiChevronRight size={14} className="text-ink-muted" />
          </Link>
        </div>
      </section>

      <section className="bg-card border border-stroke rounded-2xl p-5 mt-4">
        <h2 className="text-base font-semibold text-ink mb-1">Delete account</h2>
        <p className="text-base text-ink-muted mb-4">
          Permanently deletes your account and everything in it. This can't be
          undone after the 30-day grace period.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-base font-medium text-red-600 hover:bg-red-50 transition"
        >
          <FiTrash2 size={15} />
          Delete my account
        </button>
      </section>

      {showExportModal && (
        <ExportDataModal
          onConfirm={handleExportData}
          onCancel={() => setShowExportModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </MainLayout>
  );
};

export default Settings;
