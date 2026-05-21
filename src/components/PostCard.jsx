import { useEffect, useState } from "react";
import { FaHeart, FaRegHeart, FaRegComment, FaTrash } from "react-icons/fa";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import DeletePostModal from "./DeletePostModal";

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
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/comments/${postId}`, { text: commentText });
      // setComments([res.data, ...comments]);
      setComments((prev) => [res.data, ...prev]);
      setCommentCount((prev) => prev + 1);
      setCommentText("");
    } catch (error) {
      console.log(error);
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

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments]);

  useEffect(() => {
    if (showComments) setVisibleCount(1);
  }, [showComments]);

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
              <h2 className="font-bold text-gray-900">{name}</h2>
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
                className="bg-blue-500 text-white px-4 rounded-lg text-sm"
              >
                Send
              </button>
            </div>

            {/* loading comments skeleton */}
            {loadingComments && (
              <div className="mt-3 text-green-700 font-bold text-center">
                Loading comments...
              </div>
            )}

            {!loadingComments && comments.length === 0 && (
              <div className="mt-3 text-gray-400 text-center text-sm">
                No comments yet. Be the first!
              </div>
            )}

            <div className="mt-3 space-y-2">
              {visibleComments.map((c) => (
                <div key={c._id} className="bg-gray-100 p-2 rounded-lg">
                  <p className="text-sm font-semibold">{c.user.name}</p>
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
