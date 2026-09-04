import { Link } from "react-router-dom";
import defaultAvatar from "../assets/defaultAvatar";
import TextWithLinks from "./TextWithLinks";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import VerifiedBadge from "./VerifiedBadge";

// Compact preview of the ORIGINAL post embedded inside a quote — used
// inside QuotePostModal (before posting) and inside a quote's own
// card/detail-modal (after posting). Not a second interactive surface
// for the original's like/comment/repost actions (those belong to the
// original's own card/modal, opened via the click here) — this is a
// reference/preview only.
//
// The parent is responsible for making this clickable (see PostCard's
// and PostDetailModal's onClick wrappers) — this component itself
// stays presentational so it renders identically inside
// QuotePostModal, where a click-through wouldn't make sense (the
// original hasn't fully posted the quote yet).
const QuotedPostPreview = ({ post }) => {
  if (!post) {
    return (
      <div className="rounded-xl border border-stroke bg-surface p-3 text-sm text-ink-muted">
        This post is no longer available.
      </div>
    );
  }

  const media = post.images || [];
  const thumb = media[0];

  return (
    <div className="rounded-xl border border-stroke bg-surface p-3 hover:border-primary-200 transition">
      <div className="flex items-start sm:items-center gap-2 mb-1.5">
        <img
          src={
            resizedImageUrl(post.user?.profilePic, IMAGE_SIZES.avatarSmall) ||
            defaultAvatar
          }
          alt="user"
          className="w-6 h-6 rounded-full object-cover shrink-0"
        />
        <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-y-0.5 sm:gap-x-1.5">
          <Link
            to={`/profile/${post.user?._id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold text-ink hover:text-primary-600 transition truncate"
          >
            {post.user?.name}
          </Link>
          {post.user?.verifications?.length > 0 && (
            <VerifiedBadge
              verifications={post.user.verifications}
              size="sm"
              className="ml-0.5"
            />
          )}
          {post.user?.username && (
            <span className="text-xs text-ink-muted truncate">
              @{post.user.username}
            </span>
          )}
        </div>
      </div>

      {post.text && (
        <p className="text-sm text-ink-sub leading-snug line-clamp-4 whitespace-pre-line">
          <TextWithLinks text={post.text} />
        </p>
      )}

      {thumb && (
        <div className="mt-2 rounded-lg overflow-hidden bg-card">
          <img
            src={resizedImageUrl(thumb, IMAGE_SIZES.feedImage)}
            alt="quoted post media"
            className="w-full max-h-56 object-cover"
          />
        </div>
      )}

      {!thumb && post.video?.thumbnailUrl && (
        <div className="mt-2 rounded-lg overflow-hidden bg-black">
          <img
            src={post.video.thumbnailUrl}
            alt="quoted post video thumbnail"
            className="w-full max-h-56 object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default QuotedPostPreview;
