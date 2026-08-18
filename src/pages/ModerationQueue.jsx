import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { FiExternalLink, FiCheck, FiX, FiInbox } from "react-icons/fi";

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

const ReportCard = ({ report, onResolve }) => {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [showNoteFor, setShowNoteFor] = useState(null); // "actioned" | "dismissed" | null

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

  return (
    <div className="bg-white border border-stroke rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
              {TARGET_TYPE_LABELS[report.targetType]}
            </span>
            <span className="text-xs text-ink-muted">
              {REASON_LABELS[report.reason] || report.reason}
            </span>
            {report.status !== "open" && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  report.status === "actioned"
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {report.status}
              </span>
            )}
          </div>

          <p className="text-sm text-ink mt-2">
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
            <p className="text-sm text-ink-muted mt-1.5 bg-surface rounded-lg px-3 py-2 line-clamp-3">
              {report.contentPreview}
            </p>
          )}

          {report.details && (
            <p className="text-sm text-ink-sub mt-1.5 italic">"{report.details}"</p>
          )}

          {report.resolutionNote && (
            <p className="text-xs text-ink-muted mt-1.5">
              Resolution note: {report.resolutionNote}
            </p>
          )}

          <p className="text-xs text-ink-muted mt-2">
            {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>

        {report.linkable && report.linkTo && (
          <Link
            to={report.linkTo}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-800 px-2.5 py-1.5 rounded-lg border border-stroke hover:bg-primary-50 transition"
          >
            View <FiExternalLink size={12} />
          </Link>
        )}
      </div>

      {report.status === "open" && (
        <div className="mt-3 pt-3 border-t border-stroke">
          {showNoteFor ? (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Optional note (visible only to moderators)"
                rows={2}
                className="w-full rounded-xl border border-stroke px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNoteFor(null)}
                  disabled={resolving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-sub border border-stroke hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitResolve(showNoteFor)}
                  disabled={resolving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition disabled:opacity-60 ${
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition"
              >
                <FiCheck size={13} /> Action
              </button>
              <button
                onClick={() => setShowNoteFor("dismissed")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-sub border border-stroke hover:bg-surface transition"
              >
                <FiX size={13} /> Dismiss
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
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isModerator = user && ["moderator", "admin"].includes(user.role);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports", { params: { status, page, limit: 25 } });
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
    if (isModerator) fetchReports();
  }, [isModerator, fetchReports]);

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
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't resolve report.");
    }
  };

  return (
    <MainLayout>
      <h1 className="text-xl font-bold text-ink mb-1">Moderation queue</h1>
      <p className="text-sm text-ink-muted mb-5">Reports from the community, newest last.</p>

      <div className="flex gap-1 mb-5 bg-white border border-stroke rounded-xl p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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
        <p className="text-sm text-ink-muted">Loading...</p>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FiInbox className="text-ink-muted mb-2" size={28} />
          <p className="text-sm text-ink-muted">No {status !== "all" ? status : ""} reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r._id} report={r} onResolve={handleResolve} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-sm border border-stroke disabled:opacity-40 hover:bg-surface transition"
          >
            Previous
          </button>
          <span className="text-sm text-ink-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-sm border border-stroke disabled:opacity-40 hover:bg-surface transition"
          >
            Next
          </button>
        </div>
      )}
    </MainLayout>
  );
};

export default ModerationQueue;
