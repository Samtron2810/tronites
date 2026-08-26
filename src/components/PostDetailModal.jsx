import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
} from "react-icons/fa";
import defaultAvatar from "../assets/defaultAvatar";
import LazyImage from "./LazyImage";
import TextWithLinks from "./TextWithLinks";
import CommentsPanel from "./CommentBox";

// Stacked-only layout at every breakpoint (confirmed — no desktop
// side-by-side variant). Media on top, post text below it, comments
// panel underneath that, all in one scrollable column inside the modal.
//
// Promotes the carousel interaction that already lived inline in
// PostCard (arrows/dots/badge) into this dedicated view, and adds
// click-to-toggle-2x zoom + keyboard/swipe nav on top of it — the
// carousel JSX itself is carried over as-is, not reinvented.
const PostDetailModal = ({
  isOpen,
  onClose,
  userId,
  name,
  username,
  profilePic,
  time,
  postText,
  postHasBeenEdited,
  postEditedAt,
  media,
  postVideo,
  commentCount,
  onCommentCountChange,
  postId,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRef = useRef(null);
  const touchStartX = useRef(null);

  // Reset per-open state so a previously-zoomed/scrolled slide doesn't
  // carry over the next time this post's modal is reopened. Same
  // derive-during-render sync pattern PostCard uses for its `synced*`
  // fields, rather than a setState-in-effect.
  const [syncedIsOpen, setSyncedIsOpen] = useState(isOpen);
  if (isOpen !== syncedIsOpen) {
    setSyncedIsOpen(isOpen);
    if (isOpen) {
      setActiveSlide(0);
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
      className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-lg sm:rounded-2xl sm:my-8 min-h-screen sm:min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke sticky top-0 bg-card z-10 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <img
              src={profilePic || defaultAvatar}
              alt="user"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/profile/${userId}`}
                  className="text-sm font-semibold text-ink hover:text-primary-600 transition"
                >
                  {name}
                </Link>
                {username && (
                  <span className="text-xs text-ink-muted">@{username}</span>
                )}
              </div>
              <p className="text-xs text-ink-muted">{time}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-muted hover:text-ink transition p-1.5 rounded-lg hover:bg-surface"
          >
            <FaTimes size={16} />
          </button>
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
                src={media[activeSlide]}
                alt={`post-${activeSlide + 1}`}
                className="max-h-[70vh] w-full object-contain transition-transform duration-200"
                style={{
                  transform: isZoomed ? "scale(2)" : "scale(1)",
                  transformOrigin: zoomOrigin,
                }}
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
                <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeSlide + 1}/{media.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Text */}
        {postText && (
          <p className="text-ink-sub text-sm leading-relaxed px-5 py-4">
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

        {/* Comments */}
        <div className="px-5 pb-5">
          <CommentsPanel
            postId={postId}
            initialCommentCount={commentCount}
            onCommentCountChange={onCommentCountChange}
          />
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;
