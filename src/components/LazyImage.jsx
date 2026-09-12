import { useState, useRef, useEffect } from "react";
import { FiImage } from "react-icons/fi";

// Real lazy loading via IntersectionObserver, NOT the native
// loading="lazy" attribute. That was tried before and reverted — the
// browser's own lazy-load heuristic deferred the fetch for images it
// judged "not yet in viewport" and never fired onLoad for them, leaving
// posts stuck on the spinner even though the image URL itself was fine.
//
// `priority` skips the observer entirely and loads immediately.
// `fill` switches the img to absolute inset-0 mode for fixed-height
// grid cells (multi-image layout). Without fill the img uses natural
// flow (w-full) so single images expand the container correctly.
const LazyImage = ({
  src,
  alt,
  className = "",
  aspectRatio,
  style,
  priority = false,
  fill = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const containerRef = useRef(null);

  // Reset state when src changes (carousel slide change, etc.)
  const [lastSrc, setLastSrc] = useState(src);
  if (lastSrc !== src) {
    setLastSrc(src);
    setLoaded(false);
    setError(false);
    if (priority) setIsVisible(true);
  }

  useEffect(() => {
    if (priority || isVisible) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [priority, isVisible]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-surface"
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-ink-muted">
          <FiImage size={28} aria-hidden="true" />
          <span className="sr-only">Image failed to load</span>
        </div>
      ) : (
        <>
          {!loaded && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div className="h-7 w-7 border-2 border-ink-muted border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {isVisible && (
            <img
              src={src}
              alt={alt}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              style={style}
              className={
                fill
                  ? // Fixed-height grid cell: fill the cell completely
                    `absolute inset-0 w-full h-full ${className}`
                  : // Natural flow (single image, detail modal, etc.):
                    // w-full expands the container to the image's natural
                    // aspect ratio — object-contain/cover comes from className
                    `relative w-full ${className}`
              }
            />
          )}
        </>
      )}
    </div>
  );
};

export default LazyImage;
