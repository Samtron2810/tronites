import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiX, FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import api from "../services/api";
import PostCard from "./PostCard";
import TextWithLinks from "./TextWithLinks";
import { dayKey, formatDayLabel, formatMessageTime } from "../utils/chatDate";

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

// Maps the context endpoint's populated post doc into exactly the props
// PostCard takes on feed/profile pages, so the reviewed post renders
// identically to how everyone else sees it. Interaction state starts
// neutral (no extra liked/bookmarked lookups for a review view); the
// like/save buttons still work since moderators are regular users too.
const toPostCardProps = (post) => ({
  postId: post._id,
  userId: post.user._id,
  name: post.user.name,
  username: post.user.username,
  profilePic: post.user.profilePic,
  time: new Date(post.createdAt).toLocaleString(),
  text: post.text,
  images: post.images,
  video: post.video,
  likes: post.likesCount,
  commentsCount: post.commentsCount,
  isLiked: false,
  isBookmarked: false,
  edited: post.edited,
  editedAt: post.editedAt,
  privacy: post.privacy,
});

// Compact READ-ONLY thread window around a flagged message â€” mirrors
// ChatModal's visual language minus all composer/interactivity (this is
// evidence viewing, not conversation). The flagged author's bubbles sit
// on the right so the moderator reads from the reported person's side;
// neighbours exist purely for context.
const MessageThreadView = ({ messages, flaggedId }) => {
  const anchorSenderId = messages.find((m) => m._id === flaggedId)?.sender?._id;

  return (
    <div className="space-y-2.5">
      {messages.map((message, idx) => {
        const curKey = dayKey(message.createdAt);
        const prevKey = idx > 0 ? dayKey(messages[idx - 1].createdAt) : "";
        const showDayDivider =
          (idx === 0 && curKey !== "") ||
          (curKey !== "" && prevKey !== "" && curKey !== prevKey);
        const isFlagged = message._id === flaggedId;
        const onRight = anchorSenderId
          ? message.sender?._id === anchorSenderId
          : false;

        return (
          <Fragment key={message._id}>
            {showDayDivider && (
              <div className="flex justify-center py-1">
                <span className="text-[10px] font-medium text-ink-muted bg-surface border border-stroke rounded-full px-3 py-0.5">
                  {formatDayLabel(message.createdAt)}
                </span>
              </div>
            )}
            <div className={`flex ${onRight ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex flex-col max-w-[75%] min-w-0 gap-1 ${
                  isFlagged
                    ? "rounded-2xl ring-2 ring-red-400 ring-offset-2 ring-offset-card p-1.5 bg-surface"
                    : ""
                }`}
              >
                {isFlagged && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500 self-end">
                    Flagged message
                  </span>
                )}
                {!onRight && (
                  <span className="text-[11px] font-semibold text-ink-sub px-1">
                    {message.sender?.name}
                  </span>
                )}
                {message.video?.url && (
                  <video
                    src={`${message.video.url}#t=0.1`}
                    poster={message.video.thumbnailUrl || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className={`w-full max-h-56 object-contain rounded-xl bg-black ${
                      onRight ? "self-end" : "self-start"
                    }`}
                  />
                )}
                {(() => {
                  const imgs = message.images?.length
                    ? message.images
                    : message.image
                      ? [message.image]
                      : [];
                  if (!imgs.length) return null;
                  return (
                    <div
                      className={`grid grid-cols-2 gap-1 rounded-xl overflow-hidden ${
                        onRight ? "ml-auto" : ""
                      }`}
                    >
                      {imgs.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt={`attachment ${i + 1}`}
                          className="w-full h-auto object-cover"
                        />
                      ))}
                    </div>
                  );
                })()}
                {message.text && (
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-base whitespace-pre-wrap ${
                      onRight
                        ? "bg-primary-600 text-white self-end rounded-br-sm"
                        : "bg-card text-ink self-start rounded-bl-sm border border-stroke"
                    }`}
                  >
                    {message.text}
                  </div>
                )}
                <span
                  className={`text-[10px] text-ink-muted ${
                    onRight ? "self-end" : "self-start"
                  }`}
                  title={new Date(message.createdAt).toLocaleString()}
                >
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};

// In-queue content-preview + takedown modal (Phase 1). Replaces the old
// "open the author's profile and scroll around" flow: the moderator sees
// the exact flagged item here and acts without leaving /moderation.
const ReportContextModal = ({ report, onClose, onResolved }) => {
  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [note, setNote] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchContext = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await api.get(`/reports/${report._id}/context`);
        if (!cancelled) setCtx(res.data);
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e.response?.data?.message || "Couldn't load this report's content."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open; setState happens inside the async fn
    fetchContext();
    return () => {
      cancelled = true;
    };
  }, [report._id]);

  const submitResolve = async ({ status, removeContent = false }) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.put(`/reports/${report._id}/resolve`, {
        status,
        note: note.trim(),
        ...(removeContent ? { removeContent: true } : {}),
      });
      toast.success(
        removeContent
          ? "Content removed and report marked as actioned."
          : "Report dismissed."
      );
      onResolved?.(report._id);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Couldn't resolve the report.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOpenReport = report.status === "open";
  const targetLabel = TARGET_TYPE_LABELS[report.targetType]?.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col border border-stroke">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-stroke shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">Review report</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-ink-muted hover:text-ink hover:bg-surface rounded-lg p-1.5 transition"
            aria-label="Close"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          <div className="text-base text-ink-sub space-y-1">
            <p>
              Reported by{" "}
              <span className="font-medium text-ink">
                {report.reporter?.name || "Unknown"}
              </span>{" "}
              against{" "}
              <span className="font-medium text-ink">
                {report.targetOwner?.name || "Unknown"}
              </span>
            </p>
            {report.details && <p className="italic">"{report.details}"</p>}
            {report.resolutionNote && (
              <p className="text-sm text-ink-muted">
                Resolution note: {report.resolutionNote}
              </p>
            )}
          </div>

          {loading && (
            <p className="text-base text-ink-muted py-6 text-center">Loadingâ€¦</p>
          )}

          {!loading && loadError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-600">
              {loadError}
            </div>
          )}

          {!loading && !loadError && ctx?.post && (
            <PostCard {...toPostCardProps(ctx.post)} />
          )}

          {!loading && !loadError && ctx?.comment && ctx?.post && (
            <>
              <PostCard {...toPostCardProps(ctx.post)} />
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                    Flagged comment
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    {new Date(ctx.comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-ink mt-1.5">
                  {ctx.comment.user?.name}
                </p>
                <p className="text-base text-ink-sub mt-0.5">
                  <TextWithLinks text={ctx.comment.text} />
                </p>
              </div>
            </>
          )}

          {!loading && !loadError && ctx?.messages && (
            <MessageThreadView
              messages={ctx.messages}
              flaggedId={ctx.flaggedMessageId}
            />
          )}

          {!loading &&
            !loadError &&
            ctx &&
            !ctx.post &&
            !ctx.comment &&
            !ctx.messages && (
              <p className="text-base text-ink-muted py-4 text-center">
                User reports are reviewed on the profile page â€” no extra
                content to preview here.
              </p>
            )}
        </div>

        {/* Footer actions â€” open reports only; resolved ones are view-only */}
        {isOpenReport && (
          <div className="border-t border-stroke px-5 py-4 space-y-3 shrink-0">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Optional note (visible only to moderators)"
              rows={2}
              className="w-full rounded-xl border border-stroke px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
            {confirmingRemove ? (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <FiAlertTriangle
                    className="text-red-500 shrink-0 mt-0.5"
                    size={15}
                  />
                  <p className="text-sm text-red-600 leading-relaxed">
                    This will hide the {targetLabel} from everyone on
                    Tronites. The author keeps their account â€” only this{" "}
                    {targetLabel} is removed.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setConfirmingRemove(false)}
                    disabled={submitting}
                    className="px-3.5 py-2 rounded-lg text-sm font-medium text-ink-sub border border-stroke hover:bg-surface transition disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() =>
                      submitResolve({ status: "actioned", removeContent: true })
                    }
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-60"
                  >
                    <FiTrash2 size={13} />
                    {submitting ? "..." : "Confirm & remove"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => submitResolve({ status: "dismissed" })}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-ink-sub border border-stroke hover:bg-surface transition disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => setConfirmingRemove(true)}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                >
                  <FiTrash2 size={13} /> Remove contentâ€¦
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportContextModal;