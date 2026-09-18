import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { FaArrowLeft, FaFileCsv, FaSyncAlt } from "react-icons/fa";
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
  { value: "post_admin_promoted", label: "Promotions granted" },
  { value: "post_promotion_extended", label: "Promotions extended" },
  { value: "post_promotion_cancelled", label: "Promotions cancelled" },
  { value: "appeal_granted", label: "Appeals granted" },
  { value: "appeal_denied", label: "Appeals denied" },
  { value: "verification_request_approved", label: "Verification approved" },
  { value: "verification_request_denied", label: "Verification denied" },
  { value: "user_verification_granted", label: "Badge granted (admin)" },
  { value: "user_verification_revoked", label: "Badge revoked (admin)" },
  { value: "user_shadow_ranked", label: "Shadow-ranked" },
  { value: "user_shadow_rank_lifted", label: "Shadow rank lifted" },
  { value: "user_auto_suspended", label: "Auto-suspensions" },
  { value: "user_auto_banned", label: "Auto-bans" },
  { value: "moderator_note_added", label: "Moderator notes added" },
  { value: "moderator_note_deleted", label: "Moderator notes deleted" },
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
  post_admin_promoted: "bg-primary-100 text-primary-700",
  post_promotion_extended: "bg-primary-100 text-primary-700",
  post_promotion_cancelled: "bg-amber-100 text-amber-700",
  appeal_granted: "bg-green-100 text-green-700",
  appeal_denied: "bg-gray-100 text-gray-500",
  verification_request_approved: "bg-emerald-100 text-emerald-700",
  verification_request_denied: "bg-gray-100 text-gray-500",
  user_verification_granted: "bg-emerald-100 text-emerald-700",
  user_verification_revoked: "bg-red-100 text-red-600",
  user_shadow_ranked: "bg-amber-100 text-amber-700",
  user_shadow_rank_lifted: "bg-green-100 text-green-700",
  user_auto_suspended: "bg-amber-100 text-amber-700",
  user_auto_banned: "bg-red-100 text-red-600",
  moderator_note_added: "bg-primary-100 text-primary-700",
  moderator_note_deleted: "bg-gray-100 text-gray-500",
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

// Strip IPv4-mapped IPv6 prefix (::ffff:) that Express adds when
// trust proxy returns the real IP, and normalise loopback aliases.
const cleanIp = (ip) => {
  if (!ip) return "—";
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return "localhost";
  const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return v4mapped[1];
  return ip;
};

// Windowed page list for the numbered pagination control: first, last and
// the current neighbourhood only, so a log with hundreds of pages does not
// render hundreds of buttons.
const pageWindow = (current, last) => {
  const wanted = new Set([1, last, current - 1, current, current + 1]);
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= last)
    .sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("...");
    out.push(p);
    prev = p;
  }
  return out;
};

// Report resolution outcomes, used by the pre-audit view.
const STATUS_LABELS = { actioned: "Actioned", dismissed: "Dismissed" };

// VERIFICATION_TYPE_LABELS — maps the internal type key to the badge
// name shown in the queue; duplicated from constants/verification.js
// to keep this file self-contained (avoids a cross-page import).
const BADGE_LABELS = {
  individual: "Individual",
  business: "Business",
  government: "Government",
  creator: "Creator",
  staff: "Staff",
};

// Human-readable rendering of the action-specific payload.
const DetailCell = ({ log }) => {
  const d = log.detail || {};
  switch (log.action) {
    case "user_suspended":
      return (
        <span>
          {d.reason ? <>“{d.reason}”</> : "No reason recorded"}
          {formatUntil(d.suspendedUntil) && (
            <>
              {" — until "}
              <span className="font-medium">{formatUntil(d.suspendedUntil)}</span>
            </>
          )}
        </span>
      );
    case "user_banned":
      return <span>{d.reason ? <>“{d.reason}”</> : "No reason recorded"}</span>;
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
          {d.fromRole && (
            <><span className="text-ink-muted">{d.fromRole}</span>{" → "}</>
          )}
          <span className="font-medium">{d.toRole}</span>
        </span>
      );
    case "user_warned":
      return (
        <span>
          {d.reason ? <>“{d.reason}”</> : "No reason recorded"}
          {d.strikeCount
            ? ` — ${d.strikeCount} strike${d.strikeCount === 1 ? "" : "s"} total`
            : ""}
        </span>
      );
    case "user_permissions_changed":
      return (
        <span>
          <span className="font-medium">
            {d.permissions?.length ? d.permissions.join(", ") : "(default set)"}
          </span>
          {d.previousPermissions !== undefined && (
            <span className="text-ink-muted">
              {" · was: "}
              {d.previousPermissions?.length ? d.previousPermissions.join(", ") : "(default set)"}
            </span>
          )}
        </span>
      );
    case "report_resolved":
      return (
        <span>
          <span className="font-medium">{d.status}</span>
          {d.note ? <>{" · "}“{d.note}”</> : " · no note"}
          {log.target?.snapshot?.removeContent && " · content removed"}
        </span>
      );
    case "appeal_granted":
    case "appeal_denied": {
      const granted = log.action === "appeal_granted";
      return (
        <span>
          <span className={`font-medium ${granted ? "text-green-700" : "text-gray-500"}`}>
            {granted ? "Granted" : "Denied"}
          </span>
          {d.restrictionType && (
            <span className="text-ink-muted"> · {d.restrictionType} appeal</span>
          )}
          {d.note ? <>{" · "}“{d.note}”</> : ""}
        </span>
      );
    }
    case "verification_request_approved":
    case "verification_request_denied": {
      const approved = log.action === "verification_request_approved";
      return (
        <span>
          <span className={`font-medium ${approved ? "text-emerald-700" : "text-gray-500"}`}>
            {approved ? "Approved" : "Denied"}
          </span>
          {d.verificationType && (
            <span className="text-ink-muted">
              {" · "}{BADGE_LABELS[d.verificationType] || d.verificationType} badge
            </span>
          )}
          {d.note ? <>{" · "}“{d.note}”</> : ""}
        </span>
      );
    }
    case "user_verification_granted":
    case "user_verification_revoked": {
      const granted = log.action === "user_verification_granted";
      return (
        <span>
          <span className={`font-medium ${granted ? "text-emerald-700" : "text-red-600"}`}>
            {granted ? "Badge granted" : "Badge revoked"}
          </span>
          {d.verificationType && (
            <span className="text-ink-muted">
              {" · "}{BADGE_LABELS[d.verificationType] || d.verificationType}
            </span>
          )}
        </span>
      );
    }
    // ── Promotion management (admin/moderator comps) ─────────────────────
    case "post_admin_promoted":
      return (
        <span>
          <span className="font-medium text-primary-700">Granted</span>
          <span className="text-ink-muted"> · {d.days} day{d.days === 1 ? "" : "s"}</span>
          {formatUntil(d.promotedUntil) && (
            <span className="text-ink-muted">
              {" "}· until {formatUntil(d.promotedUntil)}
            </span>
          )}
        </span>
      );
    case "post_promotion_extended":
      return (
        <span>
          <span className="font-medium text-primary-700">Extended</span>
          <span className="text-ink-muted"> · +{d.addedDays} day{d.addedDays === 1 ? "" : "s"}</span>
          {formatUntil(d.promotedUntil) && (
            <span className="text-ink-muted">
              {" "}· now until {formatUntil(d.promotedUntil)}
            </span>
          )}
        </span>
      );
    case "post_promotion_cancelled":
      return (
        <span>
          {d.wasActive ? "Active promotion ended" : "Pending promotion cancelled"}
          {d.previousSource && (
            <span className="text-ink-muted"> · was {d.previousSource}</span>
          )}
        </span>
      );
    // Phase 7 - moderator notes. The note body IS the point of these
    // entries: for a deletion the trail is the only surviving copy.
    case "moderator_note_added":
      return <span>{d.body ? `"${d.body}"` : "Empty note"}</span>;
    case "moderator_note_deleted":
      return (
        <span>
          Deleted: {d.body ? `"${d.body}"` : "(body not recorded)"}
        </span>
      );

    default:
      // Fallback: render key=value pairs instead of raw JSON blob
      if (Object.keys(d).length === 0) return <span className="text-ink-muted">—</span>;
      return (
        <span className="text-sm text-ink-muted">
          {Object.entries(d)
            .filter(([, v]) => v !== null && v !== "" && v !== undefined)
            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join(" · ") || "—"}
        </span>
      );
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

  const [tab, setTab] = useState("trail");

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [actorInput, setActorInput] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pre-audit view: report resolutions that predate the trail (see the
  // backend listPreAuditResolutions endpoint).
  const [legacy, setLegacy] = useState([]);
  const [legacyTotal, setLegacyTotal] = useState(0);
  const [legacyOffset, setLegacyOffset] = useState(0);
  const [legacyHasMore, setLegacyHasMore] = useState(false);
  const [legacyLoaded, setLegacyLoaded] = useState(false);
  const [isLegacyLoading, setIsLegacyLoading] = useState(false);

  // Unlogged-state view: restriction state with no audit coverage.
  const [gaps, setGaps] = useState([]);
  const [gapsLoaded, setGapsLoaded] = useState(false);
  const [isGapsLoading, setIsGapsLoading] = useState(false);

  // Subtitle states what the current tab is ACTUALLY showing - a filtered
  // count, not the collection size - so a filtered view can never be
  // mistaken for the whole trail.
  const subtitle =
    tab === "trail"
      ? `Append-only record of restrictions, reversals, role changes and report resolutions. Showing ${logs.length} of ${total} entr${total === 1 ? "y" : "ies"}.`
      : tab === "resolutions"
        ? `Report resolutions made before the audit trail existed. They survive only on the report records themselves - ${legacyTotal} in total, none invented.`
        : `Restriction state with no audit coverage at all. ${gaps.length} account${gaps.length === 1 ? "" : "s"} affected - listed so the gap is visible, not reconstructed.`;

  // The actor id is free text; only a full 24-hex ObjectId is worth
  // sending (the server ignores anything else anyway), and debouncing
  // stops a pasted id from firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setActorFilter(actorInput.trim()), 400);
    return () => clearTimeout(t);
  }, [actorInput]);

  // Filters shared by the table and the CSV export, so a download can
  // never contain rows the table is hiding.
  const trailParams = useCallback(
    (forPage) => ({
      limit: PAGE_SIZE,
      page: forPage,
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(targetFilter ? { targetType: targetFilter } : {}),
      ...(actorFilter ? { actor: actorFilter } : {}),
      ...(fromFilter ? { from: fromFilter } : {}),
      ...(toFilter ? { to: toFilter } : {}),
      ...(oldestFirst ? { sort: "createdAt" } : {}),
    }),
    [actionFilter, targetFilter, actorFilter, fromFilter, toFilter, oldestFirst],
  );

  const fetchPage = useCallback(
    async (nextPage) => {
      setIsLoading(true);
      try {
        const params = trailParams(nextPage);
        // Only page 1 is ever cacheable (see caching-spec.md section 4),
        // and the TTL is deliberately short: an audit log cached forever
        // is a log that silently lies about its own size, which is exactly
        // the confusion this page was reported with.
        const res =
          nextPage === 1
            ? await api.getCached("/admin/audit", { params, ttlMs: 30_000 })
            : await api.get("/admin/audit", { params });
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setTotalPages(Math.max(res.data.totalPages || 1, 1));
        setPage(res.data.currentPage || nextPage);
      } catch (e) {
        console.error(e);
        toast.error(e.response?.data?.message || "Couldn't load the audit log.");
      } finally {
        setIsLoading(false);
      }
    },
    [trailParams],
  );

  const fetchLegacy = useCallback(async (nextOffset) => {
    setIsLegacyLoading(true);
    try {
      // Never cached: this view exists precisely because the trail was
      // incomplete, so it must not inherit its staleness.
      const res = await api.get("/admin/audit/pre-audit-resolutions", {
        params: { limit: PAGE_SIZE, offset: nextOffset },
      });
      setLegacy((prev) =>
        nextOffset === 0 ? res.data.reports : [...prev, ...res.data.reports],
      );
      setLegacyTotal(res.data.total);
      setLegacyHasMore(res.data.hasMore);
      setLegacyOffset(nextOffset + res.data.reports.length);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't load pre-audit history.");
    } finally {
      setIsLegacyLoading(false);
      setLegacyLoaded(true);
    }
  }, []);

  const fetchGaps = useCallback(async () => {
    setIsGapsLoading(true);
    try {
      const res = await api.get("/admin/audit/gaps");
      setGaps(res.data.gaps || []);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't load unlogged state.");
    } finally {
      setIsGapsLoading(false);
      setGapsLoaded(true);
    }
  }, []);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // Same filters as the table, minus pagination - the export is the
      // whole matching set.
      const params = { ...trailParams(page) };
      delete params.page;
      delete params.limit;
      const res = await api.get("/admin/audit/export", {
        params,
        responseType: "blob",
      });
      // Blob + anchor download, matching CampaignManager.handleExport.
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `moderation-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export the audit log.");
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    api.invalidate("/admin/audit");
    if (tab === "trail") {
      fetchPage(page);
    } else if (tab === "resolutions") {
      setLegacyLoaded(false);
      fetchLegacy(0);
    } else {
      setGapsLoaded(false);
      fetchGaps();
    }
  };

  // Each side view loads once per visit; Refresh clears the flag so the
  // effect above re-runs it.
  useEffect(() => {
    if (!canView) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-tab-open
    if (tab === "resolutions" && !legacyLoaded) fetchLegacy(0);
    if (tab === "gaps" && !gapsLoaded) fetchGaps();
  }, [canView, tab, legacyLoaded, gapsLoaded, fetchLegacy, fetchGaps]);

  // Filter changes restart from page 1; first mount loads page 1.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/filter-change
    if (canView) fetchPage(1);
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
            <p className="text-ink-sub text-base mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tab === "trail" && (
              <button
                onClick={handleExport}
                disabled={exporting || isLoading}
                title="Download every entry matching the current filters"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke text-base font-medium text-ink-sub hover:text-ink hover:bg-surface transition disabled:opacity-50"
              >
                <FaFileCsv className="text-sm" />
                {exporting ? "Exporting..." : "Export CSV"}
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stroke text-base font-medium text-ink-sub hover:text-ink hover:bg-surface transition disabled:opacity-50"
            >
              <FaSyncAlt
                className={isLoading ? "animate-spin text-sm" : "text-sm"}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs - one page, three views of the same moderation history. */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {[
            { id: "trail", label: "Audit trail" },
            { id: "resolutions", label: "Pre-audit resolutions" },
            { id: "gaps", label: "Unlogged state" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-lg text-base font-medium transition ${
                tab === t.id
                  ? "bg-primary-50 text-primary-600 border border-primary-200"
                  : "border border-stroke text-ink-sub hover:text-ink hover:bg-surface"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "trail" && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
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
            <label className="flex items-center gap-2 text-base text-ink-sub">
              Actor id
              <input
                value={actorInput}
                onChange={(e) => setActorInput(e.target.value)}
                placeholder="24-character user id"
                className="w-56 rounded-lg border border-stroke bg-card px-3 py-2 text-base text-ink font-mono placeholder:text-ink-muted focus:outline-none focus:border-primary-500"
              />
            </label>
            <label className="flex items-center gap-2 text-base text-ink-sub">
              From
              <input
                type="date"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
                className="rounded-lg border border-stroke bg-card px-3 py-2 text-base text-ink focus:outline-none focus:border-primary-500"
              />
            </label>
            <label className="flex items-center gap-2 text-base text-ink-sub">
              To
              <input
                type="date"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
                className="rounded-lg border border-stroke bg-card px-3 py-2 text-base text-ink focus:outline-none focus:border-primary-500"
              />
            </label>
            <label className="flex items-center gap-2 text-base text-ink-sub">
              <input
                type="checkbox"
                checked={oldestFirst}
                onChange={(e) => setOldestFirst(e.target.checked)}
              />
              Oldest first
            </label>
          </div>
        )}

        {/* TRAIL - the audit log itself. */}
        {tab === "trail" && (
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
                          {log.actor?.name || "-"}
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
                        {log.detail?.backfilled && (
                          <span
                            className="ml-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 align-middle"
                            title="Reconstructed from the report record during backfill - not a live write."
                          >
                            backfilled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-sub">
                        <TargetCell log={log} />
                      </td>
                      <td className="px-4 py-3 text-ink-sub max-w-xs">
                        <DetailCell log={log} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-muted font-mono">
                        {log.ip ? cleanIp(log.ip) : "-"}
                      </td>
                    </tr>
                  ))}

                  {isLoading && logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                        Loading audit entries...
                      </td>
                    </tr>
                  )}

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

            {totalPages > 1 && (
              <div className="border-t border-stroke p-3 flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  onClick={() => fetchPage(page - 1)}
                  disabled={page <= 1 || isLoading}
                  className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
                >
                  Prev
                </button>
                {pageWindow(page, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-1 text-base text-ink-muted"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchPage(p)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 rounded-lg text-base border transition ${
                        p === page
                          ? "border-primary-200 bg-primary-50 text-primary-600 font-semibold"
                          : "border-stroke hover:bg-surface"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => fetchPage(page + 1)}
                  disabled={page >= totalPages || isLoading}
                  className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* PRE-AUDIT RESOLUTIONS - read straight off the report records. */}
        {tab === "resolutions" && (
          <div>
            <p className="text-sm text-ink-muted mb-3">
              Resolved before the audit trail began recording, read from the
              report records themselves. Nothing here is invented, and no
              entry is ever merged into the append-only trail above.
            </p>
            <div className="bg-card rounded-xl border border-stroke overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="text-left text-sm uppercase tracking-wide text-ink-muted border-b border-stroke">
                      <th className="px-4 py-3 font-semibold">Resolved</th>
                      <th className="px-4 py-3 font-semibold">Resolved by</th>
                      <th className="px-4 py-3 font-semibold">Target</th>
                      <th className="px-4 py-3 font-semibold">Outcome</th>
                      <th className="px-4 py-3 font-semibold">Note</th>
                      <th className="px-4 py-3 font-semibold">In trail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacy.map((r) => (
                      <tr
                        key={r._id}
                        className="border-b border-stroke last:border-0 align-top"
                      >
                        <td
                          className="px-4 py-3 whitespace-nowrap text-ink-sub"
                          title={new Date(r.resolvedAt).toLocaleString()}
                        >
                          {formatWhen(r.resolvedAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-ink">
                            {r.resolvedBy?.name || "Unknown"}
                          </div>
                          {r.resolvedBy?.username && (
                            <div className="text-sm text-ink-muted">
                              @{r.resolvedBy.username}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-ink-sub">
                          {r.targetType}{" "}
                          <span className="text-ink-muted">
                            ...{shortId(r.targetId)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                              STATUS_LABELS[r.status] === "Actioned"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {STATUS_LABELS[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-sub max-w-xs">
                          {r.resolutionNote || (
                            <span className="text-ink-muted">no note</span>
                          )}
                          {r.reason && (
                            <span className="text-sm text-ink-muted">
                              {" "}
                              (reported as {r.reason})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.loggedInAuditTrail ? (
                            <span className="inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold bg-green-100 text-green-700">
                              logged
                            </span>
                          ) : (
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold bg-amber-100 text-amber-700"
                              title="No report_resolved entry exists for this resolution."
                            >
                              pre-audit
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {isLegacyLoading && legacy.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                          Loading pre-audit resolutions...
                        </td>
                      </tr>
                    )}

                    {!isLegacyLoading && legacyLoaded && legacy.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-ink-muted">
                          Every recorded resolution already has a trail entry -
                          there is no pre-audit history to show.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {legacyHasMore && (
                <div className="border-t border-stroke p-3 text-center">
                  <button
                    onClick={() => fetchLegacy(legacyOffset)}
                    disabled={isLegacyLoading}
                    className="px-4 py-2 rounded-lg text-base font-medium text-primary-600 hover:bg-primary-50 transition disabled:opacity-50"
                  >
                    {isLegacyLoading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UNLOGGED STATE - the honest treatment of an unrecoverable gap. */}
        {tab === "gaps" && (
          <div>
            <p className="text-sm text-ink-muted mb-3">
              Accounts still carrying a restriction that no audit entry ever
              recorded. Their actor and application time were never stored,
              and every audit row requires a real actor, so these cannot be
              reconstructed - only surfaced.
            </p>

            {isGapsLoading && gaps.length === 0 && (
              <div className="bg-card rounded-xl border border-stroke p-8 text-center text-ink-muted">
                Checking restriction state...
              </div>
            )}

            {!isGapsLoading && gapsLoaded && gaps.length === 0 && (
              <div className="bg-card rounded-xl border border-stroke p-8 text-center text-ink-muted">
                Nothing unlogged - every current restriction has a trail entry.
              </div>
            )}

            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.user._id}
                  className="bg-card rounded-xl border border-amber-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-ink">
                      {gap.user.name || "Unknown user"}
                    </span>
                    {gap.user.username && (
                      <span className="text-sm text-ink-muted">
                        @{gap.user.username}
                      </span>
                    )}
                    <span className="text-sm rounded-full px-2 py-0.5 bg-surface text-ink-sub font-medium">
                      {gap.user.role || "user"}
                    </span>
                    {gap.user.banned && (
                      <span className="text-sm font-semibold rounded-full px-2 py-0.5 bg-red-50 text-red-600">
                        banned
                      </span>
                    )}
                    {gap.user.suspendedUntil && (
                      <span className="text-sm font-semibold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">
                        suspension ended {formatUntil(gap.user.suspendedUntil)}
                      </span>
                    )}
                    {gap.user.shadowRanked && (
                      <span className="text-sm font-semibold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">
                        shadow-ranked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-sub">
                    Missing from the trail:{" "}
                    <span className="font-medium text-ink">
                      {gap.missing.join(", ")}
                    </span>
                    {gap.user.restrictionReason && (
                      <span className="text-ink-muted">
                        {" "}
                        (stored reason: {gap.user.restrictionReason})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-ink-muted mt-1">{gap.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
export default AdminAuditLog;

