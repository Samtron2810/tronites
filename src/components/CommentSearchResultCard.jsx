import { Link } from "react-router-dom";
import { FiHeart, FiMessageCircle } from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import TextWithLinks from "./TextWithLinks";

// A comment result is a much lighter row than a full PostCard — it
// links to the parent post (where the real comment thread + actions
// live) rather than duplicating a comment composer/like button inline
// in the search results list.
const CommentSearchResultCard = ({ comment }) => {
  const { user, text, createdAt, likesCount, postId } = comment;

  return (
    <Link
      to={`/post/${postId}`}
      className="block bg-card border border-stroke rounded-2xl p-4 hover:border-primary-200 transition"
    >
      <div className="flex items-start gap-3">
        <img
          src={resizedImageUrl(user?.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
          alt={user?.name}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base font-semibold text-ink truncate">
              {user?.name}
            </span>
            {user?.username && (
              <span className="text-sm text-primary-600 truncate">
                @{user.username}
              </span>
            )}
            <span className="text-sm text-ink-muted">·</span>
            <span className="text-sm text-ink-muted">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-base text-ink mt-0.5 break-words">
            <TextWithLinks text={text} />
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-sm text-ink-muted">
              <FiHeart size={13} />
              {likesCount || 0}
            </span>
            <span className="flex items-center gap-1 text-sm text-primary-600">
              <FiMessageCircle size={13} />
              View in post
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CommentSearchResultCard;
