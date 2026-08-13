import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart, FaRegComment, FaTrash, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DeletePostModal from "./DeletePostModal";
import { useSocket } from "../context/SocketContext";
import TextWithLinks from "./TextWithLinks";

const PostCard = ({
  postId,
  userId,
  name,
  profilePic,
  time,
  text,
  image,
  images,
  likes,
  commentsCount,
  isLiked,
  onDelete,
}) => {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?._id === userId;

  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(commentsCount);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommentSending, setIsCommentSending] = useState(false);
  const [commentDeletingId, setCommentDeletingId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null); // commentId or null
  const [replyText, setReplyText] = useState("");
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

  const handleAddReply = async (parentCommentId) => {
    if (isReplySending || !replyText.trim()) return;
    setIsReplySending(true);
    try {
      await api.post(`/comments/${postId}`, {
        text: replyText,
        parentCommentId,
      });
      setReplyText("");
      setReplyingTo(null);
      // Make sure the thread is open so the new reply is visible.
      setOpenReplies((prev) => ({ ...prev, [parentCommentId]: true }));
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

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);
  useEffect(() => {
    setLikeCount(likes);
  }, [likes]);
  useEffect(() => {
    setCommentCount(commentsCount);
  }, [commentsCount]);
  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments]);
  useEffect(() => {
    if (showComments) setVisibleCount(1);
  }, [showComments]);

  useEffect(() => {
    if (!socket || !postId) return;
    socket.emit("joinPost", postId);
    const handleLikeUpdate = (data) => {
      if (data.postId !== postId) return;
      setLikeCount(data.likesCount);
      setLiked(
        data.likes.some((id) => id.toString() === currentUser?._id?.toString()),
      );
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
    socket.on("likeUpdate", handleLikeUpdate);
    socket.on("newComment", handleNewComment);
    socket.on("commentDeleted", handleCommentDeleted);
    return () => {
      socket.emit("leavePost", postId);
      socket.off("likeUpdate", handleLikeUpdate);
      socket.off("newComment", handleNewComment);
      socket.off("commentDeleted", handleCommentDeleted);
    };
  }, [socket, postId, currentUser?._id]);

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
              src={profilePic || "https://i.pravatar.cc/"}
              alt="user"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100"
            />
            <div>
              <Link
                to={`/profile/${userId}`}
                className="text-sm font-semibold text-ink hover:text-primary-600 transition"
              >
                {name}
              </Link>
              <p className="text-xs text-ink-muted">{time}</p>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-ink-muted hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50"
              title="Delete post"
            >
              <FaTrash size={13} />
            </button>
          )}
        </div>

        {/* Text */}
        <p className="text-ink-sub text-sm leading-relaxed">
          <TextWithLinks text={text} />
        </p>

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
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3">
            {/* Input */}
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 border border-stroke rounded-xl px-3 py-2 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
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
                    <Link
                      to={`/profile/${c.user._id}`}
                      className="text-xs font-semibold text-ink hover:text-primary-600 transition"
                    >
                      {c.user.name}
                    </Link>
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

                  {/* Reply / thread controls */}
                  <div className="flex items-center gap-3 mt-1.5">
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
                    <div className="flex gap-2 mt-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${c.user.name}...`}
                        autoFocus
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddReply(c._id)
                        }
                        className="flex-1 border border-stroke rounded-lg px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
                      />
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
                        <p className="text-xs text-ink-muted">Loading replies...</p>
                      )}
                      {!loadingReplies[c._id] &&
                        (repliesByComment[c._id] || []).map((r) => (
                          <div key={r._id} className="bg-white rounded-lg px-3 py-2">
                            <div className="flex items-center justify-between">
                              <Link
                                to={`/profile/${r.user._id}`}
                                className="text-xs font-semibold text-ink hover:text-primary-600 transition"
                              >
                                {r.user.name}
                              </Link>
                              {r.user._id === currentUser?._id && (
                                <button
                                  onClick={() => handleDeleteReply(r._id, c._id)}
                                  disabled={commentDeletingId === r._id}
                                  className="text-xs text-ink-muted hover:text-red-500 transition disabled:opacity-50"
                                >
                                  {commentDeletingId === r._id ? "..." : "Delete"}
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-ink-sub mt-0.5">
                              <TextWithLinks text={r.text} />
                            </p>
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
