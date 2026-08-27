import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { FaArrowLeft, FaSyncAlt } from "react-icons/fa";
import { useAuth } from "../context/useAuth";

// PHASE 3 — admin-only view over the append-only moderation audit log
// (GET /admin/audit is requireAdmin server-side; the guard below mirrors
// that so non-admins get a clear screen instead of a 403 toast).

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "user_suspended", label: "Suspensions" },
  { value: "user_banned", label: "Bans" },
  { value: "user_unrestricted", label: "Access restored" },
  { value: "user_role_changed", label: "Role changes" },
  { value: "user_warned", label: "Warnings" },
  { value: "user_permissions_changed", label: "Permission changes" },
  { value: "report_resolved", label: "Reports resolved" },
];

const TARGET_OPTIONS = [
  { value: "", label: "All targets" },
  { value: "user", label: "Users" },
  { value: "post", label: "Posts" },
  { value: "comment", label: "Comments" },
  { value: "message", label: "Messages" },
  { value: "report", label: "Reports" },
];

const ACTION_LABELS = Object.fromEntries(
  ACTION_OPTIONS.slice(1).map(({ value, label }) => [value, label]),
);

const ACTION_STYLES = {
  user_suspended: "bg-amber-100 text-amber-700",
  user_banned: "bg-red-100 text-red-600",
  user_unrestricted: "bg-green-100 text-green-700",
  user_role_changed: "bg-primary-100 text-primary-700",
  user_warned: "bg-orange-100 text-orange-700",
  report_resolved: "bg-blue-100 text-blue-600",
};

const shortId = (id) => String(id || "").slice(-6);

const formatWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
};

const formatUntil = (value) =>
  value ? new Date(value).toLocaleString() : null;

// Human-readable rendering of the action-specific payload.
const DetailCell = ({ log }) => {
  const d = log.detail || {};
  switch (log.action) {
    case "user_suspended":
      return (
        <span>
          {d.reason ? `“${d.reason}â€` : "No reason recorded"}
          {formatUntil(d.suspendedUntil) && (
            <>
              {" — until "}
              <span className="font-medium">{formatUntil(d.suspendedUntil)}</span>
            </>
          )}
        </span>
      );
    case "user_banned":
      return <span>{d.reason ? `“${d.reason}â€` : "No reason recorded"}</span>;
    case "user_unrestricted":
      return (
        <span>
          Cleared:
          {d.clearedBan ? " ban" : ""}
          {d.clearedSuspensionUntil ? " suspension" : ""}
          {!d.clearedBan && !d.clearedSuspensionUntil && " nothing (no-op)"}
        </span>
      );
    case "user_role_changed":
      return (
        <span>
          New role: <span className="font-medium">{d.toRole}</span>
        </span>
      );
    case "user_warned":
      return (
        <span>
          {d.reason ? `“${d.reason}â€` : "No reason recorded"}
          {d.strikeCount
            ? ` — ${d.strikeCount} strike${d.strikeCount === 1 ? "" : "s"} total`
            : ""}
        </span>
      );
    case "user_permissions_changed":
      return (
        <span>
          Now:{" "}
          <span className="font-medium">
            {d.permissions?.length ? d.permissions.join(", ") : "(default set)"}
          </span>
          {" · was: "}
          {d.previousPermissions?.length
            ? d.previousPermissions.join(", ")
            : "(default set)"}
        </span>
      );
    case "report_resolved":
      return (
        <span>
          <span className="font-medium">{d.status}</span>
          {" · "}
          {d.note ? `“${d.note}â€` : "no note"}
          {log.target?.snapshot?.removeContent && " · content removed"}
        </span>
      );
    default:
      return <code className="text-sm">{JSON.stringify(d)}</code>;
  }
};

