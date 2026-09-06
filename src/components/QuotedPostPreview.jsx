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
  // Show up to 4 images in a grid; any overflow is indicated by "+N" on
  // the last visible cell — mirrors the PostCard multi-image grid shape
  // so the preview is a faithful miniature of the original.
  const visibleMedia = media.slice(0, 4);
  const overflowCount = media.length - 4;
  const hasVideo = Boolean(post.video?.thumbnailUrl || post.video?.status);
  const videoProcessing = post.video?.status === "processing";
  const videoFailed = post.video?.status === "failed";

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
        <div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="flex items-center gap-1 min-w-0">
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
                className="shrink-0"
              />
            )}
          </span>
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

      {/* Multi-image grid — 1 image: full width; 2-4: equal 2-up or 2×2 rows.
          Overflow count badge sits over the last visible cell. */}
      {visibleMedia.length > 0 && (
        <div
          className={`mt-2 rounded-lg overflow-hidden bg-card ${
            visibleMedia.length === 1
              ? ""
              : visibleMedia.length === 2
                ? "grid grid-cols-2 gap-0.5"
                : "grid grid-cols-2 grid-rows-2 gap-0.5"
          }`}
          style={{ maxHeight: "10rem" }}
        >
          {visibleMedia.map((img, i) => {
            const isLast = i === visibleMedia.length - 1;
            const showOverlay = isLast && overflowCount > 0;
            return (
              <div key={i} className="relative overflow-hidden bg-surface">
                <img
                  src={resizedImageUrl(img, IMAGE_SIZES.feedImage)}
                  alt={`quoted post image ${i + 1}`}
                  className="w-full h-full object-cover"
                  style={{ maxHeight: visibleMedia.length === 1 ? "10rem" : "5rem" }}
                />
                {showOverlay && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      +{overflowCount}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Video — show thumbnail when ready, spinner when processing, label when failed */}
      {visibleMedia.length === 0 && hasVideo && (
        <div className="mt-2 rounded-lg overflow-hidden bg-black relative" style={{ maxHeight: "10rem" }}>
          {post.video?.thumbnailUrl && !videoProcessing && !videoFailed && (
            <>
              <img
                src={post.video.thumbnailUrl}
                alt="quoted post video thumbnail"
                className="w-full object-cover"
                style={{ maxHeight: "10rem" }}
              />
              {/* Play icon overlay so it reads as video not a photo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </>
          )}
          {videoProcessing && (
            <div className="flex items-center justify-center gap-2 text-white text-xs py-6">
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing video…
            </div>
          )}
          {videoFailed && (
            <div className="flex items-center justify-center text-white/60 text-xs py-6">
              Video unavailable
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuotedPostPreview;
