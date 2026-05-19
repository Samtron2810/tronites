import { useEffect, useState } from "react";

import { FaHeart, FaRegHeart, FaRegComment } from "react-icons/fa";

import api from "../services/api";

const PostCard = ({
  postId,
  name,
  time,
  text,
  image,
  likes,
  commentsCount,
  isLiked,
}) => {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);

  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(commentsCount);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  // 👇 NEW: pagination state
  const [visibleCount, setVisibleCount] = useState(1);

  // fetch comments
  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/${postId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  // add comment
  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      const res = await api.post(`/comments/${postId}`, {
        text: commentText,
      });

      setComments([res.data, ...comments]);
      setCommentCount((prev) => prev + 1);
      setCommentText("");
    } catch (error) {
      console.log(error);
    }
  };

  //handle like
  // const handleLike = async () => {
  //   try {
  //     await api.put(`/posts/like/${postId}`);

  //     if (liked) {
  //       setLikeCount((prev) => prev - 1);
  //     } else {
  //       setLikeCount((prev) => prev + 1);
  //     }

  //     setLiked(!liked);
  //   } catch (error) {
  //     console.log(error);
  //   }
  // };
  const handleLike = async () => {
    try {
      const res = await api.put(`/posts/like/${postId}`);

      setLikeCount(res.data.likes);

      setLiked(res.data.liked);
    } catch (error) {
      console.log(error);
    }
  };

  // fetch comments
  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  // reset pagination when comments open
  useEffect(() => {
    if (showComments) {
      setVisibleCount(1);
    }
  }, [showComments]);

  // 👇 show only limited comments
  const visibleComments = comments.slice(0, visibleCount);

  // 👇 check if more exists
  const hasMore = visibleCount < comments.length;

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      {/* User Info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-300"></div>

        <div>
          <h2 className="font-bold text-gray-900">{name}</h2>
          <p className="text-sm text-gray-500">{time}</p>
        </div>
      </div>

      {/* Post Text */}
      <p className="text-gray-800 mt-4 leading-relaxed">{text}</p>

      {/* Post Image */}
      {image && (
        <img
          src={image}
          alt="post"
          className="mt-4 rounded-xl w-full h-64 object-cover"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 mt-5">
        {/* Like */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition ${
            liked ? "text-red-500" : "text-gray-700 hover:text-red-500"
          }`}
        >
          {liked ? <FaHeart /> : <FaRegHeart />}
          <span>{likeCount}</span>
        </button>

        {/* Comment count */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-700 hover:text-blue-500"
        >
          <FaRegComment />
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Toggle comments */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="text-sm text-blue-500 mt-3"
      >
        {showComments ? "Hide comments" : "View comments"}
      </button>

      {/* COMMENTS SECTION */}
      {showComments && (
        <div className="mt-4">
          {/* Input */}
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

          {/* Comments List */}
          <div className="mt-3 space-y-2">
            {visibleComments.map((c) => (
              <div key={c._id} className="bg-gray-100 p-2 rounded-lg">
                <p className="text-sm font-semibold">{c.user.name}</p>
                <p className="text-sm">{c.text}</p>
              </div>
            ))}
          </div>

          {/* LOAD MORE BUTTON */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((prev) => prev + 9)}
              className="mt-3 text-blue-500 text-sm hover:underline"
            >
              Show more comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;
