import { useEffect, useRef, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaVolumeUp,
  FaVolumeMute,
  FaTimes,
} from "react-icons/fa";
import useBackButtonClose from "../hooks/useBackButtonClose";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

// Full-screen viewer for chat media, opened by tapping an image or a video
// thumbnail inside ChatModal. Mirrors PostDetailModal's width behavior —
// full-bleed card on small screens, centered sm:max-w-3xl on larger ones —
// but its height is strictly the full viewport at every breakpoint: this is
// a viewer, not a scrollable document.
//
// Video mode plays with native controls plus a mute/unmute overlay — the
// exact affordances the inline chat bubble deliberately lacks (there a
// video is only a static thumbnail). Image mode is a carousel with
// arrows/dots/counter/swipe/keyboard nav whenever there is more than one
// image; a single image renders bare, with no controls.
//
// Mounted conditionally by ChatModal (only while open), so playback stops
// and per-open state (slide index, mute) resets simply by unmounting —
// no reset-on-reopen sync needed.
const ChatMediaViewer = ({
  type, // "video" | "image"
  video, // message.video — { url, thumbnailUrl, durationSeconds } (video mode)
  images = [], // image URLs, in message order (image mode)
  initialIndex = 0,
  onClose,
}) => {
  const [activeSlide, setActiveSlide] = useState(initialIndex);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRef = useRef(null);
  const touchStartX = useRef(null);

  // Mobile back button closes the viewer; UI closes consume the pushed
  // history entry so history stays balanced (see the hook).
  useBackButtonClose(true, onClose);

  // Escape closes; arrow keys flip the carousel — same contract as
  // PostDetailModal.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) {
        setActiveSlide((i) => (i - 1 + images.length) % images.length);
      }
      if (e.key === "ArrowRight" && images.length > 1) {
        setActiveSlide((i) => (i + 1) % images.length);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // 50px horizontal threshold, carried over from PostDetailModal's swipe.
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || images.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) {
        setActiveSlide((i) => (i - 1 + images.length) % images.length);
      } else {
        setActiveSlide((i) => (i + 1) % images.length);
      }
    }
    touchStartX.current = null;
  };

  // Mute/unmute toggle — drives the element imperatively and mirrors it
  // into state for the icon, same as PostDetailModal's video.
  const handleToggleVideoMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    setIsVideoMuted(videoEl.muted);
  };

  const isVideo = type === "video" && !!video?.url;
  const isImage = type === "image" && images.length > 0;
  if (!isVideo && !isImage) return null;

  return (
    <div
      className="fixed inset-0 z-60 bg-black/80 flex justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-3xl sm:rounded-2xl h-dvh flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke sm:rounded-t-2xl">
          <p className="text-base font-semibold text-ink">
            {isVideo ? "Video" : images.length > 1 ? "Photos" : "Photo"}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-muted hover:text-ink transition p-1.5 rounded-lg hover:bg-surface"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Media — fills everything under the header; contained on black
            so portrait/landscape media both center cleanly. */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
          {isVideo ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* #t=0.1 like every other player here — forces a frame to
                  paint before playback instead of a black box. */}
              <video
                ref={videoRef}
                src={`${video.url}#t=0.1`}
                poster={video.thumbnailUrl || undefined}
                controls
                autoPlay
                playsInline
                disablePictureInPicture
                controlsList="nodownload nofullscreen noplaybackrate"
                onContextMenu={(e) => e.preventDefault()}
                className="w-full h-full object-contain"
              />
              {/* Sits top-right, clear of the bottom native-controls bar. */}
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
          ) : (
            <div
              className="relative w-full h-full flex items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Plain <img>, not LazyImage: LazyImage fills its container
                  (w-full + h-full wrapper) which fights the centered
                  object-contain fit a lightbox needs, and the image is
                  mounted on a click so there is nothing to lazy-load. */}
              <img
                src={resizedImageUrl(
                  images[activeSlide],
                  IMAGE_SIZES.modalImage,
                )}
                alt={`photo ${activeSlide + 1}`}
                draggable={false}
                className="max-w-full max-h-full object-contain"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSlide(
                        (i) => (i - 1 + images.length) % images.length,
                      );
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition"
                    aria-label="Previous photo"
                  >
                    <FaChevronLeft size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSlide((i) => (i + 1) % images.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition"
                    aria-label="Next photo"
                  >
                    <FaChevronRight size={14} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSlide(i);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          i === activeSlide
                            ? "w-4 bg-white"
                            : "w-1.5 bg-white/50"
                        }`}
                        aria-label={`Go to photo ${i + 1}`}
                      />
                    ))}
                  </div>
                  <span className="absolute top-2 right-2 bg-black/50 text-white text-sm px-2 py-0.5 rounded-full">
                    {activeSlide + 1}/{images.length}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMediaViewer;
