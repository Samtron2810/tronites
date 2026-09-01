import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaBookmark,
  FaRegBookmark,
  FaEllipsisV,
  FaTrash,
  FaPen,
  FaRegCopy,
  FaRetweet,
  FaQuoteRight,
} from "react-icons/fa";
import { FiFlag, FiUsers, FiLock } from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import LazyImage from "./LazyImage";
import TextWithLinks from "./TextWithLinks";
import CommentsPanel from "./CommentBox";
import QuotedPostPreview from "./QuotedPostPreview";
import ReactionPicker from "./ReactionPicker";
import ReactionSummaryBar from "./ReactionSummaryBar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import useBackButtonClose from "../hooks/useBackButtonClose";

// Stacked-only layout at every breakpoint (confirmed — no desktop
// side-by-side variant). Media on top, post text below it, action bar
// (like/comment count/save), then the comments panel, all in one
// scrollable column inside the modal.
//
// Vertical centering is done with my-auto on the CARD, never
// items-center on the overlay: flex-centering the item inside this
// scrollable overlay makes everything above the top edge unreachable
// by scrolling once the card exceeds 100vh, so the sticky header ends
// up pinned permanently over the top of the video/image carousel (the
// >=640px / sm: clipping bug). Auto margins center while the card fits
// and collapse to zero when it overflows, keeping the whole card
// scroll-reachable at every height.
//
// Promotes the carousel interaction that already lived inline in
// PostCard (arrows/dots/badge) into this dedicated view, and adds
// click-to-toggle-2x zoom + keyboard/swipe nav on top of it — the
// carousel JSX itself is carried over as-is, not reinvented.
//
// Like/bookmark/edit/delete/report state and handlers are NOT
// duplicated here — PostCard remains the single source of truth for
// all of it and passes both the current values and the handlers down
// as props, so liking from the modal and liking from the card update
// the exact same state (no second API call, no drift between the two
// views of the same post).
const PostDetailModal = ({
  isOpen,
  onClose,
  isOwner,
  userId,
  name,
  username,
  profilePic,
  time,
  postText,
  privacy,
  postHasBeenEdited,
  postEditedAt,
  media,
  postVideo,
  commentCount,
  onCommentCountChange,
  postId,
  // Like
  liked,
  likeCount,
  isLiking,
  onLike,
  // Bookmark
  bookmarked,
  isBookmarking,
  onBookmark,
  // Reactions — same set/switch/clear shape as PostCard's own
  // handleReact, just forwarded so this modal never owns a second copy
  // of the reaction state.
  reactionSummary,
  myReaction,
  onReact,
  // Repost — same on/off toggle shape as PostCard's action bar.
  // Reposting from here reposts whatever THIS modal is showing (the
  // quote itself if a quote is open, or the original if the original
  // is open) — never the embedded quoteOf, which has its own repost
  // state and its own detail view.
  reposted,
  repostCount,
  isReposting,
  onRepost,
  // Options menu (Copy always; Edit/Delete for owner; Report for non-owner)
  onCopy,
  onEdit,
  onDelete,
  onReport,
  editCooldownActive,
  initialSlide = 0,
  // Set only when this modal is showing a quote — the embedded
  // original to render below the quote's own text. Passing the
  // formatted post (same shape QuotedPostPreview already expects).
  quoteOf,
  // Called when the person clicks the embedded original (here, or
  // inside PostCard/QuotedPostPreview) — opens THAT post's own detail
  // view rather than this one. Not this modal's job to know how (a
  // fetch-by-id, a second modal instance, etc.) — that's the caller's
  // concern, this component just forwards the click.
  onOpenOriginal,
  // Deep-link targeting passthrough (notification "go to comment"
  // navigation) — forwarded to the comments panel, which owns the
  // scroll-to-and-highlight behavior. See CommentsPanel's props.
  highlightCommentId,
  highlightParentId,
}) => {
  const [activeSlide, setActiveSlide] = useState(initialSlide);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef(null);
  const touchStartX = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const hoverIntentTimer = useRef(null);

  // Mobile back button closes the modal; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(isOpen, onClose);

  const handleLikeTouchStart = () => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setReactionPickerOpen(true);
    }, 400);
  };
  const handleLikeTouchEnd = () => clearTimeout(longPressTimer.current);
  const handleLikeClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onLike();
  };
  const handleLikeMouseEnter = () => {
    hoverIntentTimer.current = setTimeout(() => setReactionPickerOpen(true), 500);
  };
  const handleLikeMouseLeave = () => clearTimeout(hoverIntentTimer.current);
  const handleReactSelect = (emoji) => {
    setReactionPickerOpen(false);
    onReact?.(emoji);
  };

  // Reset per-open state so a previously-zoomed/scrolled slide doesn't
  // carry over the next time this post's modal is reopened. Same
  // derive-during-render sync pattern PostCard uses for its `synced*`
  // fields, rather than a setState-in-effect.
  const [syncedIsOpen, setSyncedIsOpen] = useState(isOpen);
  if (isOpen !== syncedIsOpen) {
    setSyncedIsOpen(isOpen);
    if (isOpen) {
      setActiveSlide(initialSlide);
      setIsZoomed(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && media.length > 1) {
        setActiveSlide((i) => (i - 1 + media.length) % media.length);
        setIsZoomed(false);
      }
      if (e.key === "ArrowRight" && media.length > 1) {
        setActiveSlide((i) => (i + 1) % media.length);
        setIsZoomed(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, media.length, onClose]);

  // Close the options menu on outside click — same pattern PostCard and
  // CommentOptionsMenu already use.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  if (!isOpen) return null;

  const handleImageClick = (e) => {
    if (isZoomed) {
      setIsZoomed(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${xPct}% ${yPct}%`);
    setIsZoomed(true);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || media.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      setIsZoomed(false);
      if (delta > 0) {
        setActiveSlide((i) => (i - 1 + media.length) % media.length);
      } else {
        setActiveSlide((i) => (i + 1) % media.length);
      }
    }
    touchStartX.current = null;
  };

  const handleToggleVideoMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    setIsVideoMuted(videoEl.muted);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start min-h-full justify-center p-0 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-3xl sm:rounded-2xl my-auto min-h-screen sm:min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke sticky top-0 bg-card z-10 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <img
              src={resizedImageUrl(profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
              alt="user"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/profile/${userId}`}
                  className="text-base font-semibold text-ink hover:text-primary-600 transition"
                >
                  {name}
                </Link>
                {username && (
                  <span className="text-sm text-ink-muted">@{username}</span>
                )}
                {quoteOf && (
                  <span
                    className="flex items-center gap-1 text-[11px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full"
                    title="This post quotes another post"
                  >
                    <FaQuoteRight size={9} />
                    Quote
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1 text-sm text-ink-muted">
                {time}
                {privacy === "followers" && (
                  <FiUsers
                    size={11}
                    className="shrink-0"
                    title="Visible to your followers"
                    aria-label="Visible to your followers"
                  />
                )}
                {privacy === "only-me" && (
                  <FiLock
                    size={11}
                    className="shrink-0"
                    title="Only visible to you"
                    aria-label="Only visible to you"
                  />
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                ref={triggerRef}
                onClick={() => setMenuOpen((o) => !o)}
                className="text-ink-muted hover:text-ink transition p-1.5 rounded-lg hover:bg-surface"
                title="Post options"
                aria-label="Post options"
              >
                <FaEllipsisV size={14} />
              </button>

              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-44 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onCopy();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink-sub hover:bg-surface transition"
                  >
                    <FaRegCopy size={13} />
                    <span className="font-medium">Copy text</span>
                  </button>

                  {isOwner ? (
                    <>
                      {!editCooldownActive && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            onEdit();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink hover:bg-primary-50 transition"
                        >
                          <FaPen className="text-primary-600" size={13} />
                          <span className="font-medium">Edit post</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-red-600 hover:bg-red-50 transition"
                      >
                        <FaTrash size={13} />
                        <span className="font-medium">Delete post</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onReport();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink-sub hover:bg-surface transition"
                    >
                      <FiFlag className="text-amber-500" size={13} />
                      <span className="font-medium">Report post</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-ink-muted hover:text-ink transition p-1.5 rounded-lg hover:bg-surface"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Video */}
        {postVideo?.status === "ready" && postVideo.url && (
          <div className="relative bg-black">
            <video
              ref={videoRef}
              src={`${postVideo.url}#t=0.1`}
              poster={postVideo.thumbnailUrl || undefined}
              controls
              playsInline
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noplaybackrate"
              onContextMenu={(e) => e.preventDefault()}
              className="w-full max-h-[70vh] object-contain"
            />
            <button
              type="button"
              onClick={handleToggleVideoMute}
              aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
              title={isVideoMuted ? "Unmute" : "Mute"}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
            >
              {isVideoMuted ? (
                <FaVolumeMute size={16} />
              ) : (
                <FaVolumeUp size={16} />
              )}
            </button>
          </div>
        )}

        {/* Image carousel — same interaction promoted from PostCard,
            plus click-to-toggle-2x zoom and keyboard/swipe nav. */}
        {media.length > 0 && (
          <div
            className="relative bg-surface overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className={`overflow-hidden ${isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              onClick={handleImageClick}
            >
              <LazyImage
                src={resizedImageUrl(media[activeSlide], IMAGE_SIZES.modalImage)}
                alt={`post-${activeSlide + 1}`}
                className="max-h-[70vh] w-full object-contain transition-transform duration-200"
                style={{
                  transform: isZoomed ? "scale(2)" : "scale(1)",
                  transformOrigin: zoomOrigin,
                }}
                priority
              />
            </div>

            {media.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(false);
                    setActiveSlide(
                      (i) => (i - 1 + media.length) % media.length,
                    );
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition"
                  aria-label="Previous image"
                >
                  <FaChevronLeft size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(false);
                    setActiveSlide((i) => (i + 1) % media.length);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition"
                  aria-label="Next image"
                >
                  <FaChevronRight size={12} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsZoomed(false);
                        setActiveSlide(i);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeSlide ? "w-4 bg-card" : "w-1.5 bg-white/50"
                      }`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
                <span className="absolute top-2 right-2 bg-black/50 text-white text-sm px-2 py-0.5 rounded-full">
                  {activeSlide + 1}/{media.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Text */}
        {postText && (
          <p className="text-ink-sub text-base leading-relaxed px-5 py-4 whitespace-pre-line">
            <TextWithLinks text={postText} />
            {postHasBeenEdited && (
              <span
                className="text-[11px] text-ink-muted ml-1.5 align-middle"
                title={
                  postEditedAt
                    ? new Date(postEditedAt).toLocaleString()
                    : undefined
                }
              >
                (edited)
              </span>
            )}
          </p>
        )}

        {/* Embedded original — quote posts only. Clicking it opens the
            ORIGINAL post's own detail view (a separate post, with its
            own likes/comments/state), not this modal. */}
        {quoteOf && (
          <div
            className="px-5 pb-4 -mt-1 cursor-pointer"
            onClick={() => onOpenOriginal?.(quoteOf._id)}
          >
            <QuotedPostPreview post={quoteOf} />
          </div>
        )}

        {/* Actions — same like/comment-count/save bar as PostCard,
            driven by the same state via props so liking here and
            liking on the card stay in sync (no second like/bookmark
            state or API call duplicated in this component). */}
        {onReact && (
          <div className="px-5 pt-3">
            <ReactionSummaryBar
              summary={reactionSummary}
              myReaction={myReaction}
              onToggle={handleReactSelect}
            />
          </div>
        )}
        <div className="flex items-center gap-5 px-5 py-4 border-t border-stroke">
          <div className="relative">
            <button
              onClick={onReact ? handleLikeClick : onLike}
              onTouchStart={onReact ? handleLikeTouchStart : undefined}
              onTouchEnd={onReact ? handleLikeTouchEnd : undefined}
              onTouchCancel={onReact ? handleLikeTouchEnd : undefined}
              onMouseEnter={onReact ? handleLikeMouseEnter : undefined}
              onMouseLeave={onReact ? handleLikeMouseLeave : undefined}
              disabled={isLiking}
              className={`flex items-center gap-1.5 text-base transition ${
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
            {onReact && (
              <ReactionPicker
                open={reactionPickerOpen}
                onSelect={handleReactSelect}
                onClose={() => setReactionPickerOpen(false)}
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-base text-ink-muted">
            <FaRegComment size={15} />
            <span>{commentCount}</span>
          </div>

          {onRepost && (
            <button
              onClick={onRepost}
              disabled={isReposting}
              title={reposted ? "Undo repost" : "Repost"}
              className={`flex items-center gap-1.5 text-base transition ${
                isReposting
                  ? "opacity-50 cursor-not-allowed"
                  : reposted
                    ? "text-green-600"
                    : "text-ink-muted hover:text-green-600"
              }`}
            >
              <FaRetweet size={15} />
              <span>{repostCount}</span>
            </button>
          )}

          <button
            onClick={onBookmark}
            disabled={isBookmarking}
            title={bookmarked ? "Remove from saved" : "Save post"}
            className={`ml-auto flex items-center text-base transition ${
              isBookmarking
                ? "opacity-50 cursor-not-allowed"
                : bookmarked
                  ? "text-primary-600"
                  : "text-ink-muted hover:text-primary-600"
            }`}
          >
            {bookmarked ? (
              <FaBookmark size={15} />
            ) : (
              <FaRegBookmark size={15} />
            )}
          </button>
        </div>

        {/* Comments */}
        <div className="px-5 pb-5">
          <CommentsPanel
            postId={postId}
            initialCommentCount={commentCount}
            onCommentCountChange={onCommentCountChange}
            highlightCommentId={highlightCommentId}
            highlightParentId={highlightParentId}
          />
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;
