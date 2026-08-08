import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart, FaRegComment, FaTrash } from "react-icons/fa";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DeletePostModal from "./DeletePostModal";
import { useSocket } from "../context/SocketContext";

const PostCard = ({
  postId,
  userId,
  name,
  profilePic,
  time,
  text,
  image,
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
  const { socket } = useSocket();

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
      setCommentCount(res.data.commentCount ?? Math.max(commentCount - 1, 0));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete comment. Try again.");
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
      setComments((prev) =>
        prev.some((c) => c._id === data.comment._id)
          ? prev
          : [data.comment, ...prev],
      );
    };
    const handleCommentDeleted = (data) => {
      if (data.postId !== postId) return;
      setComments((prev) => prev.filter((c) => c._id !== data.commentId));
      setCommentCount(data.commentCount);
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
        <p className="text-ink-sub text-sm leading-relaxed">{text}</p>

        {/* Image */}
        {image && (
          <img
            src={image}
            alt="post"
            className="mt-4 rounded-xl w-full max-h-96 object-contain bg-surface"
          />
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
                  <p className="text-xs text-ink-sub mt-0.5">{c.text}</p>
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
