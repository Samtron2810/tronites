import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import ConfirmRoleChangeModal from "../components/ConfirmRoleChangeModal";
import ConfirmPermissionChangeModal from "../components/ConfirmPermissionChangeModal";
import ConfirmRestrictionModal from "../components/ConfirmRestrictionModal";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
import { PERMISSION_OPTIONS } from "../constants/permissions";
import { FiSearch, FiShield, FiMoreVertical } from "react-icons/fi";

const ROLE_TABS = [
  { value: "", label: "All" },
  { value: "user", label: "Users" },
  { value: "moderator", label: "Moderators" },
  { value: "admin", label: "Admins" },
];

const ROLE_STYLES = {
  user: "bg-gray-100 text-gray-600",
  moderator: "bg-primary-50 text-primary-700",
  admin: "bg-red-50 text-red-600",
};

const RoleRow = ({
  target,
  currentUserId,
  viewerIsAdmin,
  selected,
  onToggleSelect,
  onRequestRoleChange,
  onRequestRestriction,
  onRequestPermissions,
}) => {
  const isSelf = target._id === currentUserId;
  const isSuspended =
    !!target.suspendedUntil && new Date(target.suspendedUntil) > new Date();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the actions menu on outside click (PostCard's pattern).
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Restriction targets: never yourself, never admins — mirrors the
  // backend guards so the menu simply doesn't offer impossible actions.
  const canRestrict = !isSelf && target.role !== "admin";

  const handleChange = (e) => {
    const newRole = e.target.value;
    if (newRole === target.role) return;
    onRequestRoleChange(target, newRole);
  };

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {/* Phase 6 — bulk-selection checkbox. Hidden for self/admin rows
            since the bulk endpoints can never target those anyway. */}
        {viewerIsAdmin && !isSelf && target.role !== "admin" && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="accent-primary-600 shrink-0"
            aria-label={`Select ${target.name} for bulk action`}
          />
        )}
        <img
          src={target.profilePic || defaultAvatar}
          alt={target.name}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">
            {target.name}{" "}
            {isSelf && (
              <span className="text-xs text-ink-muted font-normal">(you)</span>
            )}
          </p>
          <p className="text-xs text-ink-muted truncate">{target.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {target.banned && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600"
            title={target.restrictionReason || undefined}
          >
            banned
          </span>
        )}
        {!target.banned && isSuspended && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
            title={
              `${target.restrictionReason || "No reason recorded"} — ends ` +
              new Date(target.suspendedUntil).toLocaleString()
            }
          >
            until {new Date(target.suspendedUntil).toLocaleDateString()}
          </span>
        )}
        {/* Phase 4 — strike count. Count only comes through the admin
            DTO; individual reasons stay between mods and the audit log. */}
        {target.strikesCount > 0 && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700"
            title={`${target.strikesCount} formal warning${target.strikesCount === 1 ? "" : "s"} on record`}
          >
            {target.strikesCount} strike{target.strikesCount === 1 ? "" : "s"}
          </span>
        )}
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_STYLES[target.role]}`}
        >
          {target.role}
        </span>
        <select
          value={target.role}
          onChange={handleChange}
          className="text-xs border border-stroke rounded-lg px-2 py-1.5 text-ink bg-card outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50"
        >
          <option value="user">user</option>
          <option value="moderator">moderator</option>
          <option value="admin">admin</option>
        </select>

        {/* Phase 5 — per-moderator capability editor (admin only). */}
        {viewerIsAdmin && target.role === "moderator" && (
          <button
            onClick={() => onRequestPermissions(target)}
            className="p-1.5 rounded-lg text-ink-muted hover:text-primary-600 hover:bg-primary-50 transition"
            title={`Permissions: ${
              target.permissions?.length
                ? target.permissions.join(", ")
                : "default set"
            }`}
            aria-label="Edit permissions"
          >
            <FiShield size={15} />
          </button>
        )}

        {canRestrict && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition"
              title="Account actions"
              aria-label="Account actions"
            >
              <FiMoreVertical size={15} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1">
                {target.banned ? (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestRestriction(target, "unrestrict");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary-700 hover:bg-surface transition"
                  >
                        <span className="font-medium">Restore access</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onRequestRestriction(target, "suspend");
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink-sub hover:bg-surface transition"
                    >
                      <span className="font-medium">
                        {isSuspended ? "Adjust suspension…" : "Suspend…"}
                      </span>
                    </button>
                    {viewerIsAdmin && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onRequestRestriction(target, "ban");
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <span className="font-medium">Ban permanently…</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  // { user, mode: "suspend" | "ban" | "unrestrict" } for the restriction
  // confirm modal.
  const [pendingRestriction, setPendingRestriction] = useState(null);
  // Phase 5 — { user } for the permission editor modal.
  const [pendingPermissions, setPendingPermissions] = useState(null);
  // Phase 6 — bulk selection ("_id" strings), the bulk confirm modal,
  // and the user-list sort option ("Most reported").
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pendingBulk, setPendingBulk] = useState(null); // { mode }
  const [sortBy, setSortBy] = useState("");

  const toggleSelected = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const observerTarget = useRef(null);

  const isAdmin = user && user.role === "admin";

  const fetchUsers = useCallback(async (query, role, pageNum = 1, sort = "") => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const res = await api.get("/admin/users", {
        params: {
          q: query,
          role: role || undefined,
          page: pageNum,
          limit: 20,
          sort: sort || undefined,
        },
      });

      if (pageNum === 1) setUsers(res.data.users);
      else setUsers((prev) => [...prev, ...res.data.users]);

      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load users.");
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const t = window.setTimeout(() => {
      fetchUsers(search.trim(), roleFilter, 1, sortBy);
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, search, roleFilter, sortBy]);

  useEffect(() => {
    if (!isAdmin) return;
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !loading
        ) {
          fetchUsers(search.trim(), roleFilter, page + 1);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [
    isAdmin,
    page,
    hasMore,
    isLoadingMore,
    loading,
    search,
    roleFilter,
    fetchUsers,
  ]);

  // Guard client-side too — the endpoints already 403 non-admins, this
  // just avoids rendering a role-management UI that would only ever
  // error.
  if (user && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleRoleChange = async (targetId, newRole) => {
    try {
      const res = await api.put(`/admin/users/${targetId}/role`, {
        role: newRole,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u._id === targetId
            ? {
                ...u,
                role: res.data.user.role,
                // Promotion seeds defaults / demotion clears them --
                // keep the row's permission set in sync either way.
                permissions: res.data.user.permissions,
              }
            : u,
        ),
      );
      toast.success(`Role updated to ${res.data.user.role}.`);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't update role.");
    }
  };

  // Phase 5 -- save a moderator's explicit permission set. The modal
  // owns the draft; this just ships it and folds the server DTO back
  // into the row so badges/checkboxes stay truthful.
  const handleConfirmPermissions = async (permissions) => {
    if (!pendingPermissions) return;
    try {
      const res = await api.put(
        `/admin/users/${pendingPermissions.user._id}/permissions`,
        { permissions },
      );
      setUsers((prev) =>
        prev.map((u) =>
          u._id === pendingPermissions.user._id
            ? { ...u, permissions: res.data.user.permissions }
            : u,
        ),
      );
      toast.success("Permissions updated.");
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't update permissions.");
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    await handleRoleChange(
      pendingRoleChange.user._id,
      pendingRoleChange.newRole,
    );
    setPendingRoleChange(null);
  };

  // Suspend / ban / unrestrict — endpoint picked by mode. Returns true on
  // success so the modal only closes when the action actually landed;
  // row state updates from the server's DTO (single source of truth).
  const handleConfirmRestriction = async ({ until, reason }) => {
    if (!pendingRestriction) return false;
    const { user: target, mode } = pendingRestriction;
    const endpoint =
      mode === "suspend" ? "suspend" : mode === "ban" ? "ban" : "unrestrict";
    try {
      const res = await api.put(`/admin/users/${target._id}/${endpoint}`,
        mode === "suspend"
          ? { until: until.toISOString(), reason }
          : mode === "ban"
            ? { reason }
            : {},
      );
      setUsers((prev) =>
        prev.map((u) => (u._id === target._id ? res.data.user : u)),
      );
      toast.success(
        mode === "suspend"
          ? `Suspended until ${new Date(until).toLocaleString()}.`
          : mode === "ban"
            ? "Account banned."
            : "Access restored.",
      );
      return true;
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't update the restriction.",
      );
      return false;
    }
  };

  const handleRestrictionSettled = (closed) => {
    if (closed) setPendingRestriction(null);
  };

  // Phase 6 — bulk suspend/ban/unrestrict via /admin/users/bulk. The
  // modal closes only when the request itself landed; per-user failures
  // (self/admin targets, already-banned) are summarized in a toast, and
  // the page refetches so restriction chips reflect reality either way.
  const handleConfirmBulk = async ({ until, reason }) => {
    if (!pendingBulk) return false;
    try {
      const res = await api.post("/admin/users/bulk", {
        userIds: [...selectedIds],
        action: pendingBulk.mode,
        ...(pendingBulk.mode === "suspend"
          ? { until: until.toISOString() }
          : {}),
        reason,
      });
      const { succeeded, failed } = res.data;
      if (failed > 0) {
        toast.error(
          `${succeeded} succeeded, ${failed} couldn't be applied (you and admin accounts are never targetable).`,
          { duration: 6000 },
        );
      } else {
        toast.success(
          `${succeeded} account${succeeded === 1 ? "" : "s"} updated.`,
        );
      }
      setSelectedIds(new Set());
      await fetchUsers(search.trim(), roleFilter, 1, sortBy);
      return true;
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't apply bulk action.");
      return false;
    }
  };

  return (
    <MainLayout>
      {pendingRoleChange && (
        <ConfirmRoleChangeModal
          targetUser={pendingRoleChange.user}
          newRole={pendingRoleChange.newRole}
          onConfirm={handleConfirmRoleChange}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}

      {pendingPermissions && (
        <ConfirmPermissionChangeModal
          targetUser={pendingPermissions.user}
          initialPermissions={pendingPermissions.user.permissions}
          onConfirm={handleConfirmPermissions}
          onCancel={() => setPendingPermissions(null)}
        />
      )}

      {/* Phase 6 — bulk confirm. count>1 flips the shared modal into its
          pluralized mode; targetUser stays null because the summary line
          replaces the avatar block. */}
      {pendingBulk && (
        <ConfirmRestrictionModal
          mode={pendingBulk.mode}
          targetUser={null}
          count={selectedIds.size}
          onConfirm={handleConfirmBulk}
          onCancel={() => setPendingBulk(null)}
        />
      )}
      {pendingRestriction && (
        <ConfirmRestrictionModal
          mode={pendingRestriction.mode}
          targetUser={pendingRestriction.user}
          onConfirm={async (payload) => {
            const ok = await handleConfirmRestriction(payload);
            handleRestrictionSettled(ok);
          }}
          onCancel={() => setPendingRestriction(null)}
        />
      )}
      <div className="flex items-center gap-2 mb-1">
        <FiShield className="text-primary-600" size={18} />
        <h1 className="text-xl font-bold text-ink">Manage roles</h1>
      </div>
      <p className="text-sm text-ink-muted mb-5">
        Grant or revoke moderator and admin access.
      </p>

      <div className="bg-card border border-stroke rounded-2xl px-4 py-3 flex items-center gap-3 mb-3">
        <FiSearch className="text-ink-muted shrink-0" size={16} />
        <input
          type="text"
          placeholder="Search by name, username, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm text-ink placeholder:text-ink-muted outline-none bg-transparent"
        />
      </div>

      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 bg-card border border-stroke rounded-xl p-1 w-fit">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                roleFilter === tab.value
                  ? "bg-primary-100 text-primary-700"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Phase 6 — "most reported" surfaces accounts the community
            flags most, via the report-count aggregation on the backend. */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-card border border-stroke rounded-xl px-3 py-2 text-sm text-ink outline-none focus:border-primary-500"
        >
          <option value="">Newest first</option>
          <option value="reportCount">Most reported</option>
        </select>
      </div>

      {/* Phase 6 — bulk selection action bar. Only admins see checkboxes
          at all, so this only ever appears for them. */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm font-semibold text-ink">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => setPendingBulk({ mode: "suspend" })}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition"
          >
            Suspend…
          </button>
          <button
            onClick={() => setPendingBulk({ mode: "ban" })}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition"
          >
            Ban…
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-ink-sub border border-stroke hover:bg-surface transition"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-10">
          No users found.
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <RoleRow
              key={u._id}
              target={u}
              currentUserId={user._id}
              viewerIsAdmin={isAdmin}
              onRequestRoleChange={(target, newRole) =>
                setPendingRoleChange({ user: target, newRole })
              }
              onRequestRestriction={(target, mode) =>
                setPendingRestriction({ user: target, mode })
              }
              onRequestPermissions={(target) =>
                setPendingPermissions({ user: target })
              }
              selected={selectedIds.has(u._id)}
              onToggleSelect={() => toggleSelected(u._id)}
            />
          ))}
        </div>
      )}

      {hasMore && users.length > 0 && (
        <div ref={observerTarget} className="py-4 text-center">
          {isLoadingMore && (
            <p className="text-xs text-ink-muted">Loading more...</p>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default AdminUsers;
