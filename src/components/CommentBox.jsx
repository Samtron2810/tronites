import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
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
}) => {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [visibleCount, setVisibleCount] = useState(9);

  const [commentText, setCommentText] = useState("");
  const [isCommentSending, setIsCommentSending] = useState(false);
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
    try {
      await api.post(`/comments/${postId}`, { text: commentText });
      setCommentText("");
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't post your comment. Try again.");
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
    try {
      const res = await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      // Backend cascades: deleting a top-level comment deletes its
      // replies too. Drop that comment's cached reply list to match.
      setRepliesByComment((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      setCommentCount(
        (prev) => res.data.commentCount ?? Math.max(prev - 1, 0),
      );
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
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
    try {
      const res = await api.put(`/comments/like/${commentId}`);
      const applyLike = (c) =>
        c._id === commentId
          ? { ...c, likesCount: res.data.likes, isLiked: res.data.liked }
          : c;
      if (parentCommentId) {
        setRepliesByComment((prev) => ({
          ...prev,
          [parentCommentId]: (prev[parentCommentId] || []).map(applyLike),
        }));
      } else {
        setComments((prev) => prev.map(applyLike));
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update like. Try again.");
    } finally {
      setCommentLikingId(null);
    }
  };

  const handleAddReply = async (parentCommentId) => {
    if (isReplySending || !replyText.trim()) return;
    setIsReplySending(true);
    try {
      const res = await api.post(`/comments/${postId}`, {
        text: replyText,
        parentCommentId,
      });
      setReplyText("");
      setReplyingTo(null);
      setOpenReplies((prev) => ({ ...prev, [parentCommentId]: true }));
      if (res.data?._id) {
        setRepliesByComment((prev) => ({
          ...prev,
          [parentCommentId]: prev[parentCommentId]
            ? prev[parentCommentId].some((r) => r._id === res.data._id)
              ? prev[parentCommentId]
              : [...prev[parentCommentId], res.data]
            : [res.data],
        }));
      } else {
        fetchReplies(parentCommentId);
      }
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't post your reply. Try again.");
    } finally {
      setIsReplySending(false);
    }
  };

  const handleDeleteReply = async (replyId, parentCommentId) => {
    if (commentDeletingId) return;
    setCommentDeletingId(replyId);
    try {
      const res = await api.delete(`/comments/${replyId}`);
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
      setCommentCount(
        (prev) => res.data.commentCount ?? Math.max(prev - 1, 0),
      );
      api.invalidate(`/comments/${postId}`);
    } catch (e) {
      console.error(e);
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

      {/* List */}
      {loadingComments && (
        <p className="text-sm text-ink-muted">Loading comments...</p>
      )}

      {!loadingComments && comments.length === 0 && (
        <p className="text-sm text-ink-muted">
          No comments yet. Be the first to comment.
        </p>
      )}

      <div className="space-y-3" ref={containerRef}>
        {visibleComments.map((c) => (
          <div
            key={c._id}
            data-comment-id={c._id}
            className={`rounded-xl px-3 py-2.5 transition ${
              highlightedCommentId === c._id
                ? "bg-primary-50 ring-2 ring-primary-300"
                : "bg-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Link
                  to={`/profile/${c.user._id}`}
                  className="text-sm font-semibold text-ink hover:text-primary-600 transition"
                >
                  {c.user.name}
                </Link>
                <VerifiedBadge verifications={c.user.verifications} size="sm" />
                {c.user.username && (
                  <span className="text-[11px] text-ink-muted">
                    @{c.user.username}
                  </span>
                )}
              </div>
              <CommentOptionsMenu
                isOwner={c.user._id === currentUser?._id}
                text={c.text}
                onDelete={() =>
                  setDeleteCommentTarget({ type: "comment", id: c._id })
                }
                onReport={() =>
                  setReportTarget({ type: "comment", id: c._id })
                }
              />
            </div>
            <p className="text-sm text-ink-sub mt-0.5">
              <TextWithLinks text={c.text} />
            </p>

            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={() => handleCommentLike(c._id, null)}
                disabled={commentLikingId === c._id}
                className={`flex items-center gap-1 text-sm transition disabled:opacity-50 ${
                  c.isLiked
                    ? "text-red-500"
                    : "text-ink-muted hover:text-red-500"
                }`}
              >
                {c.isLiked ? (
                  <FaHeart size={10} />
                ) : (
                  <FaRegHeart size={10} />
                )}
                {c.likesCount > 0 && <span>{c.likesCount}</span>}
              </button>
              <button
                onClick={() => openReplyComposer(c._id)}
                className="text-sm text-ink-muted hover:text-primary-600 transition font-medium"
              >
                Reply
              </button>
              {c.repliesCount > 0 && (
                <button
                  onClick={() => toggleReplies(c._id)}
                  className="text-sm text-primary-600 font-medium hover:underline"
                >
                  {openReplies[c._id]
                    ? "Hide replies"
                    : `View ${c.repliesCount} ${c.repliesCount === 1 ? "reply" : "replies"}`}
                </button>
              )}
            </div>

            {/* Reply input — shared by both "Reply" on the comment
                itself and "Reply" on any of its replies (§3.5). Either
                path sets replyingTo to this comment's id, so the new
                reply always lands here, flat, never nested. */}
            {replyingTo === c._id && (
              <div className="flex gap-2 mt-2 relative">
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

            {/* Reply thread — flat, one level, all replies under this
                comment sit in the same list at the same indent
                regardless of which reply prompted them. */}
            {openReplies[c._id] && (
              <div className="mt-2 pl-3 border-l-2 border-stroke space-y-2">
                {loadingReplies[c._id] && (
                  <p className="text-sm text-ink-muted">
                    Loading replies...
                  </p>
                )}
                {!loadingReplies[c._id] &&
                  (repliesByComment[c._id] || []).map((r) => (
                    <div
                      key={r._id}
                      data-comment-id={r._id}
                      className={`rounded-lg px-3 py-2 transition ${
                        highlightedCommentId === r._id
                          ? "bg-primary-50 ring-2 ring-primary-300"
                          : "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/profile/${r.user._id}`}
                            className="text-sm font-semibold text-ink hover:text-primary-600 transition"
                          >
                            {r.user.name}
                          </Link>
                          <VerifiedBadge verifications={r.user.verifications} size="sm" />
                          {r.user.username && (
                            <span className="text-[11px] text-ink-muted">
                              @{r.user.username}
                            </span>
                          )}
                        </div>
                        <CommentOptionsMenu
                          isOwner={r.user._id === currentUser?._id}
                          text={r.text}
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
                      </div>
                      <p className="text-sm text-ink-sub mt-0.5">
                        <TextWithLinks text={r.text} />
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          onClick={() => handleCommentLike(r._id, c._id)}
                          disabled={commentLikingId === r._id}
                          className={`flex items-center gap-1 text-sm transition disabled:opacity-50 ${
                            r.isLiked
                              ? "text-red-500"
                              : "text-ink-muted hover:text-red-500"
                          }`}
                        >
                          {r.isLiked ? (
                            <FaHeart size={10} />
                          ) : (
                            <FaRegHeart size={10} />
                          )}
                          {r.likesCount > 0 && <span>{r.likesCount}</span>}
                        </button>
                        {/* Reply-to-a-reply — still targets the parent
                            comment's id (c._id), prefilled with
                            @username, so it posts flat rather than
                            nested (§3.5/§6). */}
                        <button
                          onClick={() =>
                            openReplyComposer(c._id, r.user.username)
                          }
                          className="text-sm text-ink-muted hover:text-primary-600 transition font-medium"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
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
