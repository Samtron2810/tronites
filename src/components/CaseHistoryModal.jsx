import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FiX,
  FiFileText,
  FiClock,
  FiLoader,
  FiTrash2,
} from "react-icons/fi";
import api from "../services/api";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import useBackButtonClose from "../hooks/useBackButtonClose";
import ModalPortal from "./ModalPortal";

// Phase 7 (roadmap 3.6) — moderator notes + one-screen case history.
// Opened from the moderation queue or the admin users panel; renders the
// GET /admin/users/:id/case-history payload (profile + restriction state +
// strikes + notes + full audit trail) and drives the notes CRUD endpoints
// (POST/DELETE /admin/users/:id/notes). Notes are moderator-only and never
// shown to the account holder.
const ACTION_LABELS = {
  user_suspended: "Suspended",
  user_banned: "Banned",
  user_unrestricted: "Access restored",
  user_role_changed: "Role changed",
  report_resolved: "Report resolved",
  user_warned: "Formal warning issued",
  user_permissions_changed: "Permissions changed",
  appeal_granted: "Appeal granted",
  appeal_denied: "Appeal denied",
  user_verification_granted: "Badge granted",
  user_verification_revoked: "Badge revoked",
  verification_request_approved: "Badge request approved",
  verification_request_denied: "Badge request denied",
  user_shadow_ranked: "Shadow-ranked",
  user_shadow_rank_lifted: "Shadow rank lifted",
  user_auto_suspended: "Auto-suspended (repeat offender)",
  user_auto_banned: "Auto-banned (repeat offender)",
  post_admin_promoted: "Post promoted",
  post_promotion_extended: "Promotion extended",
  post_promotion_cancelled: "Promotion cancelled",
  moderator_note_added: "Note added",
  moderator_note_deleted: "Note deleted",
};

const ACTION_TONE = {
  user_banned: "text-red-600 bg-red-50",
  user_auto_banned: "text-red-600 bg-red-50",
  user_suspended: "text-amber-600 bg-amber-50",
  user_auto_suspended: "text-amber-600 bg-amber-50",
  user_unrestricted: "text-primary-700 bg-primary-50",
  appeal_granted: "text-primary-700 bg-primary-50",
  user_warned: "text-orange-600 bg-orange-50",
  post_admin_promoted: "text-primary-700 bg-primary-50",
  post_promotion_extended: "text-primary-700 bg-primary-50",
  post_promotion_cancelled: "text-amber-600 bg-amber-50",
  moderator_note_added: "text-primary-700 bg-primary-50",
  moderator_note_deleted: "text-gray-500 bg-gray-100",
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
};

// Pull the most useful fields out of an AuditLog `detail` payload for the
// one-line action summary (reason → toRole → status → note → until).
const detailText = (detail) => {
  if (!detail || typeof detail !== "object") return "";
  const bits = [];
  for (const key of ["reason", "toRole", "status", "note", "body", "permissions"]) {
    const v = detail[key];
    if (v == null || v === "") continue;
    bits.push(String(v));
  }
  if (detail.until) bits.push(`until ${formatDate(detail.until)}`);
  return bits.join(" · ");
};

