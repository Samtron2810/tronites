import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaTrash,
  FaPen,
  FaBookmark,
  FaRegBookmark,
  FaChevronLeft,
  FaChevronRight,
  FaEllipsisV,
} from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import DeletePostModal from "./DeletePostModal";
import { useSocket } from "../context/useSocket";
import TextWithLinks from "./TextWithLinks";
import useMentionAutocomplete from "../hooks/useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";
import defaultAvatar from "../assets/defaultAvatar";

const PostCard = ({
  postId,
  userId,
  name,
  username,
  profilePic,
  time,
  text,
  image,
  images,
  video,
  likes,
  commentsCount,
  isLiked,
  isBookmarked,
  edited,
  editedAt,
  onDelete,
  onUnbookmark,
}) => {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?._id === userId;

  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(commentsCount);
  // Track the prop values last synced into state, so a real prop change
  // (parent refetch/pagination) resets local state without a useEffect.
  // Optimistic local mutations (from liking/commenting) aren't affected
  // since they don't touch these `synced*` refs.
  const [syncedIsLiked, setSyncedIsLiked] = useState(isLiked);
  const [syncedLikes, setSyncedLikes] = useState(likes);
  const [syncedCommentsCount, setSyncedCommentsCount] = useState(commentsCount);
  const [syncedIsBookmarked, setSyncedIsBookmarked] = useState(isBookmarked);
  if (isLiked !== syncedIsLiked) {
    setSyncedIsLiked(isLiked);
    setLiked(isLiked);
  }
  if (likes !== syncedLikes) {
    setSyncedLikes(likes);
    setLikeCount(likes);
  }
  if (commentsCount !== syncedCommentsCount) {
    setSyncedCommentsCount(commentsCount);
    setCommentCount(commentsCount);
  }
  if (isBookmarked !== syncedIsBookmarked) {
    setSyncedIsBookmarked(isBookmarked);
    setBookmarked(isBookmarked);
  }
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommentSending, setIsCommentSending] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(1);
  const [syncedShowComments, setSyncedShowComments] = useState(showComments);
  if (showComments !== syncedShowComments) {
    setSyncedShowComments(showComments);
    if (showComments) setVisibleCount(1);
  }
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [postText, setPostText] = useState(text);
  const [postHasBeenEdited, setPostHasBeenEdited] = useState(edited);
  const [postEditedAt, setPostEditedAt] = useState(editedAt);
  // Same derive-during-render sync pattern as liked/likeCount above — a
  // real prop change (parent refetch) should update the displayed text;
  // an in-flight local edit shouldn't be clobbered by it either, since
  // isEditing gates the textarea vs. the rendered text separately.
  const [syncedText, setSyncedText] = useState(text);
  if (text !== syncedText) {
    setSyncedText(text);
    setPostText(text);
    setEditText(text);
    setPostHasBeenEdited(edited);
    setPostEditedAt(editedAt);
  }
  const [loadingComments, setLoadingComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [postVideo, setPostVideo] = useState(video);
  const videoRef = useRef(null);
  const [syncedVideoStatus, setSyncedVideoStatus] = useState(video?.status);
  if (video?.status !== syncedVideoStatus) {
    setSyncedVideoStatus(video?.status);
    setPostVideo(video);
  }
  const [replyingTo, setReplyingTo] = useState(null); // commentId or null
  const [replyText, setReplyText] = useState("");
  const commentInputRef = useRef(null);
  const replyInputRef = useRef(null);
  const commentMention = useMentionAutocomplete();
  const replyMention = useMentionAutocomplete();
  const [isReplySending, setIsReplySending] = useState(false);
  const [openReplies, setOpenReplies] = useState({}); // { [commentId]: boolean }
  const [repliesByComment, setRepliesByComment] = useState({}); // { [commentId]: replies[] }
  const [loadingReplies, setLoadingReplies] = useState({}); // { [commentId]: boolean }
  const { socket } = useSocket();

  // New posts use `images` (carousel); old posts fall back to `image`.
  const media = images?.length ? images : image ? [image] : [];

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await api.get(`/comments/${postId}`);
      setComments(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load comments. Try again.");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (isCommentSending || !commentText.trim()) return;
    setIsCommentSending(true);
    try {
      await api.post(`/comments/${postId}`, { text: commentText });
      setCommentText("");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't post your comment. Try again.");
    } finally {
      setIsCommentSending(false);
    }
  };

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

  const handleDeleteComment = async (commentId) => {
    if (commentDeletingId) return;
    setCommentDeletingId(commentId);
    try {
      const res = await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      // Backend cascades: deleting a top-level comment deletes its replies
      // too. Drop that comment's cached reply list locally to match.
      setRepliesByComment((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      setCommentCount(res.data.commentCount ?? Math.max(commentCount - 1, 0));
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
      const res = await api.get(`/comments/${commentId}/replies`);
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

  const [commentLikingId, setCommentLikingId] = useState(null);

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
      // Open the thread and make sure it actually has data — either
      // append the reply we just got back (fast path), or fall back to
      // a fetch if for some reason it's missing from the response.
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
      setCommentCount(res.data.commentCount ?? Math.max(commentCount - 1, 0));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete reply. Try again.");
    } finally {
      setCommentDeletingId(null);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await api.put(`/posts/like/${postId}`);
      setLikeCount(res.data.likes);
      setLiked(res.data.liked);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update like. Try again.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);
    try {
      const res = await api.put(`/posts/bookmark/${postId}`);
      setBookmarked(res.data.bookmarked);
      if (!res.data.bookmarked && onUnbookmark) onUnbookmark();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update saved posts. Try again.");
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/posts/${postId}`);
      setShowDeleteModal(false);
      if (onDelete) onDelete(postId);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete post. Try again.");
    }
  };

  const handleEditCancel = () => {
    setEditText(postText);
    setIsEditing(false);
  };

  const handleEditSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed && media.length === 0) {
      toast.error("Post must contain text or image");
      return;
    }
    if (trimmed === postText.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      setIsSavingEdit(true);
      const res = await api.put(`/posts/${postId}`, { text: trimmed });
      setPostText(res.data.text);
      setEditText(res.data.text);
      setPostHasBeenEdited(true);
      setPostEditedAt(res.data.editedAt);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't save changes. Try again.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open; setState happens inside the async fn
    if (showComments) fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);

  // Close the post menu when clicking outside it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!socket || !postId) return;
    socket.emit("joinPost", postId);
    const handleLikeUpdate = (data) => {
      if (data.postId !== postId) return;
      setLikeCount(data.likesCount);
      // Only update our own `liked` state if this event is about our own
      // like/unlike action — another viewer's like on this post changes
      // the count but not whether *we* have liked it.
      if (data.userId === currentUser?._id?.toString()) {
        setLiked(data.liked);
      }
    };
    const handleNewComment = (data) => {
      if (data.postId !== postId) return;
      setCommentCount(data.commentCount);
      if (data.parentCommentId) {
        // It's a reply — bump the parent's repliesCount, and append to
        // the cached reply list only if that thread is already loaded
        // (avoids fetching a thread the user never opened).
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
        // A reply was deleted — remove it from that thread's cache and
        // decrement the parent's count.
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
        // A top-level comment was deleted — remove it, and its cascaded
        // replies (deletedReplyIds), from local state.
        setComments((prev) => prev.filter((c) => c._id !== data.commentId));
        setRepliesByComment((prev) => {
          const next = { ...prev };
          delete next[data.commentId];
          return next;
        });
      }
    };
    const handlePostUpdated = (data) => {
      if (data.postId !== postId) return;
      // Don't clobber this viewer's own in-progress edit with the
      // server echo of the save that's already in flight — handleEditSave
      // applies its own response directly.
      if (isEditing) return;
      setPostText(data.text);
      setEditText(data.text);
      setPostHasBeenEdited(data.edited);
      setPostEditedAt(data.editedAt);
    };
    const handleCommentLikeUpdate = (data) => {
      if (data.postId !== postId) return;
      const isSelf = data.userId === currentUser?._id?.toString();
      const applyUpdate = (c) => {
        if (c._id !== data.commentId) return c;
        // Only trust the server's `liked` flag for our own action —
        // other viewers' likes should bump the count without touching
        // whether *we* have liked it.
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
    socket.on("likeUpdate", handleLikeUpdate);
    socket.on("newComment", handleNewComment);
    socket.on("commentDeleted", handleCommentDeleted);
    socket.on("postUpdated", handlePostUpdated);
    socket.on("commentLikeUpdate", handleCommentLikeUpdate);
    return () => {
      socket.emit("leavePost", postId);
      socket.off("likeUpdate", handleLikeUpdate);
      socket.off("newComment", handleNewComment);
      socket.off("commentDeleted", handleCommentDeleted);
      socket.off("postUpdated", handlePostUpdated);
      socket.off("commentLikeUpdate", handleCommentLikeUpdate);
    };
  }, [socket, postId, currentUser?._id, isEditing]);

  // Auto-pause the video when it's scrolled out of view — an off-screen
  // playing video would otherwise keep blaring audio indefinitely. Only
  // pauses; never auto-plays (playback still requires an explicit user
  // action while the post is on screen).
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !postVideo?.url) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !videoEl.paused) {
            videoEl.pause();
          }
        }
      },
      // Pauses once less than a quarter of the video is visible.
      { threshold: 0.25 },
    );
    observer.observe(videoEl);
    return () => observer.disconnect();
  }, [postVideo?.url]);

  const visibleComments = comments.slice(0, visibleCount);
  const hasMore = visibleCount < comments.length;

  return (
    <>
      {showDeleteModal && (
        <DeletePostModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div className="bg-white border border-stroke rounded-2xl p-5 transition hover:shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={profilePic || defaultAvatar}
              alt="user"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/profile/${userId}`}
                  className="text-sm font-semibold text-ink hover:text-primary-600 transition"
                >
                  {name}
                </Link>
                {username && (
                  <span className="text-xs text-ink-muted">@{username}</span>
                )}
              </div>
              <p className="text-xs text-ink-muted">{time}</p>
            </div>
          </div>
          {isOwner && (
            <div className="relative">
              <button
                ref={triggerRef}
                onClick={() => setMenuOpen((o) => !o)}
                className="text-ink-muted hover:text-ink transition p-1.5 rounded-lg hover:bg-surface"
                title="Post options"
                aria-label="Post options"
              >
                <FaEllipsisV size={14} />
              </button>

              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-stroke z-40 py-1"
                >
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-primary-50 transition"
                    >
                      <FaPen className="text-primary-600" size={13} />
                      <span className="font-medium">Edit post</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <FaTrash size={13} />
                    <span className="font-medium">Delete post</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              maxLength={280}
              rows={3}
              autoFocus
              className="w-full text-sm text-ink-sub leading-relaxed border border-primary-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-200 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-ink-muted">
                {editText.length}/280
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditCancel}
                  disabled={isSavingEdit}
                  className="text-xs font-medium text-ink-muted hover:text-ink px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSavingEdit}
                  className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {isSavingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-ink-sub text-sm leading-relaxed">
            <TextWithLinks text={postText} />
            {postHasBeenEdited && (
              <span
                className="text-[11px] text-ink-muted ml-1.5 align-middle"
                title={
                  postEditedAt
                    ? new Date(postEditedAt).toLocaleString()
                    : undefined
                }
              >
                (edited)
              </span>
            )}
          </p>
        )}

        {/* Video */}
        {postVideo?.status === "processing" && (
          <div className="mt-4 rounded-xl overflow-hidden bg-surface aspect-video flex flex-col items-center justify-center gap-2 text-ink-muted">
            <div className="h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Processing video...</span>
          </div>
        )}
        {postVideo?.status === "failed" && (
          <div className="mt-4 rounded-xl overflow-hidden bg-surface aspect-video flex flex-col items-center justify-center gap-1 text-ink-muted">
            <span className="text-xs">Video processing failed.</span>
          </div>
        )}
        {postVideo?.status === "ready" && postVideo.url && (
          <div className="mt-4 rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={`${postVideo.url}#t=0.1`}
              poster={postVideo.thumbnailUrl || undefined}
              controls
              playsInline
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noplaybackrate"
              onContextMenu={(e) => e.preventDefault()}
              className="w-full max-h-96 object-contain"
            />
          </div>
        )}

        {/* Media carousel */}
        {media.length > 0 && (
          <div className="mt-4 relative rounded-xl overflow-hidden bg-surface">
            <img
              src={media[activeSlide]}
              alt={`post-${activeSlide + 1}`}
              className="w-full max-h-96 object-contain bg-surface"
            />

            {media.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setActiveSlide((i) => (i - 1 + media.length) % media.length)
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition"
                  aria-label="Previous image"
                >
                  <FaChevronLeft size={12} />
                </button>
                <button
                  onClick={() => setActiveSlide((i) => (i + 1) % media.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition"
                  aria-label="Next image"
                >
                  <FaChevronRight size={12} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeSlide ? "w-4 bg-white" : "w-1.5 bg-white/50"
                      }`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
                <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeSlide + 1}/{media.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-stroke">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1.5 text-sm transition ${
              isLiking
                ? "opacity-50 cursor-not-allowed"
                : liked
                  ? "text-red-500"
                  : "text-ink-muted hover:text-red-500"
            }`}
          >
            {liked ? <FaHeart size={15} /> : <FaRegHeart size={15} />}
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-primary-600 transition"
          >
            <FaRegComment size={15} />
            <span>{commentCount}</span>
          </button>

          <button
            onClick={handleBookmark}
            disabled={isBookmarking}
            title={bookmarked ? "Remove from saved" : "Save post"}
            className={`ml-auto flex items-center text-sm transition ${
              isBookmarking
                ? "opacity-50 cursor-not-allowed"
                : bookmarked
                  ? "text-primary-600"
                  : "text-ink-muted hover:text-primary-600"
            }`}
          >
            {bookmarked ? (
              <FaBookmark size={15} />
            ) : (
              <FaRegBookmark size={15} />
            )}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3">
            {/* Input */}
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={handleCommentTextChange}
                  onBlur={commentMention.closeSuggestions}
                  placeholder="Write a comment..."
                  className="w-full border border-stroke rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
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
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isCommentSending ? "..." : "Send"}
              </button>
            </div>

            {/* Empty state */}
            {!loadingComments && comments.length === 0 && (
              <p className="text-ink-muted text-xs text-center py-2">
                No comments yet. Be the first!
              </p>
            )}

            {/* Comment list */}
            <div className="space-y-2">
              {visibleComments.map((c) => (
                <div key={c._id} className="bg-surface rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/profile/${c.user._id}`}
                        className="text-xs font-semibold text-ink hover:text-primary-600 transition"
                      >
                        {c.user.name}
                      </Link>
                      {c.user.username && (
                        <span className="text-[11px] text-ink-muted">
                          @{c.user.username}
                        </span>
                      )}
                    </div>
                    {c.user._id === currentUser?._id && (
                      <button
                        onClick={() => handleDeleteComment(c._id)}
                        disabled={commentDeletingId === c._id}
                        className="text-xs text-ink-muted hover:text-red-500 transition disabled:opacity-50"
                      >
                        {commentDeletingId === c._id ? "..." : "Delete"}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-ink-sub mt-0.5">
                    <TextWithLinks text={c.text} />
                  </p>

                  {/* Reply / thread / like controls */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => handleCommentLike(c._id, null)}
                      disabled={commentLikingId === c._id}
                      className={`flex items-center gap-1 text-xs transition disabled:opacity-50 ${
                        c.isLiked
                          ? "text-red-500"
                          : "text-ink-muted hover:text-red-500"
                      }`}
                    >
                      {c.isLiked ? (
                        <FaHeart size={11} />
                      ) : (
                        <FaRegHeart size={11} />
                      )}
                      {c.likesCount > 0 && <span>{c.likesCount}</span>}
                    </button>
                    <button
                      onClick={() =>
                        setReplyingTo(replyingTo === c._id ? null : c._id)
                      }
                      className="text-xs text-ink-muted hover:text-primary-600 transition"
                    >
                      Reply
                    </button>
                    {c.repliesCount > 0 && (
                      <button
                        onClick={() => toggleReplies(c._id)}
                        className="text-xs text-primary-600 font-medium hover:underline"
                      >
                        {openReplies[c._id]
                          ? "Hide replies"
                          : `View ${c.repliesCount} ${c.repliesCount === 1 ? "reply" : "replies"}`}
                      </button>
                    )}
                  </div>

                  {/* Reply input */}
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
                          className="w-full border border-stroke rounded-lg px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
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
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {isReplySending ? "..." : "Reply"}
                      </button>
                    </div>
                  )}

                  {/* Reply thread */}
                  {openReplies[c._id] && (
                    <div className="mt-2 pl-3 border-l-2 border-stroke space-y-2">
                      {loadingReplies[c._id] && (
                        <p className="text-xs text-ink-muted">
                          Loading replies...
                        </p>
                      )}
                      {!loadingReplies[c._id] &&
                        (repliesByComment[c._id] || []).map((r) => (
                          <div
                            key={r._id}
                            className="bg-white rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Link
                                  to={`/profile/${r.user._id}`}
                                  className="text-xs font-semibold text-ink hover:text-primary-600 transition"
                                >
                                  {r.user.name}
                                </Link>
                                {r.user.username && (
                                  <span className="text-[11px] text-ink-muted">
                                    @{r.user.username}
                                  </span>
                                )}
                              </div>
                              {r.user._id === currentUser?._id && (
                                <button
                                  onClick={() =>
                                    handleDeleteReply(r._id, c._id)
                                  }
                                  disabled={commentDeletingId === r._id}
                                  className="text-xs text-ink-muted hover:text-red-500 transition disabled:opacity-50"
                                >
                                  {commentDeletingId === r._id
                                    ? "..."
                                    : "Delete"}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-ink-sub mt-0.5">
                              <TextWithLinks text={r.text} />
                            </p>
                            <button
                              onClick={() => handleCommentLike(r._id, c._id)}
                              disabled={commentLikingId === r._id}
                              className={`flex items-center gap-1 text-xs mt-1.5 transition disabled:opacity-50 ${
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
                className="text-xs text-primary-600 font-semibold hover:underline"
              >
                Show more comments
              </button>
            )}

            <button
              onClick={() => setShowComments(false)}
              className="text-xs text-ink-muted hover:underline"
            >
              Hide comments
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default PostCard;
