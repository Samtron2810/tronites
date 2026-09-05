import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import ConfirmRestrictionModal from "../components/ConfirmRestrictionModal";
import ReportContextModal from "../components/ReportContextModal";
import { useAuth } from "../context/useAuth";
import { FiExternalLink, FiCheck, FiX, FiInbox, FiAlertTriangle, FiFileText, FiAward } from "react-icons/fi";
import { VERIFICATION_META } from "../constants/verification";
import VerifiedBadge from "../components/VerifiedBadge";

const REASON_LABELS = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  hate_speech: "Hate speech",
  violence: "Violence",
  nudity_sexual_content: "Nudity or sexual content",
  self_harm: "Self-harm",
  impersonation: "Impersonation",
  misinformation: "Misinformation",
  other: "Other",
};

const TARGET_TYPE_LABELS = {
  user: "User",
  post: "Post",
  comment: "Comment",
  message: "Message",
};

const STATUS_TABS = [
  { value: "open", label: "Open" },
  { value: "actioned", label: "Actioned" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const ReportCard = ({
  report,
  onResolve,
  viewerRole,
  onView,
  onRequestRestriction,
  onWarn,
}) => {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [showNoteFor, setShowNoteFor] = useState(null); // "actioned" | "dismissed" | null
  // Phase 4 warn flow — user reports only; reason goes verbatim to the
  // warned account's notification.
  const [showWarnFor, setShowWarnFor] = useState(false);
  const [warnReason, setWarnReason] = useState("");
  const [warning, setWarning] = useState(false);

  // Phase 2 quick-restriction data (user reports only). targetOwner is
  // populated with banned/suspendedUntil/restrictionReason by listReports.
  const owner = report.targetOwner;
  const ownerSuspended =
    !!owner?.suspendedUntil && new Date(owner.suspendedUntil) > new Date();
  // Ban is admin-only server-side; hide the shortcut for moderators.
  const canBanHere = viewerRole === "admin";

  const submitResolve = async (status) => {
    if (resolving) return;
    setResolving(true);
    try {
      await onResolve(report._id, status, note.trim());
      setShowNoteFor(null);
      setNote("");
    } finally {
      setResolving(false);
    }
  };

  // Phase 4 — hand off to the parent's warn flow (API call, threshold
  // prompt and list updates live there). The card only resets its warn
  // UI when the parent reports success.
  const submitWarn = async () => {
    if (warning || !warnReason.trim()) return;
    setWarning(true);
    try {
      const result = await onWarn(report, warnReason.trim());
      if (result?.ok) {
        setShowWarnFor(false);
        setWarnReason("");
      }
    } finally {
      setWarning(false);
    }
  };

  return (
    <div
      className={`rounded-2xl p-4 border ${
        report.priority === "high"
          ? "border-red-300 bg-red-50/40"
          : "bg-card border-stroke"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {report.priority === "high" && (
              // Phase 6 — set by the flagRepeatOffenders job when this
              // owner crosses the repeat-offender threshold.
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">
                HIGH PRIORITY
              </span>
            )}
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
              {TARGET_TYPE_LABELS[report.targetType]}
            </span>
            <span className="text-sm text-ink-muted">
              {REASON_LABELS[report.reason] || report.reason}
            </span>
            {report.status !== "open" && (
              <span
                className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                  report.status === "actioned"
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {report.status}
              </span>
            )}
            {report.contentRemoved && (
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                content removed
              </span>
            )}
          </div>

          <p className="text-base text-ink mt-2">
            Reported by{" "}
            <span className="font-medium">
              {report.reporter?.name || "Unknown"}
            </span>
            {report.targetOwner && (
              <>
                {" "}against{" "}
                <span className="font-medium">{report.targetOwner.name}</span>
              </>
            )}
          </p>

          {report.contentPreview && (
            <p className="text-base text-ink-muted mt-1.5 bg-surface rounded-lg px-3 py-2 line-clamp-3">
              {report.contentPreview}
            </p>
          )}

          {report.details && (
            <p className="text-base text-ink-sub mt-1.5 italic">"{report.details}"</p>
          )}

          {report.resolutionNote && (
            <p className="text-sm text-ink-muted mt-1.5">
              Resolution note: {report.resolutionNote}
            </p>
          )}

          <p className="text-sm text-ink-muted mt-2">
            {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>

        {/* User reports deep-link straight to the profile (a profile is
            its own context — nothing to preview). Every other target type
            opens the in-queue content modal, since there are no permalink
            pages to link out to. */}
        {report.targetType === "user" ? (
          <Link
            to={`/profile/${report.targetOwner?._id || report.targetOwner}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 px-2.5 py-1.5 rounded-lg border border-stroke hover:bg-primary-50 transition"
          >
            View <FiExternalLink size={12} />
          </Link>
        ) : (
          <button
            onClick={() => onView(report)}
            className="shrink-0 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 px-2.5 py-1.5 rounded-lg border border-stroke hover:bg-primary-50 transition"
          >
            View <FiExternalLink size={12} />
          </button>
        )}
      </div>

      {report.status === "open" && (
        <div className="mt-3 pt-3 border-t border-stroke">
          {showWarnFor ? (
            // Phase 4 — reason is mandatory and goes verbatim into the
            // warned user's notification; their identity of the sender is
            // stripped server-side ("Moderation team").
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-sub">
                Reason — sent verbatim to{" "}
                <span className="font-semibold">
                  {owner?.name || "the user"}
                </span>{" "}
                (they won't see who sent it):
              </p>
              <textarea
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value.slice(0, 500))}
                rows={2}
                autoFocus
                placeholder="e.g. Repeated harassment — this is a formal warning"
                className="w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowWarnFor(false);
                    setWarnReason("");
                  }}
                  disabled={warning}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-sub border border-stroke hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitWarn}
                  disabled={warning || !warnReason.trim()}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition disabled:opacity-60"
                >
                  {warning ? "..." : "Send warning"}
                </button>
              </div>
            </div>
          ) : showNoteFor ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Optional note (visible only to moderators)"
                rows={2}
                className="w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNoteFor(null)}
                  disabled={resolving}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-sub border border-stroke hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitResolve(showNoteFor)}
                  disabled={resolving}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60 ${
                    showNoteFor === "actioned"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-gray-400 hover:bg-gray-500"
                  }`}
                >
                  {resolving ? "..." : `Confirm ${showNoteFor}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowNoteFor("actioned")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition"
              >
                <FiCheck size={13} /> Action
              </button>
              <button
                onClick={() => setShowNoteFor("dismissed")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-ink-sub border border-stroke hover:bg-surface transition"
              >
                <FiX size={13} /> Dismiss
              </button>
              {report.targetType === "user" && (
                // Phase 4 — third resolve action: a formal strike. Only
                // meaningful on user reports (strikes attach to accounts).
                <button
                  onClick={() => {
                    setShowWarnFor(true);
                    setNote("");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 transition"
                >
                  <FiAlertTriangle size={13} /> Warn…
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Phase 2 — user reports get one-tap restrict/restore shortcuts in
          addition to Action/Dismiss. Ban only surfaces for admins (the
          endpoint is requireAdmin regardless). */}
      {report.status === "open" && report.targetType === "user" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {owner?.banned ? (
            <>
              <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                banned
              </span>
              <button
                onClick={() => onRequestRestriction(report, "unrestrict")}
                className="text-sm font-semibold text-primary-700 border border-stroke hover:bg-primary-50 px-2.5 py-1 rounded-lg transition"
              >
                Restore access
              </button>
            </>
          ) : (
            <>
              {ownerSuspended && (
                <span
                  className="text-sm font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
                  title={owner.restrictionReason || undefined}
                >
                  suspended until{" "}
                  {new Date(owner.suspendedUntil).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={() => onRequestRestriction(report, "suspend")}
                className="text-sm font-medium text-amber-700 border border-amber-300 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition"
              >
                {ownerSuspended ? "Adjust suspension…" : "Suspend…"}
              </button>
              {canBanHere && (
                <button
                  onClick={() => onRequestRestriction(report, "ban")}
                  className="text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 px-2.5 py-1 rounded-lg transition"
                >
                  Ban…
                </button>
              )}
            </>
          )}
          {!owner?.banned && !ownerSuspended && owner?.restrictionReason && (
            <span
              className="text-sm text-ink-muted italic truncate max-w-[16rem]"
              title={owner.restrictionReason}
            >
              "{owner.restrictionReason}"
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// 3.1 — Appeals queue card. Mirrors ReportCard's open/resolved shape but
// the only decisions are grant (lift the restriction) or deny (leave it).
const VERIFICATION_STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "all", label: "All" },
];

const VerificationRequestCard = ({ request, onResolve }) => {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [showDecisionFor, setShowDecisionFor] = useState(null); // "approved" | "denied" | null

  const person = request.user;
  const meta = VERIFICATION_META[request.type];

  const submit = async (decision) => {
    if (resolving) return;
    setResolving(true);
    try {
      await onResolve(request._id, decision, note.trim());
      setShowDecisionFor(null);
      setNote("");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="rounded-2xl p-4 border bg-card border-stroke">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${meta?.color}1a`, color: meta?.color }}
            >
              {meta?.label || request.type}
            </span>
            {request.status !== "pending" && (
              <span
                className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                  request.status === "approved"
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {request.status}
              </span>
            )}
          </div>

          <p className="text-base text-ink mt-2 flex items-center gap-1.5">
            <span className="font-medium">{person?.name || "Unknown user"}</span>
            {person?.verifications?.length > 0 && (
              <VerifiedBadge verifications={person.verifications} size="sm" />
            )}
            {person?.username && (
              <span className="text-ink-muted"> @{person.username}</span>
            )}
          </p>

          {request.entityName && (
            <p className="text-sm text-ink-muted mt-1 italic">
              Claiming to represent: "{request.entityName}"
            </p>
          )}

          <p className="text-base text-ink-muted mt-1.5 bg-surface rounded-lg px-3 py-2 whitespace-pre-wrap">
            {request.statement}
          </p>

          {request.decisionNote && (
            <p className="text-sm text-ink-muted mt-1.5">
              Decision note: {request.decisionNote}
            </p>
          )}

          <p className="text-sm text-ink-muted mt-2">
            {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>

        {person?._id && (
          <Link
            to={`/profile/${person._id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 px-2.5 py-1.5 rounded-lg border border-stroke hover:bg-primary-50 transition"
          >
            Profile <FiExternalLink size={12} />
          </Link>
        )}
      </div>

      {request.status === "pending" && (
        <div className="mt-3 pt-3 border-t border-stroke">
          {showDecisionFor ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Optional note (shown to the applicant if denied)"
                rows={2}
                className="w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDecisionFor(null)}
                  disabled={resolving}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-sub border border-stroke hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submit(showDecisionFor)}
                  disabled={resolving}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60 ${
                    showDecisionFor === "approved"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-400 hover:bg-gray-500"
                  }`}
                >
                  {resolving ? "..." : `Confirm ${showDecisionFor === "approved" ? "approve" : "deny"}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDecisionFor("approved")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition"
              >
                <FiCheck size={13} /> Approve — grant badge
              </button>
              <button
                onClick={() => setShowDecisionFor("denied")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-ink-sub border border-stroke hover:bg-surface transition"
              >
                <FiX size={13} /> Deny
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const APPEAL_STATUS_TABS = [
  { value: "open", label: "Open" },
  { value: "granted", label: "Granted" },
  { value: "denied", label: "Denied" },
  { value: "all", label: "All" },
];

const AppealCard = ({ appeal, onResolve }) => {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [showDecisionFor, setShowDecisionFor] = useState(null); // "granted" | "denied" | null

  const person = appeal.user;

  const submit = async (decision) => {
    if (resolving) return;
    setResolving(true);
    try {
      await onResolve(appeal._id, decision, note.trim());
      setShowDecisionFor(null);
      setNote("");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="rounded-2xl p-4 border bg-card border-stroke">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
              {appeal.restrictionType === "ban" ? "Ban appeal" : "Suspension appeal"}
            </span>
            {appeal.status !== "open" && (
              <span
                className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                  appeal.status === "granted"
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {appeal.status}
              </span>
            )}
          </div>

          <p className="text-base text-ink mt-2">
            <span className="font-medium">{person?.name || "Unknown user"}</span>
            {person?.username && (
              <span className="text-ink-muted"> @{person.username}</span>
            )}
          </p>

          {appeal.restrictionReason && (
            <p className="text-sm text-ink-muted mt-1 italic">
              Restriction reason: "{appeal.restrictionReason}"
            </p>
          )}
          {appeal.restrictionType === "suspension" && appeal.suspendedUntil && (
            <p className="text-sm text-ink-muted mt-0.5">
              Suspended until {new Date(appeal.suspendedUntil).toLocaleString()}
            </p>
          )}

          <p className="text-base text-ink-muted mt-1.5 bg-surface rounded-lg px-3 py-2 whitespace-pre-wrap">
            {appeal.statement}
          </p>

          {appeal.decisionNote && (
            <p className="text-sm text-ink-muted mt-1.5">
              Decision note: {appeal.decisionNote}
            </p>
          )}

          <p className="text-sm text-ink-muted mt-2">
            {new Date(appeal.createdAt).toLocaleString()}
          </p>
        </div>

        {person?._id && (
          <Link
            to={`/profile/${person._id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800 px-2.5 py-1.5 rounded-lg border border-stroke hover:bg-primary-50 transition"
          >
            Profile <FiExternalLink size={12} />
          </Link>
        )}
      </div>

      {appeal.status === "open" && (
        <div className="mt-3 pt-3 border-t border-stroke">
          {showDecisionFor ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Optional note (visible only to moderators)"
                rows={2}
                className="w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDecisionFor(null)}
                  disabled={resolving}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-ink-sub border border-stroke hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submit(showDecisionFor)}
                  disabled={resolving}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60 ${
                    showDecisionFor === "granted"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-gray-400 hover:bg-gray-500"
                  }`}
                >
                  {resolving ? "..." : `Confirm ${showDecisionFor === "granted" ? "grant" : "deny"}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDecisionFor("granted")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition"
              >
                <FiCheck size={13} /> Grant — restore access
              </button>
              <button
                onClick={() => setShowDecisionFor("denied")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-ink-sub border border-stroke hover:bg-surface transition"
              >
                <FiX size={13} /> Deny
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ModerationQueue = () => {
  const { user } = useAuth();
  const [queueTab, setQueueTab] = useState("reports"); // "reports" | "appeals" | "verification"
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [appealStatus, setAppealStatus] = useState("open");
  const [appeals, setAppeals] = useState([]);
  const [appealsLoading, setAppealsLoading] = useState(true);
  const [appealPage, setAppealPage] = useState(1);
  const [appealTotalPages, setAppealTotalPages] = useState(1);

  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [verificationRequests, setVerificationRequests] = useState([]);
  const [verificationsLoading, setVerificationsLoading] = useState(true);
  const [verificationPage, setVerificationPage] = useState(1);
  const [verificationTotalPages, setVerificationTotalPages] = useState(1);
  // Report currently open in the in-queue context/preview modal.
  const [contextReport, setContextReport] = useState(null);
  // { report, mode } — user-report restriction shortcut modal (Phase 2).
  const [pendingUserRestriction, setPendingUserRestriction] = useState(null);

  const isModerator = user && ["moderator", "admin"].includes(user.role);
  const isAdmin = user?.role === "admin";

  // Mirror requirePermission.js resolution order on the client so tab
  // visibility matches what the server will actually allow.
  const DEFAULT_MOD_PERMS = ["manage_reports", "manage_users", "manage_content"];
  const effectivePerms = isAdmin
    ? ["manage_reports", "manage_users", "manage_content", "manage_verification", "view_audit_log", "manage_roles"]
    : user?.permissions?.length
      ? user.permissions
      : user?.role === "moderator"
        ? DEFAULT_MOD_PERMS
        : [];

  const canManageReports = effectivePerms.includes("manage_reports");
  const canManageVerification = effectivePerms.includes("manage_verification");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCached("/reports", {
        params: { status, page, limit: 25 },
        ttlMs: Infinity,
      });
      setReports(res.data.reports);
      setTotalPages(res.data.totalPages);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load reports.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/filter-change
    if (isModerator) fetchReports();
  }, [isModerator, fetchReports]);

  const fetchAppeals = useCallback(async () => {
    setAppealsLoading(true);
    try {
      const res = await api.getCached("/appeals", {
        params: { status: appealStatus, page: appealPage, limit: 25 },
        ttlMs: Infinity,
      });
      setAppeals(res.data.appeals);
      setAppealTotalPages(res.data.totalPages);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load appeals.");
    } finally {
      setAppealsLoading(false);
    }
  }, [appealStatus, appealPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/filter-change
    if (isModerator && queueTab === "appeals") fetchAppeals();
  }, [isModerator, queueTab, fetchAppeals]);

  const fetchVerificationRequests = useCallback(async () => {
    setVerificationsLoading(true);
    try {
      const res = await api.getCached("/verification-requests", {
        params: { status: verificationStatus, page: verificationPage, limit: 25 },
        ttlMs: Infinity,
      });
      setVerificationRequests(res.data.requests);
      setVerificationTotalPages(res.data.totalPages);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load verification requests.");
    } finally {
      setVerificationsLoading(false);
    }
  }, [verificationStatus, verificationPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/filter-change
    if (isModerator && canManageVerification && queueTab === "verification") fetchVerificationRequests();
  }, [isModerator, canManageVerification, queueTab, fetchVerificationRequests]);

  // If the tab was somehow left on "verification" but the user no longer
  // has the permission (e.g. permission revoked, page refreshed), reset
  // to "reports" so they don't see a stale/broken view.
  useEffect(() => {
    if (queueTab === "verification" && !canManageVerification) {
      setQueueTab("reports");
    }
  }, [canManageVerification, queueTab]);

  // Guard client-side too — the endpoints already 403 non-moderators,
  // this just avoids rendering a queue UI that would only ever error.
  if (user && !isModerator) {
    return <Navigate to="/" replace />;
  }

  const handleResolve = async (reportId, resolveStatus, note) => {
    try {
      await api.put(`/reports/${reportId}/resolve`, { status: resolveStatus, note });
      toast.success(resolveStatus === "actioned" ? "Marked as actioned." : "Dismissed.");
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      api.invalidate("/reports");
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't resolve report.");
    }
  };

  // Phase 2 — suspend/ban/unrestrict straight from a user report card.
  // Updates the card's targetOwner from the server DTO so chips flip
  // without a refetch. Returns success so the modal closes only on win.
  // Phase 4 — issue a formal warning from the queue: send the strike,
  // prompt toward suspension when the threshold is crossed (reusing the
  // Phase 2 restriction modal so the moderator is one "Cancel" away from
  // doing nothing), then resolve the underlying report as actioned so
  // the queue stays accurate.
  const handleWarn = async (report, reason) => {
    try {
      const res = await api.post(
        `/admin/users/${report.targetOwner._id}/warn`,
        { reason, reportId: report._id },
      );
      toast.success(
        `Warning sent — ${res.data.strikeCount} strike${
          res.data.strikeCount === 1 ? "" : "s"
        } on record.`,
      );
      if (res.data.strikeThresholdReached) {
        toast(`${res.data.strikeCount} strikes reached — review a suspension.`, {
          icon: "âš ï¸",
          duration: 6000,
        });
        setPendingUserRestriction({ report, mode: "suspend" });
      }
      await handleResolve(report._id, "actioned", `Warning issued: ${reason}`);
      return { ok: true };
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't send the warning.");
      return { ok: false };
    }
  };

  const handleConfirmUserRestriction = async ({ until, reason }) => {
    if (!pendingUserRestriction) return false;
    const { report, mode } = pendingUserRestriction;
    const endpoint =
      mode === "suspend" ? "suspend" : mode === "ban" ? "ban" : "unrestrict";
    try {
      const res = await api.put(
        `/admin/users/${report.targetOwner._id}/${endpoint}`,
        mode === "suspend"
          ? { until: until.toISOString(), reason }
          : mode === "ban"
            ? { reason }
            : {},
      );
      setReports((prev) =>
        prev.map((r) =>
          r._id === report._id ? { ...r, targetOwner: res.data.user } : r,
        ),
      );
      api.invalidateMany(["/reports", "/admin/users"]);
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

  const handleResolveAppeal = async (appealId, decision, note) => {
    try {
      await api.put(`/appeals/${appealId}/resolve`, { decision, note });
      toast.success(decision === "granted" ? "Access restored." : "Appeal denied.");
      setAppeals((prev) => prev.filter((a) => a._id !== appealId));
      api.invalidateMany(["/appeals", "/admin/users", "/reports"]);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't resolve appeal.");
    }
  };

  const handleResolveVerification = async (requestId, decision, note) => {
    try {
      await api.put(`/verification-requests/${requestId}/resolve`, { decision, note });
      toast.success(
        decision === "approved"
          ? "Approved — badge granted."
          : "Application denied.",
      );
      setVerificationRequests((prev) =>
        prev.filter((r) => r._id !== requestId),
      );
      api.invalidateMany(["/verification-requests", "/admin/users"]);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't resolve request.");
    }
  };

  return (
    <MainLayout>
      {contextReport && (
        <ReportContextModal
          report={contextReport}
          onClose={() => setContextReport(null)}
          onResolved={(resolvedId) => {
            setContextReport(null);
            // Same list behavior as the inline quick-resolve path: drop
            // the resolved report from whatever tab is currently shown.
            setReports((prev) => prev.filter((r) => r._id !== resolvedId));
          }}
        />
      )}
      {pendingUserRestriction && (
        <ConfirmRestrictionModal
          mode={pendingUserRestriction.mode}
          targetUser={pendingUserRestriction.report.targetOwner}
          onConfirm={async (payload) => {
            const ok = await handleConfirmUserRestriction(payload);
            if (ok) setPendingUserRestriction(null);
          }}
          onCancel={() => setPendingUserRestriction(null)}
        />
      )}
      <h1 className="text-2xl font-bold text-ink mb-1">Moderation queue</h1>
      <p className="text-base text-ink-muted mb-5">
        {queueTab === "reports"
          ? "Reports from the community, newest last."
          : queueTab === "appeals"
          ? "Appeals from restricted accounts, oldest first."
          : "Verification badge applications, oldest first."}
      </p>

      <div className="flex gap-1 mb-4 bg-card border border-stroke rounded-xl p-1 w-fit">
        <button
          onClick={() => setQueueTab("reports")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-medium transition ${
            queueTab === "reports"
              ? "bg-primary-100 text-primary-700"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <FiInbox size={14} /> Reports
        </button>
        <button
          onClick={() => setQueueTab("appeals")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-medium transition ${
            queueTab === "appeals"
              ? "bg-primary-100 text-primary-700"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <FiFileText size={14} /> Appeals
        </button>
        {/* Only show Verification tab when the user actually has the permission.
            Admins always see it; moderators only when manage_verification is granted. */}
        {canManageVerification && (
          <button
            onClick={() => setQueueTab("verification")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-base font-medium transition ${
              queueTab === "verification"
                ? "bg-primary-100 text-primary-700"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <FiAward size={14} /> Verification
          </button>
        )}
      </div>

      {queueTab === "reports" ? (
        <>
          <div className="flex gap-1 mb-5 bg-card border border-stroke rounded-xl p-1 w-fit">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-base font-medium transition ${
                  status === tab.value
                    ? "bg-primary-100 text-primary-700"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-base text-ink-muted">Loading...</p>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FiInbox className="text-ink-muted mb-2" size={28} />
              <p className="text-base text-ink-muted">No {status !== "all" ? status : ""} reports.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <ReportCard
                  key={r._id}
                  report={r}
                  onResolve={handleResolve}
                  viewerRole={user?.role}
                  onView={(report) => setContextReport(report)}
                  onRequestRestriction={(report, mode) =>
                    setPendingUserRestriction({ report, mode })
                  }
                  onWarn={handleWarn}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
              >
                Previous
              </button>
              <span className="text-base text-ink-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : queueTab === "appeals" ? (
        <>
          <div className="flex gap-1 mb-5 bg-card border border-stroke rounded-xl p-1 w-fit">
            {APPEAL_STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setAppealStatus(tab.value);
                  setAppealPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-base font-medium transition ${
                  appealStatus === tab.value
                    ? "bg-primary-100 text-primary-700"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {appealsLoading ? (
            <p className="text-base text-ink-muted">Loading...</p>
          ) : appeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FiFileText className="text-ink-muted mb-2" size={28} />
              <p className="text-base text-ink-muted">
                No {appealStatus !== "all" ? appealStatus : ""} appeals.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {appeals.map((a) => (
                <AppealCard key={a._id} appeal={a} onResolve={handleResolveAppeal} />
              ))}
            </div>
          )}

          {appealTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setAppealPage((p) => Math.max(1, p - 1))}
                disabled={appealPage <= 1}
                className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
              >
                Previous
              </button>
              <span className="text-base text-ink-muted">
                Page {appealPage} of {appealTotalPages}
              </span>
              <button
                onClick={() => setAppealPage((p) => Math.min(appealTotalPages, p + 1))}
                disabled={appealPage >= appealTotalPages}
                className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex gap-1 mb-5 bg-card border border-stroke rounded-xl p-1 w-fit">
            {VERIFICATION_STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setVerificationStatus(t.value);
                  setVerificationPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-base font-medium transition ${
                  verificationStatus === t.value
                    ? "bg-primary-100 text-primary-700"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {verificationsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-surface animate-pulse" />
              ))}
            </div>
          ) : verificationRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-ink-muted">
              <FiAward size={32} />
              <p className="text-base">No {verificationStatus} requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {verificationRequests.map((r) => (
                <VerificationRequestCard
                  key={r._id}
                  request={r}
                  onResolve={handleResolveVerification}
                />
              ))}
            </div>
          )}

          {verificationTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setVerificationPage((p) => Math.max(1, p - 1))}
                disabled={verificationPage <= 1}
                className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
              >
                Previous
              </button>
              <span className="text-base text-ink-muted">
                Page {verificationPage} of {verificationTotalPages}
              </span>
              <button
                onClick={() => setVerificationPage((p) => Math.min(verificationTotalPages, p + 1))}
                disabled={verificationPage >= verificationTotalPages}
                className="px-3 py-1.5 rounded-lg text-base border border-stroke disabled:opacity-40 hover:bg-surface transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
};

export default ModerationQueue;