// "@username" for user actions, otherwise "<type> …<short-id>".
const TargetCell = ({ log }) => {
  const t = log.target || {};
  const s = t.snapshot || {};
  if (t.type === "report") {
    return (
      <span>
        {s.targetType || "item"}{" "}
        <span className="text-ink-muted">…{shortId(s.targetId)}</span>
      </span>
    );
  }
  return (
    <span>
      {t.type === "user" && s.username ? `@${s.username}` : `${t.type}`}
      {t.type !== "user" && (
        <span className="text-ink-muted"> …{shortId(t.ref)}</span>
      )}
    </span>
  );
};

const AdminAuditLog = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // Phase 5 — moderators granted view_audit_log see this page too;
  // everyone else gets the notice below (server enforces the same rule).
  const canView =
    isAdmin || !!user?.permissions?.includes("view_audit_log");

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  const fetchPage = useCallback(
    async (nextOffset, append) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(nextOffset),
        });
        if (actionFilter) params.set("action", actionFilter);
        if (targetFilter) params.set("targetType", targetFilter);

        const res = await api.get(`/admin/audit?${params.toString()}`);
        setLogs((prev) =>
          append ? [...prev, ...res.data.logs] : res.data.logs,
        );
        setTotal(res.data.total);
        setHasMore(res.data.hasMore);
        setOffset(nextOffset + res.data.logs.length);
      } catch (e) {
        console.error(e);
        toast.error(
          e.response?.data?.message || "Couldn't load the audit log.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [actionFilter, targetFilter],
  );

  // Filter changes restart from the top; first mount loads page 1.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/filter-change
    if (canView) fetchPage(0, false);
  }, [canView, fetchPage]);

  if (!canView) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-ink mb-2">
            No audit access
          </h1>
          <p className="text-ink-sub text-base">
            The moderation audit log is restricted to admin accounts and
            moderators granted the view-audit-log permission.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-sub hover:text-ink transition"
            >
              <FaArrowLeft className="text-[10px]" /> Back to role management
            </Link>
            <h1 className="text-3xl font-bold text-ink mt-2">
              Moderation audit log
            </h1>
            <p className="text-ink-sub text-base mt-1">
              Append-only record of restrictions, reversals, role changes and
              report resolutions. {total} entr{total === 1 ? "y" : "ies"}.
            </p>
          </div>
          <button
            onClick={() => fetchPage(0, false)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke text-base font-medium text-ink-sub hover:text-ink hover:bg-surface transition disabled:opacity-50"
          >
            <FaSyncAlt
              className={isLoading ? "animate-spin text-sm" : "text-sm"}
            />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-stroke bg-card px-3 py-2 text-base text-ink focus:outline-none focus:border-primary-500"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="rounded-lg border border-stroke bg-card px-3 py-2 text-base text-ink focus:outline-none focus:border-primary-500"
          >
            {TARGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-stroke overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="text-left text-sm uppercase tracking-wide text-ink-muted border-b border-stroke">
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Target</th>
                  <th className="px-4 py-3 font-semibold">Detail</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log._id}
                    className="border-b border-stroke last:border-0 align-top"
                  >
                    <td
                      className="px-4 py-3 whitespace-nowrap text-ink-sub"
                      title={new Date(log.createdAt).toLocaleString()}
                    >
                      {formatWhen(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-ink">
                        {log.actor?.name || "—"}
                      </div>
                      {log.actor?.username && (
                        <div className="text-sm text-ink-muted">
                          @{log.actor.username}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                          ACTION_STYLES[log.action] || "bg-surface text-ink-sub"
                        }`}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-sub">
                      <TargetCell log={log} />
                    </td>
                    <td className="px-4 py-3 text-ink-sub max-w-xs">
                      <DetailCell log={log} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-muted font-mono">
                      {log.ip || "—"}
                    </td>
                  </tr>
                ))}

                {!isLoading && logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                      No audit entries match these filters yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="border-t border-stroke p-3 text-center">
              <button
                onClick={() => fetchPage(offset, true)}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-base font-medium text-primary-600 hover:bg-primary-50 transition disabled:opacity-50"
              >
                {isLoading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminAuditLog;

