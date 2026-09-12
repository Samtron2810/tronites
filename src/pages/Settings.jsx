import { useState, useEffect } from "react";
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
  FiMessageSquare,
  FiMapPin,
  FiTag,
  FiCheck,
} from "react-icons/fi";

// ── Accordion primitives ─────────────────────────────────────────────
const AccordionItem = ({
  id,
  open,
  onToggle,
  icon: Icon,
  iconColor = "text-primary-600",
  title,
  subtitle,
  children,
  danger = false,
}) => {
  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${danger ? "border-red-200" : "border-stroke"}`}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={`w-full flex items-center gap-3.5 px-5 py-4 text-left transition-colors ${
          open ? "bg-surface" : "hover:bg-surface"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-red-50" : "bg-primary-50"}`}
        >
          <Icon size={15} className={danger ? "text-red-500" : iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold leading-tight ${danger ? "text-red-600" : "text-ink"}`}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-[12px] text-ink-muted mt-0.5 leading-snug truncate">
              {subtitle}
            </p>
          )}
        </div>
        <FiChevronDown
          size={16}
          className={`text-ink-muted shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`transition-all duration-200 ease-in-out ${
          open
            ? "max-h-[2500px] opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        } overflow-hidden`}
      >
        <div
          className={`border-t ${danger ? "border-red-100" : "border-stroke"}`}
        >
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

// ── Feature 3: Topics/Interests ──────────────────────────────────────
const ALL_TOPICS = [
  { id: "technology", label: "Technology" },
  { id: "music", label: "Music" },
  { id: "art", label: "Art" },
  { id: "sports", label: "Sports" },
  { id: "gaming", label: "Gaming" },
  { id: "science", label: "Science" },
  { id: "politics", label: "Politics" },
  { id: "food", label: "Food" },
  { id: "travel", label: "Travel" },
  { id: "fashion", label: "Fashion" },
  { id: "finance", label: "Finance" },
  { id: "health", label: "Health" },
  { id: "education", label: "Education" },
  { id: "entertainment", label: "Entertainment" },
  { id: "news", label: "News" },
  { id: "business", label: "Business" },
  { id: "nature", label: "Nature" },
  { id: "photography", label: "Photography" },
  { id: "fitness", label: "Fitness" },
  { id: "books", label: "Books" },
];

// ── Main page ────────────────────────────────────────────────────────
const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

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

  // Feature 3: Interests
  const [selectedInterests, setSelectedInterests] = useState(
    () => user?.interests || []
  );
  const [savingInterests, setSavingInterests] = useState(false);
  useEffect(() => {
    if (user?.interests) setSelectedInterests(user.interests);
  }, [user?.interests]);

  const toggleInterest = (topic) => {
    setSelectedInterests((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : prev.length >= 10
        ? prev
        : [...prev, topic]
    );
  };

  const handleSaveInterests = async () => {
    if (savingInterests) return;
    setSavingInterests(true);
    try {
      await api.put("/users/interests", { interests: selectedInterests });
      updateUser?.({ interests: selectedInterests });
      toast.success("Interests saved!");
    } catch (e) {
      toast.error("Couldn't save interests. Try again.");
    } finally {
      setSavingInterests(false);
    }
  };

  // Feature 4: Location
  const [location, setLocation] = useState(user?.location || "");
  const [savingLocation, setSavingLocation] = useState(false);
  useEffect(() => {
    setLocation(user?.location || "");
  }, [user?.location]);

  const handleSaveLocation = async () => {
    if (savingLocation) return;
    setSavingLocation(true);
    try {
      await api.put("/users/location", { location });
      updateUser?.({ location });
      toast.success("Location updated.");
    } catch (e) {
      toast.error("Couldn't update location. Try again.");
    } finally {
      setSavingLocation(false);
    }
  };

  // Feature 6: Read receipts
  const [showReadReceipts, setShowReadReceiptsState] = useState(
    () => user?.showReadReceipts !== false
  );
  const [savingReceipts, setSavingReceipts] = useState(false);
  useEffect(() => {
    setShowReadReceiptsState(user?.showReadReceipts !== false);
  }, [user?.showReadReceipts]);

  const handleToggleReadReceipts = async (value) => {
    if (savingReceipts) return;
    setShowReadReceiptsState(value);
    setSavingReceipts(true);
    try {
      await api.put("/users/read-receipts", { showReadReceipts: value });
      updateUser?.({ showReadReceipts: value });
      toast.success(value ? "Read receipts on." : "Read receipts off.");
    } catch (e) {
      setShowReadReceiptsState(!value);
      toast.error("Couldn't update setting. Try again.");
    } finally {
      setSavingReceipts(false);
    }
  };

  const handleChangeVisibility = async (value) => {
    if (value === visibility || saving) return;
    const previous = visibility;
    setVisibility(value);
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
    await api.delete("/users/me", { data: { password } });
    setShowDeleteModal(false);
    toast.success("Your account has been deleted.");
    await logout();
    navigate("/login", { replace: true });
  };

  const visibilityLabel =
    VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ?? "—";
  const themeLabel = theme === "dark" ? "Dark mode" : "Light mode";
  const identitySubtitle = [
    user?.name,
    user?.username ? `@${user.username}` : null,
  ]
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
          <div className="py-4">
            <AccountIdentitySection embedded />
          </div>
        </AccordionItem>

        {/* ── 2. Verification ───────────────────────────────── */}
        <AccordionItem
          id="verification"
          open={isOpen("verification")}
          onToggle={togglePanel}
          icon={FiShield}
          title="Verification"
          subtitle="Apply for account verification"
        >
          <div className="py-4">
            <VerificationSection embedded />
          </div>
        </AccordionItem>

        {/* ── 3. Topics / Interests (Feature 3) ────────────── */}
        <AccordionItem
          id="interests"
          open={isOpen("interests")}
          onToggle={togglePanel}
          icon={FiTag}
          title="Topics & interests"
          subtitle={
            selectedInterests.length
              ? `${selectedInterests.length} topic${selectedInterests.length !== 1 ? "s" : ""} selected`
              : "Pick up to 10 topics to personalise your feed"
          }
        >
          <div className="p-5">
            <p className="text-sm text-ink-muted mb-4">
              Choose 5–10 topics that interest you. Your For You feed will
              weight content from these areas more heavily.
              {selectedInterests.length >= 10 && (
                <span className="text-amber-500 font-medium"> (Max 10 reached)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {ALL_TOPICS.map((topic) => {
                const selected = selectedInterests.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleInterest(topic.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      selected
                        ? "bg-primary-600 border-primary-600 text-white"
                        : "bg-surface border-stroke text-ink-sub hover:border-primary-400"
                    } ${!selected && selectedInterests.length >= 10 ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={!selected && selectedInterests.length >= 10}
                  >
                    {selected && <FiCheck size={11} />}
                    {topic.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleSaveInterests}
              disabled={savingInterests}
              className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-60 transition"
            >
              {savingInterests ? "Saving…" : "Save interests"}
            </button>
          </div>
        </AccordionItem>

        {/* ── 4. Location (Feature 4) ───────────────────────── */}
        <AccordionItem
          id="location"
          open={isOpen("location")}
          onToggle={togglePanel}
          icon={FiMapPin}
          title="Location"
          subtitle={location || "Used for trending near you"}
        >
          <div className="p-5">
            <p className="text-sm text-ink-muted mb-3">
              Add your city or region to see trending hashtags near you. This
              is optional and only used for local trending.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lagos, London, New York"
                maxLength={100}
                className="flex-1 px-3 py-2.5 rounded-xl border border-stroke bg-surface text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={savingLocation}
                className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-800 disabled:opacity-60 transition"
              >
                {savingLocation ? "…" : "Save"}
              </button>
            </div>
          </div>
        </AccordionItem>

        {/* ── 5. Notifications ──────────────────────────────── */}
        <AccordionItem
          id="notifications"
          open={isOpen("notifications")}
          onToggle={togglePanel}
          icon={FiBell}
          title="Notifications"
          subtitle="Manage push notifications"
        >
          <div className="py-4">
            <PushNotificationsSection embedded />
          </div>
        </AccordionItem>

        {/* ── 6. Messaging (Feature 6: read receipts) ──────── */}
        <AccordionItem
          id="messaging"
          open={isOpen("messaging")}
          onToggle={togglePanel}
          icon={FiMessageSquare}
          title="Messaging"
          subtitle={showReadReceipts ? "Read receipts on" : "Read receipts off"}
        >
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Read receipts</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  When off, others won't see double-ticks on messages you read.
                  You also won't see theirs.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showReadReceipts}
                onClick={() => handleToggleReadReceipts(!showReadReceipts)}
                disabled={savingReceipts}
                className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
                  showReadReceipts ? "bg-primary-600" : "bg-stroke"
                } disabled:opacity-60`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    showReadReceipts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </AccordionItem>

        {/* ── 7. Online status ──────────────────────────────── */}
        <AccordionItem
          id="privacy"
          open={isOpen("privacy")}
          onToggle={togglePanel}
          icon={FiEye}
          title="Online status"
          subtitle={`Shown to: ${visibilityLabel}`}
        >
          <div className="divide-y divide-stroke">
            {VISIBILITY_OPTIONS.map(({ value, label, description, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleChangeVisibility(value)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                  visibility === value
                    ? "bg-primary-50"
                    : "hover:bg-surface"
                }`}
              >
                <Icon
                  size={15}
                  className={
                    visibility === value ? "text-primary-600" : "text-ink-muted"
                  }
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      visibility === value ? "text-primary-600" : "text-ink"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">{description}</p>
                </div>
                {visibility === value && (
                  <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </AccordionItem>

        {/* ── 8. Theme ──────────────────────────────────────── */}
        <AccordionItem
          id="theme"
          open={isOpen("theme")}
          onToggle={togglePanel}
          icon={theme === "dark" ? FiMoon : FiSun}
          title="Appearance"
          subtitle={themeLabel}
        >
          <div className="p-5">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stroke text-sm font-medium text-ink hover:bg-surface transition"
            >
              {theme === "dark" ? <FiSun size={15} /> : <FiMoon size={15} />}
              {theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"}
            </button>
          </div>
        </AccordionItem>

        {/* ── 9. Security & sessions ────────────────────────── */}
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

        {/* ── 10. Data & account ────────────────────────────── */}
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
              Download a copy of everything tied to your account — posts,
              comments, likes, bookmarks, follows, messages, and more.
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

        {/* ── 11. Legal & support ───────────────────────────── */}
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
              to="/tiers"
              className="flex items-center gap-3 px-5 py-3.5 text-sm text-ink hover:bg-surface transition"
            >
              <FiAward size={15} className="text-primary-600" />
              <span className="flex-1">Tiers & benefits</span>
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

        {/* ── 12. Delete account ────────────────────────────── */}
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
              Permanently deletes your account and everything in it. This can't
              be undone after the 30-day grace period.
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
