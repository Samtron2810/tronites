import { useEffect, useRef, useState } from "react";
import { FiVolume2, FiVolumeX } from "react-icons/fi";

// A single chat-video bubble: native controls plus a mute/unmute overlay,
// and auto-pause when scrolled out of view — mirrors PostCard's observer so
// an off-screen playing video doesn't keep blaring audio while the user
// scrolls the thread. Pause-only: nothing ever auto-plays.
const ChatVideoMessage = ({ url, poster, alignmentClass = "" }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  // Auto-pause when scrolled out of view — same contract as post videos:
  // pauses once less than a quarter of the video is visible; never plays.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !url) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !videoEl.paused) {
            videoEl.pause();
          }
        }
      },
      // Pauses once less than a quarter of the video is visible.
      { threshold: 0.25 },
    );
    observer.observe(videoEl);
    return () => observer.disconnect();
  }, [url]);

  // Mute/unmute toggle for the overlay button. Drives the element's muted
  // property imperatively and mirrors it into state for the icon.
  const handleToggleMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    setIsMuted(videoEl.muted);
  };

  if (!url) return null;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-black ${alignmentClass}`}
    >
      <video
        ref={videoRef}
        src={`${url}#t=0.1`}
        poster={poster || undefined}
        preload="metadata"
        controls
        playsInline
        className="w-full max-h-64 object-contain"
      />
      {/* Sits top-right, clear of the bottom native-controls bar. */}
      <button
        type="button"
        onClick={handleToggleMute}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
        title={isMuted ? "Unmute" : "Mute"}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
      >
        {isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
      </button>
    </div>
  );
};

export default ChatVideoMessage;