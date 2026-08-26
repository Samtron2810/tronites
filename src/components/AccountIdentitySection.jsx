import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { FiCheck, FiX, FiLoader, FiEdit2, FiClock } from "react-icons/fi";
import { formatRemainingDays as formatRemaining } from "../utils/cooldown";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
// Mirrors the backend's \p{L}\p{M}['\- ] pattern (letters + marks +
// apostrophe/hyphen/space, must start with a letter).
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;


// Derives "can I change this yet" purely from the timestamp + duration,
// same approach as suspendedUntil elsewhere in the app â€” no separate
// server round-trip needed just to check eligibility.
const cooldownRemaining = (changedAt, cooldownDays) => {
  if (!changedAt) return null;
  const nextAllowedAt = new Date(
    new Date(changedAt).getTime() + cooldownDays * 24 * 60 * 60 * 1000,
  );
  return formatRemaining(nextAllowedAt) ? nextAllowedAt : null;
};

const FieldRow = ({
  label,
  helperText,
  cooldownDays,
  changedAt,
  children,
}) => {
  const nextAllowedAt = cooldownRemaining(changedAt, cooldownDays);
  const remaining = nextAllowedAt ? formatRemaining(nextAllowedAt) : null;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-base font-semibold text-ink">{label}</h3>
        {remaining && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted bg-surface px-2 py-1 rounded-full shrink-0">
            <FiClock size={11} />
            {remaining} left
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted mb-3">{helperText}</p>
      {children}
    </div>
  );
};

const AccountIdentitySection = () => {
  const { user, updateUser } = useAuth();

  // â”€â”€ Name â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState(user?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(
    user?.name?.split(" ").slice(1).join(" ") || "",
  );
  const [savingName, setSavingName] = useState(false);

  const nameLocked = !!cooldownRemaining(user?.nameChangedAt, 3);

  const startEditName = () => {
    // Re-sync from the live user object each time editing opens, so a
    // second edit attempt after a prior save starts from the current
    // value rather than stale local state.
    setFirstName(user?.name?.split(" ")[0] || "");
    setLastName(user?.name?.split(" ").slice(1).join(" ") || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      toast.error("First and last name are both required.");
      return;
    }
    if (!NAME_RE.test(fn) || !NAME_RE.test(ln)) {
      toast.error("Names can only contain letters.");
      return;
    }
    if (savingName) return;
    setSavingName(true);
    try {
      const res = await api.put("/users/name", { firstName: fn, lastName: ln });
      updateUser({
        name: res.data.user.name,
        nameChangedAt: res.data.user.nameChangedAt,
      });
      toast.success("Name updated.");
      setEditingName(false);
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error(error.response.data?.message || "You can only change your name once every 3 days.");
        updateUser({ nameChangedAt: user?.nameChangedAt });
      } else {
        toast.error(error.response?.data?.message || "Couldn't update name. Try again.");
      }
    } finally {
      setSavingName(false);
    }
  };

  // â”€â”€ Username â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [status, setStatus] = useState("idle"); // idle | checking | available | taken | invalid | unchanged
  const [savingUsername, setSavingUsername] = useState(false);
  const debounceRef = useRef(null);

  const usernameLocked = !!cooldownRemaining(user?.usernameChangedAt, 30);

  const startEditUsername = () => {
    setUsername(user?.username || "");
    setStatus("idle");
    setEditingUsername(true);
  };

  useEffect(() => {
    if (!editingUsername) return undefined;
    const clean = username.trim().toLowerCase();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!clean || clean === user?.username) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- immediate sync feedback for a debounced input; not a prop-mirror
      setStatus(clean === user?.username ? "unchanged" : "idle");
      return undefined;
    }
    if (!USERNAME_RE.test(clean)) {
      setStatus("invalid");
      return undefined;
    }

    setStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/users/check-username", {
          params: { username: clean },
        });
        setStatus(res.data.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editingUsername gates the effect on open; re-running on user.username would refire mid-edit
  }, [username, editingUsername]);

  const handleSaveUsername = async () => {
    if (status !== "available" || savingUsername) return;
    setSavingUsername(true);
    try {
      const res = await api.put("/users/username", {
        username: username.trim().toLowerCase(),
      });
      updateUser({
        username: res.data.user.username,
        usernameChangedAt: res.data.user.usernameChangedAt,
      });
      toast.success("Username updated.");
      setEditingUsername(false);
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error(error.response.data?.message || "You can only change your username once every 30 days.");
      } else if (error.response?.status === 409) {
        toast.error("That username is already taken.");
        setStatus("taken");
      } else {
        toast.error(error.response?.data?.message || "Couldn't update username. Try again.");
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const usernameStatusIcon = {
    idle: null,
    unchanged: null,
    checking: <FiLoader className="animate-spin text-ink-muted" size={14} />,
    available: <FiCheck className="text-green-500" size={14} />,
    taken: <FiX className="text-red-500" size={14} />,
    invalid: <FiX className="text-red-500" size={14} />,
  }[status];

  const usernameStatusMessage = {
    idle: "3-20 characters: lowercase letters, numbers, underscores",
    unchanged: null,
    checking: "Checking availability...",
    available: "Username is available",
    taken: "That username is already taken",
    invalid: "3-20 chars: lowercase letters, numbers, underscores only",
  }[status];

  return (
    <section className="bg-card border border-stroke rounded-2xl p-5 divide-y divide-stroke">
      <FieldRow
        label="Name"
        helperText="Shown on your profile and posts. Can be changed once every 3 days."
        cooldownDays={3}
        changedAt={user?.nameChangedAt}
      >
        {!editingName ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-base text-ink">{user?.name}</span>
            <button
              onClick={startEditName}
              disabled={nameLocked}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:text-ink-muted transition shrink-0"
            >
              <FiEdit2 size={12} />
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                maxLength={30}
                autoFocus
                className="w-full px-3 py-2 rounded-xl border border-stroke bg-surface text-ink text-base outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                maxLength={30}
                className="w-full px-3 py-2 rounded-xl border border-stroke bg-surface text-ink text-base outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {savingName ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                disabled={savingName}
                className="px-3.5 py-1.5 rounded-lg border border-stroke text-ink-muted text-sm font-medium hover:bg-surface transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </FieldRow>

      <FieldRow
        label="Username"
        helperText="Used for mentions, search, and your profile link. Can be changed once every 30 days."
        cooldownDays={30}
        changedAt={user?.usernameChangedAt}
      >
        {!editingUsername ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-base text-ink">@{user?.username}</span>
            <button
              onClick={startEditUsername}
              disabled={usernameLocked}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:text-ink-muted transition shrink-0"
            >
              <FiEdit2 size={12} />
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-base">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="username"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveUsername()}
                className="w-full pl-7 pr-8 py-2 rounded-xl border border-stroke bg-surface text-ink text-base outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatusIcon}
              </span>
            </div>
            {usernameStatusMessage && (
              <p
                className={`text-sm ${
                  status === "available"
                    ? "text-green-600"
                    : status === "taken" || status === "invalid"
                      ? "text-red-500"
                      : "text-ink-muted"
                }`}
              >
                {usernameStatusMessage}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveUsername}
                disabled={status !== "available" || savingUsername}
                className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
              >
                {savingUsername ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingUsername(false)}
                disabled={savingUsername}
                className="px-3.5 py-1.5 rounded-lg border border-stroke text-ink-muted text-sm font-medium hover:bg-surface transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </FieldRow>
    </section>
  );
};

export default AccountIdentitySection;
