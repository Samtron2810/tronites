import VerifiedBadge from "../components/VerifiedBadge";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { FiHeart, FiMessageCircle, FiRepeat } from "react-icons/fi";

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Total reaction count from a { "❤️": 3, "🔥": 1 } style summary map —
// this endpoint only ever sends aggregate counts (see publicUserController's
// comment on why isLiked/myReaction are never included here), so this
// card has nothing to highlight as "your" reaction.
const reactionTotal = (summary) =>
  Object.values(summary || {}).reduce((sum, n) => sum + n, 0);

/**
 * Read-only post card for the public, anonymous-visible profile page.
 * Deliberately NOT the app's interactive PostCard: every action here
 * (like, comment, bookmark, repost) requires a session, so this card
 * shows counts but turns every action into a login prompt rather than a
 * handler that would silently fail for a logged-out visitor.
 */
const PublicPostCard = ({ post, onRequireLogin }) => {
  if (!post) return null;
  const author = post.repostedBy;

  return (
    <div className="bg-card border border-stroke rounded-2xl p-4 sm:p-5">
      {author && (
        <p className="text-xs text-ink-muted mb-2 flex items-center gap-1.5">
          <FiRepeat size={12} />
          Reposted by {author.name}
        </p>
      )}
      <div className="flex gap-3">
        <img
          src={
            post.user?.profilePic
              ? resizedImageUrl(post.user.profilePic, IMAGE_SIZES.avatarSmall)
              : defaultAvatar
          }
          alt=""
          className="h-10 w-10 rounded-full object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink text-[15px]">
              {post.user?.name}
            </span>
            <VerifiedBadge verifications={post.user?.verifications} size={13} />
            <span className="text-ink-muted text-sm">
              @{post.user?.username} · {formatTime(post.createdAt)}
            </span>
          </div>
          {post.text && (
            <p className="mt-1 text-[15px] text-ink whitespace-pre-wrap break-words">
              {post.text}
            </p>
          )}
          {Array.isArray(post.images) && post.images.length > 0 && (
            <div
              className={`mt-2.5 grid gap-1.5 rounded-xl overflow-hidden ${
                post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {post.images.slice(0, 4).map((img, i) => (
                <img
                  key={i}
                  src={resizedImageUrl(img.url, IMAGE_SIZES.feedImage)}
                  alt={img.altText || ""}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-6 text-ink-muted">
            <button
              onClick={onRequireLogin}
              className="flex items-center gap-1.5 text-sm hover:text-primary-600 transition"
            >
              <FiHeart size={16} />
              {reactionTotal(post.reactionSummary) || ""}
            </button>
            <button
              onClick={onRequireLogin}
              className="flex items-center gap-1.5 text-sm hover:text-primary-600 transition"
            >
              <FiMessageCircle size={16} />
              {post.commentsCount || ""}
            </button>
            <button
              onClick={onRequireLogin}
              className="flex items-center gap-1.5 text-sm hover:text-primary-600 transition"
            >
              <FiRepeat size={16} />
              {post.reposts || ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPostCard;
