import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import ConfirmRoleChangeModal from "../components/ConfirmRoleChangeModal";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
import { FiSearch, FiShield } from "react-icons/fi";

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

const RoleRow = ({ target, currentUserId, onRequestRoleChange }) => {
  const isSelf = target._id === currentUserId;

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
              onRequestRoleChange={(target, newRole) =>
                setPendingRoleChange({ user: target, newRole })
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
