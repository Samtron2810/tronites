import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart, FaCommentSlash } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/useSocket";
import ReportModal from "./ReportModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import CommentOptionsMenu from "./CommentOptionsMenu";
import TextWithLinks from "./TextWithLinks";
import useMentionAutocomplete from "../hooks/useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";
import VerifiedBadge from "./VerifiedBadge";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

const timeAgo = (value) => {
  const t = new Date(value).getTime();
  if (!t) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

// One comment/reply row, TikTok-style: avatar | name + text + meta line |
// heart column pinned to the right edge. Used for both top-level comments
// (size "lg") and replies (size "sm") so the two can never drift apart.
const CommentRow = ({
  item,
  size,
  isHighlighted,
  isOwner,
  likeBusy,
  onLike,
  onReply,
  onDelete,
  onReport,
}) => {
  const avatarCls = size === "lg" ? "w-9 h-9" : "w-6 h-6";
  return (
    <div
      data-comment-id={item._id}
      className={`flex items-start gap-3 rounded-xl transition ${
        isHighlighted
          ? "bg-primary-50 ring-2 ring-primary-300 -mx-2 px-2 py-1.5"
          : ""
      } ${item.pending ? "opacity-60" : ""}`}
    >
      <Link to={`/profile/${item.user._id}`} replace className="shrink-0">
        <img
          src={
            resizedImageUrl(item.user.profilePic, IMAGE_SIZES.avatarSmall) ||
            defaultAvatar
          }
          alt=""
          className={`${avatarCls} rounded-full object-cover bg-surface`}
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <Link
            to={`/profile/${item.user._id}`}
            replace
            className="truncate text-[13px] font-semibold text-ink-muted hover:text-ink transition"
          >
            {item.user.name}
          </Link>
          <VerifiedBadge verifications={item.user.verifications} size="sm" />
          {isOwner && (
            <span className="shrink-0 rounded px-1 text-[10px] font-semibold leading-4 bg-primary-50 text-primary-600">
              You
            </span>
          )}
        </div>

        <p className="mt-0.5 break-words text-[15px] leading-snug text-ink">
          <TextWithLinks text={item.text} />
        </p>

        <div className="mt-1 flex items-center gap-4 text-xs text-ink-muted">
          <span>{item.pending ? "Sending…" : timeAgo(item.createdAt)}</span>
          {onReply && (
            <button
              onClick={onReply}
              className="font-semibold hover:text-ink transition"
            >
              Reply
            </button>
          )}
          <CommentOptionsMenu
            isOwner={isOwner}
            text={item.text}
            onDelete={onDelete}
            onReport={onReport}
          />
        </div>
      </div>

      <button
        onClick={onLike}
        disabled={likeBusy}
        aria-label={item.isLiked ? "Unlike comment" : "Like comment"}
        className={`shrink-0 w-9 pt-1 flex flex-col items-center gap-0.5 transition active:scale-110 disabled:opacity-50 ${
          item.isLiked ? "text-red-500" : "text-ink-muted hover:text-red-500"
        }`}
      >
        {item.isLiked ? <FaHeart size={16} /> : <FaRegHeart size={16} />}
        <span
          className={`text-xs leading-none ${
            item.likesCount > 0 ? "" : "invisible"
          }`}
        >
          {item.likesCount > 0 ? item.likesCount : 0}
        </span>
      </button>
    </div>
  );
};

// Extracted from PostCard.jsx (was previously inline there) so the same
// comment list/composer/reply implementation can mount in two places:
// the feed card's inline expand-to-comment area, and PostDetailModal's
// lower section. One implementation, two mount points — not a fork.
//
// This was formerly CommentBox.jsx, a 0-byte dead file left over from
// an earlier pass; repurposed here rather than adding yet another file.
//
// Fully self-contained: fetches its own comments on mount (autoFetch),
// owns its own socket subscription for comment-scoped events, and only
// reports the running comment count back up via onCommentCountChange so
// PostCard's like/comment/bookmark action bar (which lives outside this
// component) can display it without duplicating comment state.
const CommentsPanel = ({
  postId,
  initialCommentCount,
  onCommentCountChange,
  // Deep-link targeting (notification "go to comment" navigation):
  // highlightCommentId is the row to scroll to and flash; for reply
  // targets highlightParentId is the top-level comment whose reply
  // thread must be expanded and loaded before the reply row exists.
  highlightCommentId,
  highlightParentId,
  // Author switched commenting off: existing comments stay readable, but the
  // composer and every Reply affordance are replaced/hidden.
  commentsDisabled = false,
  // True when the viewer is the author and commenting is off for everyone
  // else: composer stays usable, with a small reminder above it.
  ownerCommentsOff = false,
}) => {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [visibleCount, setVisibleCount] = useState(9);

  const [commentText, setCommentText] = useState("");
  const [isCommentSending, setIsCommentSending] = useState(false);
  // Set when the server rejects a comment with COMMENTS_DISABLED (the author
  // turned comments off after this view loaded) so the UI flips without a refetch.
  const [serverCommentsOff, setServerCommentsOff] = useState(false);
  const isCommentingOff = commentsDisabled || serverCommentsOff;
  const [commentDeletingId, setCommentDeletingId] = useState(null);

  const [reportTarget, setReportTarget] = useState(null);
  // null | { type: "comment" | "reply", id, parentCommentId? } —
  // parentCommentId only present for replies, so the confirm handler
  // knows which delete path to take.
  const [deleteCommentTarget, setDeleteCommentTarget] = useState(null);

  const [replyingTo, setReplyingTo] = useState(null); // parent comment id, or null
  const [replyText, setReplyText] = useState("");
  const [isReplySending, setIsReplySending] = useState(false);
  const [openReplies, setOpenReplies] = useState({}); // { [commentId]: boolean }
  const [repliesByComment, setRepliesByComment] = useState({}); // { [commentId]: replies[] }
  const [loadingReplies, setLoadingReplies] = useState({});
  const [commentLikingId, setCommentLikingId] = useState(null);

  // Deep-link highlight state — which row (if any) is currently flashed.
  const containerRef = useRef(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const commentInputRef = useRef(null);
  const replyInputRef = useRef(null);
  const commentMention = useMentionAutocomplete();
  const replyMention = useMentionAutocomplete();

  const commentCountRef = useRef(initialCommentCount);
  const setCommentCount = (updater) => {
    commentCountRef.current =
      typeof updater === "function"
        ? updater(commentCountRef.current)
        : updater;
    onCommentCountChange?.(commentCountRef.current);
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await api.getCached(`/comments/${postId}`, { ttlMs: 60_000, revalidate: true });
      setComments(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load comments. Try again.");
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens inside the async fn
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleCommentTextChange = (e) => {
    setCommentText(e.target.value);
    commentMention.handleTextChange(e.target.value, e.target.selectionStart);
  };

  const handleSelectCommentMention = (uname) => {
    const { text: newText, cursorPos } = commentMention.applySuggestion(
      commentText,
      uname,
    );
    setCommentText(newText);
    requestAnimationFrame(() => {
      commentInputRef.current?.focus();
      commentInputRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleAddComment = async () => {
    if (isCommentSending || !commentText.trim()) return;
    setIsCommentSending(true);
    const text = commentText;
    // True optimistic add: render a temp comment immediately using the
    // current user's own profile data, before the request even starts.
    // Replaced with the real comment (real _id) on success, removed on
    // failure. The temp id is prefixed so it can never collide with a
    // real Mongo _id, and the socket dedup guard elsewhere only matches
    // real _ids so it won't touch this temp entry.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticComment = {
      _id: tempId,
      text,
      user: currentUser,
      likesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setCommentText("");
    setComments((prev) => [optimisticComment, ...prev]);
    setCommentCount((prev) => prev + 1);
    try {
      const res = await api.post(`/comments/${postId}`, { text });
      if (res.data?._id) {
        setComments((prev) => {
          const withoutTemp = prev.filter((c) => c._id !== tempId);
          return withoutTemp.some((c) => c._id === res.data._id)
            ? withoutTemp
            : [res.data, ...withoutTemp];
        });
      }
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
      setComments((prev) => prev.filter((c) => c._id !== tempId));
      setCommentCount((prev) => Math.max(0, prev - 1));
      setCommentText(text); // restore so the user doesn't retype
      if (e.response?.data?.code === "COMMENTS_DISABLED") {
        setCommentText("");
        setServerCommentsOff(true);
        toast.error("Comments are turned off for this post.");
      } else {
        toast.error("Couldn't post your comment. Try again.");
      }
    } finally {
      setIsCommentSending(false);
    }
  };

  const handleReplyTextChange = (e) => {
    setReplyText(e.target.value);
    replyMention.handleTextChange(e.target.value, e.target.selectionStart);
  };

  const handleSelectReplyMention = (uname) => {
    const { text: newText, cursorPos } = replyMention.applySuggestion(
      replyText,
      uname,
    );
    setReplyText(newText);
    requestAnimationFrame(() => {
      replyInputRef.current?.focus();
      replyInputRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  // Opens the reply composer for a given top-level comment, optionally
  // pre-filled with an @mention. Used both by a top-level comment's own
  // "Reply" button (no prefill) and by a reply row's "Reply" button
  // (prefilled with the replied-to user's @username). Either way the
  // resulting reply is posted with parentCommentId = the top-level
  // comment's id, never a reply's id — replies stay flat, one level
  // deep, aligned in the same list. The backend also enforces this
  // (rejects a parentCommentId that itself has a parentComment set), so
  // this is belt-and-braces, not the only thing preventing nesting.
  const openReplyComposer = (parentCommentId, prefillUsername) => {
    setReplyingTo(parentCommentId);
    setReplyText(prefillUsername ? `@${prefillUsername} ` : "");
    requestAnimationFrame(() => {
      replyInputRef.current?.focus();
      const len = replyInputRef.current?.value.length ?? 0;
      replyInputRef.current?.setSelectionRange(len, len);
    });
  };

  const handleDeleteComment = async (commentId) => {
    if (commentDeletingId) return;
    setCommentDeletingId(commentId);
    // Optimistic: remove immediately, restore (comment + its replies) on
    // failure. Snapshot both before mutating so rollback can put things
    // back exactly where they were.
    const prevComments = comments;
    const prevReplies = repliesByComment[commentId];
    const removedIndex = comments.findIndex((c) => c._id === commentId);
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    setRepliesByComment((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    setCommentCount((prev) => Math.max(0, prev - 1));
    try {
      const res = await api.delete(`/comments/${commentId}`);
      setCommentCount((prev) => res.data.commentCount ?? prev);
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
      setComments((prev) => {
        if (prev.some((c) => c._id === commentId)) return prev;
        const restored = [...prev];
        restored.splice(Math.max(0, removedIndex), 0, prevComments[removedIndex]);
        return restored;
      });
      if (prevReplies) {
        setRepliesByComment((prev) => ({ ...prev, [commentId]: prevReplies }));
      }
      setCommentCount((prev) => prev + 1);
      toast.error("Couldn't delete comment. Try again.");
    } finally {
      setCommentDeletingId(null);
    }
  };

  const fetchReplies = async (commentId) => {
    try {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));
      const res = await api.getCached(`/comments/${commentId}/replies`, {
        ttlMs: 60_000,
        revalidate: true,
      });
      setRepliesByComment((prev) => ({ ...prev, [commentId]: res.data }));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load replies. Try again.");
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const toggleReplies = (commentId) => {
    const willOpen = !openReplies[commentId];
    setOpenReplies((prev) => ({ ...prev, [commentId]: willOpen }));
    if (willOpen && !repliesByComment[commentId]) fetchReplies(commentId);
  };

  const handleCommentLike = async (commentId, parentCommentId) => {
    if (commentLikingId) return;
    setCommentLikingId(commentId);

    // Find current like state so we can flip it optimistically and know
    // what to roll back to on failure.
    const list = parentCommentId
      ? repliesByComment[parentCommentId] || []
      : comments;
    const target = list.find((c) => c._id === commentId);
    const prevLiked = target?.isLiked ?? false;
    const prevCount = target?.likesCount ?? 0;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    const applyLike = (c, liked, count) =>
      c._id === commentId ? { ...c, isLiked: liked, likesCount: count } : c;

    const setOptimistic = (liked, count) => {
      if (parentCommentId) {
        setRepliesByComment((prev) => ({
          ...prev,
          [parentCommentId]: (prev[parentCommentId] || []).map((c) =>
            applyLike(c, liked, count),
          ),
        }));
      } else {
        setComments((prev) => prev.map((c) => applyLike(c, liked, count)));
      }
    };

    setOptimistic(nextLiked, nextCount);
    try {
      const res = await api.put(`/comments/like/${commentId}`);
      setOptimistic(res.data.liked, res.data.likes);
    } catch (e) {
      console.error(e);
      setOptimistic(prevLiked, prevCount);
      toast.error("Couldn't update like. Try again.");
    } finally {
      setCommentLikingId(null);
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (isReplySending || !replyText.trim()) return;
    setIsReplySending(true);
    const text = replyText;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticReply = {
      _id: tempId,
      text,
      user: currentUser,
      likesCount: 0,
      isLiked: false,
      parentCommentId,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setReplyText("");
    setReplyingTo(null);
    setOpenReplies((prev) => ({ ...prev, [parentCommentId]: true }));
    setRepliesByComment((prev) => ({
      ...prev,
      [parentCommentId]: prev[parentCommentId]
        ? [...prev[parentCommentId], optimisticReply]
        : [optimisticReply],
    }));
    try {
      const res = await api.post(`/comments/${postId}`, {
        text,
        parentCommentId,
      });
      if (res.data?._id) {
        setRepliesByComment((prev) => {
          const withoutTemp = (prev[parentCommentId] || []).filter(
            (r) => r._id !== tempId,
          );
          return {
            ...prev,
            [parentCommentId]: withoutTemp.some((r) => r._id === res.data._id)
              ? withoutTemp
              : [...withoutTemp, res.data],
          };
        });
      } else {
        fetchReplies(parentCommentId);
      }
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
      setRepliesByComment((prev) => ({
        ...prev,
        [parentCommentId]: (prev[parentCommentId] || []).filter(
          (r) => r._id !== tempId,
        ),
      }));
      setReplyText(text);
      setReplyingTo(parentCommentId);
      if (e.response?.data?.code === "COMMENTS_DISABLED") {
        setReplyText("");
        setReplyingTo(null);
        setServerCommentsOff(true);
        toast.error("Comments are turned off for this post.");
      } else {
        toast.error("Couldn't post your reply. Try again.");
      }
    } finally {
      setIsReplySending(false);
    }
  };

  const handleDeleteReply = async (replyId, parentCommentId) => {
    if (commentDeletingId) return;
    setCommentDeletingId(replyId);
    const prevReplies = repliesByComment[parentCommentId] || [];
    const removedIndex = prevReplies.findIndex((r) => r._id === replyId);
    setRepliesByComment((prev) => ({
      ...prev,
      [parentCommentId]: (prev[parentCommentId] || []).filter(
        (r) => r._id !== replyId,
      ),
    }));
    setComments((prev) =>
      prev.map((c) =>
        c._id === parentCommentId
          ? { ...c, repliesCount: Math.max((c.repliesCount || 1) - 1, 0) }
          : c,
      ),
    );
    setCommentCount((prev) => Math.max(0, prev - 1));
    try {
      const res = await api.delete(`/comments/${replyId}`);
      setCommentCount((prev) => res.data.commentCount ?? prev);
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
      setRepliesByComment((prev) => {
        const current = prev[parentCommentId] || [];
        if (current.some((r) => r._id === replyId)) return prev;
        const restored = [...current];
        restored.splice(Math.max(0, removedIndex), 0, prevReplies[removedIndex]);
        return { ...prev, [parentCommentId]: restored };
      });
      setComments((prev) =>
        prev.map((c) =>
          c._id === parentCommentId
            ? { ...c, repliesCount: (c.repliesCount || 0) + 1 }
            : c,
        ),
      );
      setCommentCount((prev) => prev + 1);
      toast.error("Couldn't delete reply. Try again.");
    } finally {
      setCommentDeletingId(null);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!deleteCommentTarget) return;
    if (deleteCommentTarget.type === "reply") {
      await handleDeleteReply(
        deleteCommentTarget.id,
        deleteCommentTarget.parentCommentId,
      );
    } else {
      await handleDeleteComment(deleteCommentTarget.id);
    }
    setDeleteCommentTarget(null);
  };

  // Mirrors PostCard's post-report submit — same endpoint/payload shape,
  // scoped here to comment/reply targets only (post-level reporting
  // stays in PostCard since this component has no notion of the post
  // itself, only its comments).
  const handleReportSubmit = async ({ reason, details }) => {
    if (!reportTarget) return;
    try {
      await api.post("/reports", {
        targetType: "comment",
        targetId: reportTarget.id,
        reason,
        details,
      });
      toast.success("Report submitted. Thanks for the heads up.");
      setReportTarget(null);
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't submit report. Try again.",
      );
    }
  };

  // Comment-scoped socket events only — post-level events (likeUpdate,
  // postUpdated) stay subscribed in PostCard, which owns that state.
  useEffect(() => {
    if (!socket || !postId) return;

    const handleNewComment = (data) => {
      if (data.postId !== postId) return;
      setCommentCount(data.commentCount);
      if (data.parentCommentId) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === data.parentCommentId
              ? { ...c, repliesCount: (c.repliesCount || 0) + 1 }
              : c,
          ),
        );
        setRepliesByComment((prev) =>
          prev[data.parentCommentId]
            ? {
                ...prev,
                [data.parentCommentId]: prev[data.parentCommentId].some(
                  (r) => r._id === data.comment._id,
                )
                  ? prev[data.parentCommentId]
                  : [...prev[data.parentCommentId], data.comment],
              }
            : prev,
        );
      } else {
        setComments((prev) =>
          prev.some((c) => c._id === data.comment._id)
            ? prev
            : [data.comment, ...prev],
        );
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.postId !== postId) return;
      setCommentCount(data.commentCount);
      if (data.parentCommentId) {
        setRepliesByComment((prev) =>
          prev[data.parentCommentId]
            ? {
                ...prev,
                [data.parentCommentId]: prev[data.parentCommentId].filter(
                  (r) => r._id !== data.commentId,
                ),
              }
            : prev,
        );
        setComments((prev) =>
          prev.map((c) =>
            c._id === data.parentCommentId
              ? { ...c, repliesCount: Math.max((c.repliesCount || 1) - 1, 0) }
              : c,
          ),
        );
      } else {
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
        setRepliesByComment((prev) => {
          const next = { ...prev };
          delete next[data.commentId];
          return next;
        });
      }
    };

    const handleCommentLikeUpdate = (data) => {
      if (data.postId !== postId) return;
      const isSelf = data.userId === currentUser?._id?.toString();
      const applyUpdate = (c) => {
        if (c._id !== data.commentId) return c;
        return {
          ...c,
          likesCount: data.likesCount,
          isLiked: isSelf ? data.liked : c.isLiked,
        };
      };
      setComments((prev) => prev.map(applyUpdate));
      setRepliesByComment((prev) => {
        const next = { ...prev };
        for (const parentId of Object.keys(next)) {
          next[parentId] = next[parentId].map(applyUpdate);
        }
        return next;
      });
    };

    socket.on("newComment", handleNewComment);
    socket.on("commentDeleted", handleCommentDeleted);
    socket.on("commentLikeUpdate", handleCommentLikeUpdate);
    return () => {
      socket.off("newComment", handleNewComment);
      socket.off("commentDeleted", handleCommentDeleted);
      socket.off("commentLikeUpdate", handleCommentLikeUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, postId, currentUser?._id]);

  // Deep-link derivations — computed during render rather than set from
  // an effect, so widening the list causes no cascading setState
  // re-render. If the highlight target — or, for a reply target, the
  // parent comment it threads under — sits behind the "Show more
  // comments" slice, widen the slice so the row mounts and the
  // highlight effect below can scroll to it.
  const deepLinkTopIdx = highlightCommentId
    ? comments.findIndex((c) => c._id === highlightCommentId)
    : -1;
  const deepLinkParentIdx = highlightParentId
    ? comments.findIndex((c) => c._id === highlightParentId)
    : -1;
  const needsWidenedSlice =
    deepLinkTopIdx >= visibleCount ||
    (highlightParentId && deepLinkParentIdx >= visibleCount);
  const effectiveVisibleCount = needsWidenedSlice
    ? comments.length
    : visibleCount;
  const visibleComments = comments.slice(0, effectiveVisibleCount);
  const hasMore = effectiveVisibleCount < comments.length;

  // Deep-link highlighting — notification "go to comment" navigation
  // lands here with the target comment's id (and, for replies, its
  // parent's id). Scrolls the target row into view and flashes a
  // highlight ring. Runs after comments load; retries briefly because
  // the target row may still be mounting (reply threads load async).
  // No synchronous setState here — thread opening is deferred to a
  // frame and slice widening is derived during render above.
  useEffect(() => {
    if (loadingComments || !highlightCommentId) return;
    let cancelled = false;

    const flash = (el) => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedCommentId(highlightCommentId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(
        () => setHighlightedCommentId(null),
        2500,
      );
    };

    const tryScroll = (attempt = 0) => {
      if (cancelled) return;
      const el = containerRef.current?.querySelector(
        `[data-comment-id="${highlightCommentId}"]`,
      );
      if (el) {
        flash(el);
        return;
      }
      if (attempt < 15) setTimeout(() => tryScroll(attempt + 1), 200);
    };

    // Force the parent's reply thread open a frame from now (not sync
    // in the effect body) so the user can still hide it afterwards —
    // it becomes ordinary openReplies state.
    const openThread = (onReady) => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setOpenReplies((prev) =>
          prev[highlightParentId]
            ? prev
            : { ...prev, [highlightParentId]: true },
        );
        onReady();
      });
    };

    if (highlightParentId) {
      // Reply target — its row lives inside the parent's reply thread,
      // so the parent must exist and its replies must be open and
      // loaded before the reply row exists to scroll to.
      if (deepLinkParentIdx === -1) return;
      if (repliesByComment[highlightParentId]) {
        openThread(() => tryScroll());
      } else {
        (async () => {
          try {
            setLoadingReplies((prev) => ({
              ...prev,
              [highlightParentId]: true,
            }));
            const res = await api.get(`/comments/${highlightParentId}/replies`);
            if (cancelled) return;
            setRepliesByComment((prev) => ({
              ...prev,
              [highlightParentId]: res.data,
            }));
          } catch {
            // Replies failed to load — the parent row still shows; skip
            // the flash rather than erroring over a deep-link nicety.
          } finally {
            if (!cancelled)
              setLoadingReplies((prev) => ({
                ...prev,
                [highlightParentId]: false,
              }));
          }
          openThread(() => tryScroll());
        })();
      }
      return () => {
        cancelled = true;
      };
    }

    // Top-level comment target — slice widening already happened
    // during render; scroll once the row is mounted.
    if (deepLinkTopIdx === -1) return;
    requestAnimationFrame(() => tryScroll());
    return () => {
      cancelled = true;
    };
  }, [
    loadingComments,
    comments,
    deepLinkTopIdx,
    deepLinkParentIdx,
    highlightCommentId,
    highlightParentId,
    repliesByComment,
  ]);

  return (
    <div className="space-y-3">
      {reportTarget && (
        <ReportModal
          targetLabel="this comment"
          onConfirm={handleReportSubmit}
          onCancel={() => setReportTarget(null)}
        />
      )}

      {deleteCommentTarget && (
        <ConfirmDeleteModal
          title={
            deleteCommentTarget.type === "reply"
              ? "Delete Reply"
              : "Delete Comment"
          }
          message={`Are you sure you want to delete this ${deleteCommentTarget.type === "reply" ? "reply" : "comment"}? This action cannot be undone.`}
          onConfirm={handleConfirmDeleteComment}
          onCancel={() => setDeleteCommentTarget(null)}
        />
      )}

      {/* Composer */}
      {ownerCommentsOff && !isCommentingOff && (
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <FaCommentSlash size={11} className="shrink-0" />
          <span>Commenting is off for everyone else. Only you can comment.</span>
        </div>
      )}
      {isCommentingOff ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-stroke bg-surface px-3.5 py-3 text-sm text-ink-muted">
          <FaCommentSlash size={14} className="shrink-0" />
          <span>The author has turned off commenting on this post.</span>
        </div>
      ) : (
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <input
            ref={commentInputRef}
            value={commentText}
            onChange={handleCommentTextChange}
            onBlur={commentMention.closeSuggestions}
            placeholder="Write a comment..."
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !commentMention.showSuggestions &&
              handleAddComment()
            }
            className="w-full border border-stroke rounded-xl px-3 py-2 text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
          />
          {commentMention.showSuggestions && (
            <MentionSuggestions
              suggestions={commentMention.suggestions}
              onSelect={handleSelectCommentMention}
            />
          )}
        </div>
        <button
          onClick={handleAddComment}
          disabled={!commentText.trim() || isCommentSending}
          className="px-4 py-2 rounded-xl text-base font-medium text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isCommentSending ? "..." : "Post"}
        </button>
      </div>
      )}

      {/* List */}
      {loadingComments && (
        <p className="text-sm text-ink-muted">Loading comments...</p>
      )}

      {!loadingComments && comments.length === 0 && (
        <p className="text-sm text-ink-muted">
          No comments yet. Be the first to comment.
        </p>
      )}

      <div className="space-y-5" ref={containerRef}>
        {visibleComments.map((c) => (
          <div key={c._id}>
            <CommentRow
              item={c}
              size="lg"
              isHighlighted={highlightedCommentId === c._id}
              isOwner={c.user._id === currentUser?._id}
              likeBusy={commentLikingId === c._id}
              onLike={() => handleCommentLike(c._id, null)}
              onReply={
                isCommentingOff ? null : () => openReplyComposer(c._id)
              }
              onDelete={() =>
                setDeleteCommentTarget({ type: "comment", id: c._id })
              }
              onReport={() => setReportTarget({ type: "comment", id: c._id })}
            />

            {/* Reply input — shared by both "Reply" on the comment
                itself and "Reply" on any of its replies (§3.5). Either
                path sets replyingTo to this comment's id, so the new
                reply always lands here, flat, never nested. */}
            {!isCommentingOff && replyingTo === c._id && (
              <div className="flex gap-2 mt-3 ml-12 relative">
                <div className="flex-1 relative">
                  <input
                    ref={replyInputRef}
                    value={replyText}
                    onChange={handleReplyTextChange}
                    onBlur={replyMention.closeSuggestions}
                    placeholder={`Reply to ${c.user.name}...`}
                    autoFocus
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      !replyMention.showSuggestions &&
                      handleAddReply(c._id)
                    }
                    className="w-full border border-stroke rounded-lg px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
                  />
                  {replyMention.showSuggestions && (
                    <MentionSuggestions
                      suggestions={replyMention.suggestions}
                      onSelect={handleSelectReplyMention}
                    />
                  )}
                </div>
                <button
                  onClick={() => handleAddReply(c._id)}
                  disabled={!replyText.trim() || isReplySending}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isReplySending ? "..." : "Reply"}
                </button>
              </div>
            )}

            {c.repliesCount > 0 && (
              <button
                onClick={() => toggleReplies(c._id)}
                className="mt-2 ml-12 flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition"
              >
                <span className="h-px w-6 bg-stroke" />
                {openReplies[c._id]
                  ? "Hide replies"
                  : `View ${c.repliesCount} ${c.repliesCount === 1 ? "reply" : "replies"}`}
              </button>
            )}

            {/* Reply thread — flat, one level. Indented past the parent
                avatar only on the left, so every heart column still ends
                at the same right edge as the top-level ones. */}
            {openReplies[c._id] && (
              <div className="mt-3 ml-12 space-y-4">
                {loadingReplies[c._id] && (
                  <p className="text-sm text-ink-muted">Loading replies...</p>
                )}
                {!loadingReplies[c._id] &&
                  (repliesByComment[c._id] || []).map((r) => (
                    <CommentRow
                      key={r._id}
                      item={r}
                      size="sm"
                      isHighlighted={highlightedCommentId === r._id}
                      isOwner={r.user._id === currentUser?._id}
                      likeBusy={commentLikingId === r._id}
                      onLike={() => handleCommentLike(r._id, c._id)}
                      onReply={
                        isCommentingOff
                          ? null
                          : () => openReplyComposer(c._id, r.user.username)
                      }
                      onDelete={() =>
                        setDeleteCommentTarget({
                          type: "reply",
                          id: r._id,
                          parentCommentId: c._id,
                        })
                      }
                      onReport={() =>
                        setReportTarget({ type: "reply", id: r._id })
                      }
                    />
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setVisibleCount((p) => p + 9)}
          className="text-sm text-primary-600 font-semibold hover:underline"
        >
          Show more comments
        </button>
      )}
    </div>
  );
};

export default CommentsPanel;
