import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import toast from "react-hot-toast";
import { FaArrowLeft, FaFileCsv, FaFilter, FaSyncAlt } from "react-icons/fa";
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

// ── Layout helpers ─────────────────────────────────────────────────────
// The page lives inside MainLayout's max-w-3xl column, so a 6-column table
// never has room to breathe (phone OR desktop). Entries are rendered as a
// divided list of compact cards instead: what happened + when on top, the
// detail as the main line, then who/what/where as small labelled meta.
const INPUT =
  "w-full min-w-0 rounded-lg border border-stroke bg-card px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary-500";

const Field = ({ label, className = "", children }) => (
  <label className={`flex flex-col gap-1 min-w-0 ${className}`}>
    <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
      {label}
    </span>
    {children}
  </label>
);

const MetaItem = ({ label, children }) => (
  <span className="inline-flex items-baseline gap-1.5 min-w-0">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted shrink-0">
      {label}
    </span>
    <span className="text-sm text-ink-sub min-w-0 wrap-break-word">
      {children}
    </span>
  </span>
);

const Person = ({ name, username, fallback = "—" }) => (
  <>
    <span className="font-medium text-ink">{name || fallback}</span>
    {username && <span className="text-ink-muted"> @{username}</span>}
  </>
);

const Pill = ({ className = "", children, ...rest }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${className}`}
    {...rest}
  >
    {children}
  </span>
);

const ListShell = ({ dim, children }) => (
  <div
    className={`bg-card rounded-xl border border-stroke overflow-hidden transition-opacity ${
      dim ? "opacity-60" : ""
    }`}
  >
    {children}
  </div>
);

const SkeletonRows = () => (
  <ul className="divide-y divide-stroke" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => (
      <li key={i} className="px-4 py-4 sm:px-5 animate-pulse space-y-2.5">
        <div className="flex justify-between gap-3">
          <div className="h-5 w-28 rounded-full bg-surface" />
          <div className="h-4 w-12 rounded bg-surface" />
        </div>
        <div className="h-4 w-4/5 rounded bg-surface" />
        <div className="h-3 w-2/5 rounded bg-surface" />
      </li>
    ))}
  </ul>
);

const EmptyState = ({ children }) => (
  <div className="px-4 py-12 text-center text-ink-muted">{children}</div>
);

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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeFilterCount = [
    actionFilter,
    targetFilter,
    actorFilter,
    fromFilter,
    toFilter,
    oldestFirst,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setActionFilter("");
    setTargetFilter("");
    setActorInput("");
    setActorFilter("");
    setFromFilter("");
    setToFilter("");
    setOldestFirst(false);
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
        <div className="max-w-3xl mx-auto px-0 py-10 sm:py-16 text-center">
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

  const TABS = [
    { id: "trail", label: "Audit trail", short: "Trail" },
    { id: "resolutions", label: "Pre-audit resolutions", short: "Pre-audit" },
    { id: "gaps", label: "Unlogged state", short: "Unlogged" },
  ];

  const actionBtn =
    "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg border border-stroke text-base font-medium text-ink-sub hover:text-ink hover:bg-surface transition disabled:opacity-50";

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-0 sm:px-4 py-1 sm:py-6">
        {/* Header — stacks on phones so the title gets the full width and
            the actions become two equal tap targets underneath. */}
        <div className="mb-5">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-sub hover:text-ink transition"
          >
            <FaArrowLeft className="text-[10px]" /> Back to role management
          </Link>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-ink leading-tight">
                Moderation audit log
              </h1>
              <p className="text-ink-sub text-sm sm:text-base mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0">
              {tab === "trail" && (
                <button
                  onClick={handleExport}
                  disabled={exporting || isLoading}
                  title="Download every entry matching the current filters"
                  className={actionBtn}
                >
                  <FaFileCsv className="text-sm" />
                  {exporting ? "Exporting..." : "Export CSV"}
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={actionBtn}
              >
                <FaSyncAlt
                  className={isLoading ? "animate-spin text-sm" : "text-sm"}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tabs — segmented control; short labels on phones so all three
            fit on one line without wrapping or scrolling. */}
        <div
          role="tablist"
          className="flex gap-1 p-1 mb-4 rounded-xl bg-surface border border-stroke"
        >
          {TABS.map((tb) => (
            <button
              key={tb.id}
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex-1 min-w-0 px-2 sm:px-3 py-2 rounded-lg text-sm sm:text-base font-medium text-center whitespace-nowrap transition ${
                tab === tb.id
                  ? "bg-card text-primary-600 shadow-sm"
                  : "text-ink-sub hover:text-ink"
              }`}
            >
              <span className="sm:hidden">{tb.short}</span>
              <span className="hidden sm:inline">{tb.label}</span>
            </button>
          ))}
        </div>

        {/* Filters — collapsed behind a button on phones (with an active
            count), always open from sm up. Labels sit above full-width
            fields; 16px inputs so iOS doesn't zoom on focus. */}
        {tab === "trail" && (
          <div className="mb-4">
            <div className="flex items-center justify-between gap-2 sm:hidden">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-stroke bg-card text-base font-medium text-ink-sub"
              >
                <FaFilter className="text-xs" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary-600 text-white text-xs font-semibold inline-flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-2 py-2 text-base font-medium text-primary-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div
              className={`${
                filtersOpen ? "grid" : "hidden"
              } sm:grid mt-3 sm:mt-0 grid-cols-2 gap-3 bg-card border border-stroke rounded-xl p-3 sm:p-4`}
            >
              <Field label="Action" className="col-span-2 sm:col-span-1">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className={INPUT}
                >
                  {ACTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Target" className="col-span-2 sm:col-span-1">
                <select
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  className={INPUT}
                >
                  {TARGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Actor id" className="col-span-2">
                <input
                  value={actorInput}
                  onChange={(e) => setActorInput(e.target.value)}
                  placeholder="24-character user id"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${INPUT} font-mono`}
                />
              </Field>
              <Field label="From">
                <input
                  type="date"
                  value={fromFilter}
                  onChange={(e) => setFromFilter(e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  value={toFilter}
                  onChange={(e) => setToFilter(e.target.value)}
                  className={INPUT}
                />
              </Field>
              <div className="col-span-2 flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-base text-ink-sub">
                  <input
                    type="checkbox"
                    checked={oldestFirst}
                    onChange={(e) => setOldestFirst(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Oldest first
                </label>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="hidden sm:inline text-base font-medium text-primary-600 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TRAIL - the audit log itself. */}
        {tab === "trail" && (
          <ListShell dim={isLoading && logs.length > 0}>
            {isLoading && logs.length === 0 && <SkeletonRows />}

            {!isLoading && logs.length === 0 && (
              <EmptyState>No audit entries match these filters yet.</EmptyState>
            )}

            {logs.length > 0 && (
              <ul className="divide-y divide-stroke">
                {logs.map((log) => (
                  <li key={log._id} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <Pill
                          className={
                            ACTION_STYLES[log.action] || "bg-surface text-ink-sub"
                          }
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Pill>
                        {log.detail?.backfilled && (
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700"
                            title="Reconstructed from the report record during backfill - not a live write."
                          >
                            backfilled
                          </span>
                        )}
                      </div>
                      <time
                        dateTime={log.createdAt}
                        title={new Date(log.createdAt).toLocaleString()}
                        className="shrink-0 pt-0.5 text-sm text-ink-muted whitespace-nowrap"
                      >
                        {formatWhen(log.createdAt)}
                      </time>
                    </div>

                    <div className="mt-2 text-base text-ink-sub leading-snug wrap-break-word">
                      <DetailCell log={log} />
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      <MetaItem label="By">
                        <Person
                          name={log.actor?.name}
                          username={log.actor?.username}
                        />
                      </MetaItem>
                      <MetaItem label="On">
                        <TargetCell log={log} />
                      </MetaItem>
                      {log.ip && (
                        <MetaItem label="IP">
                          <span className="font-mono text-xs">
                            {cleanIp(log.ip)}
                          </span>
                        </MetaItem>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="border-t border-stroke p-3">
                {/* Phones: Prev · Page x of y · Next */}
                <div className="flex items-center justify-between gap-2 sm:hidden">
                  <button
                    onClick={() => fetchPage(page - 1)}
                    disabled={page <= 1 || isLoading}
                    className="px-4 py-2.5 rounded-lg text-base font-medium border border-stroke disabled:opacity-40 hover:bg-surface transition"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-ink-muted">
                    Page <span className="font-semibold text-ink">{page}</span>{" "}
                    of {totalPages}
                  </span>
                  <button
                    onClick={() => fetchPage(page + 1)}
                    disabled={page >= totalPages || isLoading}
                    className="px-4 py-2.5 rounded-lg text-base font-medium border border-stroke disabled:opacity-40 hover:bg-surface transition"
                  >
                    Next
                  </button>
                </div>

                {/* sm+: windowed page numbers */}
                <div className="hidden sm:flex items-center justify-center gap-1.5 flex-wrap">
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
              </div>
            )}
          </ListShell>
        )}

        {/* PRE-AUDIT RESOLUTIONS - read straight off the report records. */}
        {tab === "resolutions" && (
          <div>
            <p className="text-sm text-ink-muted mb-3 leading-relaxed">
              Resolved before the audit trail began recording, read from the
              report records themselves. Nothing here is invented, and no
              entry is ever merged into the append-only trail above.
            </p>
            <ListShell>
              {isLegacyLoading && legacy.length === 0 && <SkeletonRows />}

              {!isLegacyLoading && legacyLoaded && legacy.length === 0 && (
                <EmptyState>
                  Every recorded resolution already has a trail entry - there
                  is no pre-audit history to show.
                </EmptyState>
              )}

              {legacy.length > 0 && (
                <ul className="divide-y divide-stroke">
                  {legacy.map((r) => (
                    <li key={r._id} className="px-4 py-3.5 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <Pill
                            className={
                              STATUS_LABELS[r.status] === "Actioned"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-500"
                            }
                          >
                            {STATUS_LABELS[r.status] || r.status}
                          </Pill>
                          {r.loggedInAuditTrail ? (
                            <Pill className="bg-green-100 text-green-700">
                              logged
                            </Pill>
                          ) : (
                            <Pill
                              className="bg-amber-100 text-amber-700"
                              title="No report_resolved entry exists for this resolution."
                            >
                              pre-audit
                            </Pill>
                          )}
                        </div>
                        <time
                          dateTime={r.resolvedAt}
                          title={new Date(r.resolvedAt).toLocaleString()}
                          className="shrink-0 pt-0.5 text-sm text-ink-muted whitespace-nowrap"
                        >
                          {formatWhen(r.resolvedAt)}
                        </time>
                      </div>

                      <div className="mt-2 text-base text-ink-sub leading-snug wrap-break-word">
                        {r.resolutionNote || (
                          <span className="text-ink-muted">no note</span>
                        )}
                        {r.reason && (
                          <span className="text-sm text-ink-muted">
                            {" "}
                            (reported as {r.reason})
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                        <MetaItem label="By">
                          <Person
                            name={r.resolvedBy?.name}
                            username={r.resolvedBy?.username}
                            fallback="Unknown"
                          />
                        </MetaItem>
                        <MetaItem label="On">
                          {r.targetType}{" "}
                          <span className="text-ink-muted">
                            ...{shortId(r.targetId)}
                          </span>
                        </MetaItem>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {legacyHasMore && (
                <div className="border-t border-stroke p-3">
                  <button
                    onClick={() => fetchLegacy(legacyOffset)}
                    disabled={isLegacyLoading}
                    className="w-full sm:w-auto sm:mx-auto sm:block px-4 py-2.5 rounded-lg text-base font-medium text-primary-600 hover:bg-primary-50 transition disabled:opacity-50"
                  >
                    {isLegacyLoading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </ListShell>
          </div>
        )}

        {/* UNLOGGED STATE - the honest treatment of an unrecoverable gap. */}
        {tab === "gaps" && (
          <div>
            <p className="text-sm text-ink-muted mb-3 leading-relaxed">
              Accounts still carrying a restriction that no audit entry ever
              recorded. Their actor and application time were never stored,
              and every audit row requires a real actor, so these cannot be
              reconstructed - only surfaced.
            </p>

            {isGapsLoading && gaps.length === 0 && (
              <ListShell>
                <SkeletonRows />
              </ListShell>
            )}

            {!isGapsLoading && gapsLoaded && gaps.length === 0 && (
              <ListShell>
                <EmptyState>
                  Nothing unlogged - every current restriction has a trail
                  entry.
                </EmptyState>
              </ListShell>
            )}

            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.user._id}
                  className="bg-card rounded-xl border border-amber-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-2">
                    <span className="font-semibold text-ink wrap-break-word">
                      {gap.user.name || "Unknown user"}
                    </span>
                    {gap.user.username && (
                      <span className="text-sm text-ink-muted wrap-break-word">
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
                  <p className="text-sm text-ink-sub wrap-break-word">
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
                  <p className="text-sm text-ink-muted mt-1 wrap-break-word">
                    {gap.note}
                  </p>
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
