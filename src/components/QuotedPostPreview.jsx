import { Link } from "react-router-dom";
import defaultAvatar from "../assets/defaultAvatar";
import TextWithLinks from "./TextWithLinks";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

// Compact, non-interactive preview of an original post — used to embed
// "what's being quoted" inside QuotePostModal (before posting) and
// inside a quote's feed card (after posting). Deliberately NOT the
// full PostCard: no like/comment/repost actions of its own here (those
// belong to the original post's own card elsewhere in the app) — this
// is a reference/preview, not a second interactive surface for the
// same post. Clicking it navigates to the original author's profile;
// a future /post/:id permalink page (Tier 2.5 in the roadmap) would be
// the more natural click target once it exists.
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
    <div className="rounded-xl border border-stroke bg-surface p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <img
          src={
            resizedImageUrl(post.user?.profilePic, IMAGE_SIZES.avatarSmall) ||
            defaultAvatar
          }
          alt="user"
          className="w-6 h-6 rounded-full object-cover shrink-0"
        />
        <Link
          to={`/profile/${post.user?._id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-ink hover:text-primary-600 transition truncate"
        >
          {post.user?.name}
        </Link>
        {post.user?.username && (
          <span className="text-xs text-ink-muted truncate">
            @{post.user.username}
          </span>
        )}
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