const CaseHistoryModal = ({ user, currentUserId, viewerRole, onClose }) => {
  const userId = user?._id;
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onClose);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}/case-history`);
      setHistory(res.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't load case history.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const handleAddNote = async () => {
    const body = noteBody.trim();
    if (!body || adding || !userId) return;
    setAdding(true);
    try {
      const res = await api.post(`/admin/users/${userId}/notes`, { body });
      setHistory((prev) =>
        prev ? { ...prev, notes: [res.data.note, ...(prev.notes || [])] } : prev,
      );
      setNoteBody("");
      toast.success("Note added.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't add the note.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (deletingId || !userId) return;
    setDeletingId(noteId);
    try {
      await api.delete(`/admin/users/${userId}/notes/${noteId}`);
      setHistory((prev) =>
        prev
          ? { ...prev, notes: (prev.notes || []).filter((n) => n._id !== noteId) }
          : prev,
      );
      toast.success("Note deleted.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't delete the note.");
    } finally {
      setDeletingId(null);
    }
  };

  // Backend rule: own notes only, unless the requester is an admin.
  const canDeleteNote = (note) =>
    viewerRole === "admin" || note.author?._id === currentUserId;

  if (!user) return null;

  const { user: target = null, notes = [], auditLog = [], reportCounts = {} } =
    history || {};
  const strikes = target?.strikes || [];
  const isSuspended =
    !!target?.suspendedUntil && new Date(target.suspendedUntil) > new Date();

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-stretch sm:items-center justify-center z-50 sm:px-4">
      <div className="bg-card sm:rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden h-full sm:h-auto sm:max-h-[90dvh] max-sm:max-w-none max-sm:rounded-none max-sm:pt-[env(safe-area-inset-top)] max-sm:pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stroke shrink-0">
          <img
            src={
              resizedImageUrl(target?.profilePic, IMAGE_SIZES.avatarSmall) ||
              defaultAvatar
            }
            alt={target?.name || user.name || "User"}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-ink truncate leading-tight">
              {target?.name || user.name || "Unknown user"}
            </p>
            <p className="text-sm text-ink-muted truncate">
              {target?.username ? `@${target.username}` : ""}
              {target?.email ? ` · ${target.email}` : ""}
              {target?.role ? ` · ${target.role}` : ""}
              {target?.createdAt ? ` · joined ${formatDate(target.createdAt)}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition"
            aria-label="Close case history"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-ink-muted">
              <FiLoader size={22} className="animate-spin text-primary-500" />
              <p className="text-sm">Loading case history…</p>
            </div>
          ) : (
            <>
              {/* Account snapshot */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                  Account status
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  {target?.banned && (
                    <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                      banned
                    </span>
                  )}
                  {isSuspended && (
                    <span
                      className="text-sm font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
                      title={target.restrictionReason || undefined}
                    >
                      suspended until{" "}
                      {new Date(target.suspendedUntil).toLocaleDateString()}
                    </span>
                  )}
                  {strikes.length > 0 && (
                    <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                      {strikes.length} strike{strikes.length === 1 ? "" : "s"}
                    </span>
                  )}
                  <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-sub">
                    {reportCounts.open ?? 0} open / {reportCounts.total ?? 0} total reports
                  </span>
                </div>
              </section>

              {/* Strikes */}
              {strikes.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">
                    Formal warnings
                  </h3>
                  <div className="space-y-2">
                    {strikes.map((s, i) => (
                      <div
                        key={s._id || i}
                        className="rounded-xl border border-stroke bg-surface px-3 py-2 text-sm text-ink"
                      >
                        <span className="font-medium">
                          {s.reason || "No reason recorded"}
                        </span>
                        {s.createdAt && (
                          <span className="text-ink-muted">
                            {" "}· {formatDate(s.createdAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notes */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2 flex items-center gap-1.5">
                  <FiFileText size={12} /> Moderator notes ({notes.length})
                </h3>

                <div className="flex gap-2 mb-3">
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value.slice(0, 1000))}
                    rows={2}
                    placeholder="Internal note — never shown to the account holder."
                    className="flex-1 rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none bg-card"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={adding || !noteBody.trim()}
                    className="shrink-0 px-3 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {adding ? (
                      <FiLoader size={13} className="animate-spin" />
                    ) : (
                      "Add note"
                    )}
                  </button>
                </div>

                {notes.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    No notes yet — add the first one above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note._id}
                        className="rounded-xl border border-stroke bg-surface px-3 py-2"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <img
                            src={
                              resizedImageUrl(
                                note.author?.profilePic,
                                IMAGE_SIZES.avatarTiny,
                              ) || defaultAvatar
                            }
                            alt={note.author?.name || "Moderator"}
                            className="w-5 h-5 rounded-full object-cover border border-stroke"
                          />
                          <span className="text-sm font-semibold text-ink">
                            {note.author?.name || "Moderator"}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {formatDate(note.createdAt)}
                          </span>
                          {canDeleteNote(note) && (
                            <button
                              onClick={() => handleDeleteNote(note._id)}
                              disabled={deletingId === note._id}
                              className="ml-auto p-1 rounded-lg text-ink-muted hover:text-red-500 hover:bg-red-50 transition"
                              aria-label="Delete note"
                              title="Delete note"
                            >
                              {deletingId === note._id ? (
                                <FiLoader size={12} className="animate-spin" />
                              ) : (
                                <FiTrash2 size={12} />
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-ink whitespace-pre-wrap">
                          {note.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Audit trail */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2 flex items-center gap-1.5">
                  <FiClock size={12} /> Audit trail ({auditLog.length})
                </h3>
                {auditLog.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    No moderation actions on record.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {auditLog.map((entry) => {
                      const tone =
                        ACTION_TONE[entry.action] || "text-ink-sub bg-surface";
                      const label = ACTION_LABELS[entry.action] || entry.action;
                      const detail = detailText(entry.detail);
                      return (
                        <div key={entry._id} className="flex items-start gap-2">
                          <span
                            className={`shrink-0 text-sm font-semibold px-2 py-0.5 rounded-full ${tone}`}
                          >
                            {label}
                          </span>
                          <div className="min-w-0 text-sm text-ink-muted leading-snug mt-0.5">
                            {detail && <p className="text-ink truncate">{detail}</p>}
                            <p>
                              {entry.actor?.name
                                ? `by ${entry.actor.name} (${entry.actor.role || "moderator"})`
                                : "by system"}
                              {" "}· {formatDate(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default CaseHistoryModal;