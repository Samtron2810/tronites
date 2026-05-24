import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart, FaRegComment, FaTrash } from "react-icons/fa";
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

  // fetch comments
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await api.get(`/comments/${postId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingComments(false);
    }
  };

  // add comment
  const handleAddComment = async () => {
    if (isCommentSending || !commentText.trim()) return;

    setIsCommentSending(true);
    try {
      await api.post(`/comments/${postId}`, { text: commentText });
      setCommentText("");

      // Don't adjust the local comment count here.
      // The server emits the updated count via socket to this room.
    } catch (error) {
      console.log(error);
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
    } catch (error) {
      console.log(error);
    } finally {
      setCommentDeletingId(null);
    }
  };

  const handleLike = async () => {
    try {
      const res = await api.put(`/posts/like/${postId}`);
      setLikeCount(res.data.likes);
      setLiked(res.data.liked);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/posts/${postId}`);
      setShowDeleteModal(false);
      if (onDelete) onDelete(postId);
    } catch (error) {
      console.log(error);
    }
  };

  const { socket } = useSocket();

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
    if (socket && postId) {
      // Join the specific post room for live likes and comments
      socket.emit("joinPost", postId);

      const handleLikeUpdate = (data) => {
        if (data.postId === postId) {
          setLikeCount(data.likesCount);
          const isLikedByMe = data.likes.some(
            (id) => id.toString() === currentUser?._id?.toString(),
          );
          setLiked(isLikedByMe);
        }
      };

      const handleNewComment = (data) => {
        if (data.postId === postId) {
          setCommentCount(data.commentCount);
          setComments((prev) => {
            if (prev.some((c) => c._id === data.comment._id)) return prev;
            return [data.comment, ...prev];
          });
        }
      };

      const handleCommentDeleted = (data) => {
        if (data.postId !== postId) return;

        setComments((prev) =>
          prev.filter((comment) => comment._id !== data.commentId),
        );
        setCommentCount(data.commentCount);
      };

      socket.on("likeUpdate", handleLikeUpdate);
      socket.on("newComment", handleNewComment);
      socket.on("commentDeleted", handleCommentDeleted);

      return () => {
        // Clean up: leave room and unbind event listeners
        socket.emit("leavePost", postId);
        socket.off("likeUpdate", handleLikeUpdate);
        socket.off("newComment", handleNewComment);
        socket.off("commentDeleted", handleCommentDeleted);
      };
    }
  }, [socket, postId, currentUser?._id]);

  const visibleComments = comments.slice(0, visibleCount);
  const hasMore = visibleCount < comments.length;

  return (
    <>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeletePostModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-md p-5">
        {/* User Info Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={profilePic || "https://i.pravatar.cc/"}
              alt="user"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <Link
                to={`/profile/${userId}`}
                className="font-bold text-gray-900 hover:text-blue-500"
              >
                {name}
              </Link>
              <p className="text-sm text-gray-500">{time}</p>
            </div>
          </div>

          {/* Delete button — only for post owner */}
          {isOwner && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 cursor-pointer opacity-75 hover:text-red-900 hover:opacity-100 text-lg transition"
              title="Delete post"
            >
              <FaTrash />
            </button>
          )}
        </div>

        {/* Post Text */}
        <p className="text-gray-800 mt-4 leading-relaxed">{text}</p>

        {/* Post Image */}
        {image && (
          <img
            src={image}
            alt="post"
            className="mt-4 rounded-xl w-full h-auto object-cover"
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 mt-5">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 transition ${
              liked ? "text-red-500" : "text-gray-700 hover:text-red-500"
            }`}
          >
            {liked ? <FaHeart /> : <FaRegHeart />}
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-500"
          >
            <FaRegComment />
            <span>{commentCount}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4">
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 border rounded-lg p-2 text-sm outline-none"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || isCommentSending}
                className={`px-4 rounded-lg text-sm text-white transition ${
                  !commentText.trim() || isCommentSending
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isCommentSending ? "Sending..." : "Send"}
              </button>
            </div>

            {!loadingComments && comments.length === 0 && (
              <div className="mt-3 text-gray-400 text-center text-sm">
                No comments yet. Be the first!
              </div>
            )}

            <div className="mt-3 space-y-2">
              {visibleComments.map((c) => (
                <div key={c._id} className="bg-gray-100 p-2 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <Link
                      to={`/profile/${c.user._id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-blue-500"
                    >
                      {c.user.name}
                    </Link>
                    {c.user._id === currentUser?._id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c._id)}
                        disabled={commentDeletingId === c._id}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        {commentDeletingId === c._id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                  <p className="text-sm">{c.text}</p>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => setVisibleCount((prev) => prev + 9)}
                className="mt-1 font-bold text-blue-500 text-sm hover:underline"
              >
                Show more comments
              </button>
            )}
          </div>
        )}

        {/* Toggle comments */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-sm font-bold text-red-500 mt-0 hover:underline"
        >
          {showComments ? "Hide comments" : "View comments"}
        </button>
      </div>
    </>
  );
};

export default PostCard;
