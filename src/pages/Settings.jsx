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
import VerificationSection from "../components/VerificationSection";
import PushNotificationsSection from "../components/PushNotificationsSection";
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
  FiChevronDown,
  FiMonitor,
  FiUser,
  FiAward,
  FiBell,
  FiDatabase,
  FiAlertTriangle,
} from "react-icons/fi";

// ── Accordion primitives ─────────────────────────────────────────────
// Each AccordionItem renders a trigger row + collapsible content panel.
// The content panel uses max-height + opacity transition so it animates
// smoothly without needing JS-measured heights.

const AccordionItem = ({ id, open, onToggle, icon: Icon, iconColor = "text-primary-600", title, subtitle, children, danger = false }) => {
  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${danger ? "border-red-200" : "border-stroke"}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={`w-full flex items-center gap-3.5 px-5 py-4 text-left transition-colors ${
          open ? "bg-surface" : "hover:bg-surface"
        }`}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-red-50" : "bg-primary-50"}`}>
          <Icon size={15} className={danger ? "text-red-500" : iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${danger ? "text-red-600" : "text-ink"}`}>{title}</p>
          {subtitle && (
            <p className="text-[12px] text-ink-muted mt-0.5 leading-snug truncate">{subtitle}</p>
          )}
        </div>
        <FiChevronDown
          size={16}
          className={`text-ink-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Content panel */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          open ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        } overflow-hidden`}
      >
        <div className={`border-t ${danger ? "border-red-100" : "border-stroke"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ── Visibility options ───────────────────────────────────────────────
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

// ── Main page ────────────────────────────────────────────────────────
const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Track open accordion panels — multiple can be open at once
  const [openPanels, setOpenPanels] = useState(new Set());
  const togglePanel = (id) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const isOpen = (id) => openPanels.has(id);

  // Presence visibility
  const [state, setState] = useState(() => ({
    visibility: user?.presenceVisibility || "everyone",
    syncedFrom: user?.presenceVisibility,
  }));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (user?.presenceVisibility && user.presenceVisibility !== state.syncedFrom) {
    setState({ visibility: user.presenceVisibility, syncedFrom: user.presenceVisibility });
  }
  const visibility = state.visibility;
  const setVisibility = (value) => setState((prev) => ({ ...prev, visibility: value }));

  const handleChangeVisibility = async (value) => {
    if (value === visibility || saving) return;
    const previous = visibility;
    setVisibility(value);
    setSaving(true);
    try {
      const res = await api.put("/users/presence-visibility", { presenceVisibility: value });
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
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
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
    await api.delete("/users/me", { data: { password } });
    setShowDeleteModal(false);
    toast.success("Your account has been deleted.");
    await logout();
    navigate("/login", { replace: true });
  };

  // Derived subtitles shown on collapsed trigger rows
  const visibilityLabel = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ?? "—";
  const themeLabel = theme === "dark" ? "Dark mode" : "Light mode";
  const identitySubtitle = [user?.name, user?.username ? `@${user.username}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold text-ink mb-1">Settings</h1>
      <p className="text-sm text-ink-muted mb-5">
        Manage your account, privacy, and preferences.
      </p>

      <div className="space-y-2">

        {/* ── 1. Public profile ─────────────────────────────── */}
        <AccordionItem
          id="identity"
          open={isOpen("identity")}
          onToggle={togglePanel}
          icon={FiUser}
          title="Edit public info"
          subtitle={identitySubtitle || "Name, username, bio"}
        >
          <div className="p-0">
            <AccountIdentitySection embedded />
          </div>
        </AccordionItem>

        {/* ── 2. Verification ───────────────────────────────── */}
        <AccordionItem
          id="verification"
          open={isOpen("verification")}
          onToggle={togglePanel}
          icon={FiAward}
          title="Verification"
          subtitle={
            (user?.verifications || []).length > 0
              ? `${(user.verifications).length} badge${(user.verifications).length > 1 ? "s" : ""} active`
              : "Apply for a verified badge"
          }
        >
          <div className="p-0">
            <VerificationSection embedded />
          </div>
        </AccordionItem>

        {/* ── 3. Privacy & visibility ───────────────────────── */}
        <AccordionItem
          id="privacy"
          open={isOpen("privacy")}
          onToggle={togglePanel}
          icon={FiEye}
          title="Privacy & visibility"
          subtitle={`Online status visible to: ${visibilityLabel}`}
        >
          <div className="p-5 space-y-2">
            <p className="text-sm text-ink-muted mb-3">
              Controls the green dot on your profile and in chat.
            </p>
            {VISIBILITY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = visibility === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleChangeVisibility(opt.value)}
                  disabled={saving}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition disabled:opacity-60 ${
                    selected ? "border-primary-400 bg-primary-50" : "border-stroke hover:bg-surface"
                  }`}
                >
                  <Icon size={16} className={`mt-0.5 shrink-0 ${selected ? "text-primary-600" : "text-ink-muted"}`} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">{opt.label}</span>
                    <span className="block text-[12px] text-ink-muted mt-0.5">{opt.description}</span>
                  </span>
                  <span className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${selected ? "border-primary-500 bg-primary-500" : "border-stroke"}`} />
                </button>
              );
            })}
          </div>
        </AccordionItem>

        {/* ── 4. Notifications ──────────────────────────────── */}
        <AccordionItem
          id="notifications"
          open={isOpen("notifications")}
          onToggle={togglePanel}
          icon={FiBell}
          title="Notifications"
          subtitle="Push alerts and notification preferences"
        >
          <div className="p-0">
            <PushNotificationsSection embedded />
          </div>
        </AccordionItem>

        {/* ── 5. Appearance ─────────────────────────────────── */}
        <AccordionItem
          id="appearance"
          open={isOpen("appearance")}
          onToggle={togglePanel}
          icon={theme === "dark" ? FiMoon : FiSun}
          title="Appearance"
          subtitle={themeLabel}
        >
          <div className="p-5">
            <p className="text-sm text-ink-muted mb-4">
              Choose between light and dark mode. Your choice is saved on this device.
            </p>
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink hover:bg-surface transition"
            >
              {theme === "dark" ? <FiSun size={15} /> : <FiMoon size={15} />}
              {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            </button>
          </div>
        </AccordionItem>

        {/* ── 6. Security & sessions ────────────────────────── */}
        <AccordionItem
          id="security"
          open={isOpen("security")}
          onToggle={togglePanel}
          icon={FiMonitor}
          title="Security"
          subtitle="Manage active sessions and devices"
        >
          <div className="divide-y divide-stroke">
            <Link
              to="/settings/sessions"
              className="flex items-center gap-3 px-5 py-3.5 text-sm text-ink hover:bg-surface transition"
            >
              <FiMonitor size={15} className="text-primary-600" />
              <span className="flex-1">Sessions & devices</span>
              <FiChevronDown size={14} className="text-ink-muted -rotate-90" />
            </Link>
          </div>
        </AccordionItem>

        {/* ── 7. Data & account ─────────────────────────────── */}
        <AccordionItem
          id="data"
          open={isOpen("data")}
          onToggle={togglePanel}
          icon={FiDatabase}
          title="Your data"
          subtitle="Download a copy of your account data"
        >
          <div className="p-5">
            <p className="text-sm text-ink-muted mb-4">
              Download a copy of everything tied to your account — posts, comments, likes,
              bookmarks, follows, messages, and more.
            </p>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink hover:bg-surface transition"
            >
              <FiDownload size={15} />
              Download my data
            </button>
          </div>
        </AccordionItem>

        {/* ── 8. Legal & support ────────────────────────────── */}
        <AccordionItem
          id="legal"
          open={isOpen("legal")}
          onToggle={togglePanel}
          icon={FiFileText}
          title="Legal & support"
          subtitle="Help, Privacy Policy, Terms of Use"
        >
          <div className="divide-y divide-stroke">
            <Link
              to="/help"
              className="flex items-center gap-3 px-5 py-3.5 text-sm text-ink hover:bg-surface transition"
            >
              <FiHelpCircle size={15} className="text-primary-600" />
              <span className="flex-1">Help & Support</span>
              <FiChevronDown size={14} className="text-ink-muted -rotate-90" />
            </Link>
            <Link
              to="/privacy"
              className="flex items-center gap-3 px-5 py-3.5 text-sm text-ink hover:bg-surface transition"
            >
              <FiShield size={15} className="text-primary-600" />
              <span className="flex-1">Privacy Policy</span>
              <FiChevronDown size={14} className="text-ink-muted -rotate-90" />
            </Link>
            <Link
              to="/terms"
              className="flex items-center gap-3 px-5 py-3.5 text-sm text-ink hover:bg-surface transition"
            >
              <FiFileText size={15} className="text-primary-600" />
              <span className="flex-1">Terms of Use</span>
              <FiChevronDown size={14} className="text-ink-muted -rotate-90" />
            </Link>
          </div>
        </AccordionItem>

        {/* ── 9. Delete account — danger, always at bottom ──── */}
        <AccordionItem
          id="danger"
          open={isOpen("danger")}
          onToggle={togglePanel}
          icon={FiAlertTriangle}
          title="Delete account"
          subtitle="Permanently remove your account and all data"
          danger
        >
          <div className="p-5">
            <p className="text-sm text-ink-muted mb-4">
              Permanently deletes your account and everything in it. This can't be
              undone after the 30-day grace period.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition"
            >
              <FiTrash2 size={15} />
              Delete my account
            </button>
          </div>
        </AccordionItem>

      </div>

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
