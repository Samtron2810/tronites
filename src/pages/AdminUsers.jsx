import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import ConfirmRoleChangeModal from "../components/ConfirmRoleChangeModal";
import ConfirmRestrictionModal from "../components/ConfirmRestrictionModal";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
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
  onRequestRoleChange,
  onRequestRestriction,
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
  const observerTarget = useRef(null);

  const isAdmin = user && user.role === "admin";

  const fetchUsers = useCallback(async (query, role, pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const res = await api.get("/admin/users", {
        params: { q: query, role: role || undefined, page: pageNum, limit: 20 },
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
      fetchUsers(search.trim(), roleFilter, 1);
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, search, roleFilter]);

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
          u._id === targetId ? { ...u, role: res.data.user.role } : u,
        ),
      );
      toast.success(`Role updated to ${res.data.user.role}.`);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't update role.");
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

      <div className="flex gap-1 mb-5 bg-card border border-stroke rounded-xl p-1 w-fit">
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
