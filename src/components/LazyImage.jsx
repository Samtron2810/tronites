import { useState, useRef, useEffect } from "react";
import { FiImage } from "react-icons/fi";

// Real lazy loading via IntersectionObserver, NOT the native
// loading="lazy" attribute. That was tried before and reverted -- the
// browser's own lazy-load heuristic deferred the fetch for images it
// judged "not yet in viewport" and never fired onLoad for them, leaving
// posts stuck on the spinner even though the image URL itself was fine.
//
// This sidesteps that failure mode entirely: the <img>'s src is left
// unset (so nothing is fetched) until this component's own
// IntersectionObserver confirms the element is actually in or near the
// viewport, then src is set directly by this code -- not deferred to the
// browser's judgment -- so onLoad is guaranteed to fire once the network
// request completes. Same IntersectionObserver pattern PostCard already
// uses for video auto-pause.
//
// `priority` skips the observer entirely and loads immediately -- for the
// first post's image in a feed, which is already in the viewport on
// page load, so deferring it would only add a needless round trip
// before the fetch even starts.
const LazyImage = ({
  src,
  alt,
  className = "",
  aspectRatio,
  style,
  priority = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const containerRef = useRef(null);

  // Remembers the last src this instance rendered, so that when the same
  // component is reused with a new src (e.g. the PostCard carousel slides
  // between images) we reset loading/error/visibility during render -- the
  // React-blessed "adjust state when props change" pattern instead of a
  // setState-in-effect cascade.
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
      className={`relative w-full h-full overflow-hidden bg-surface`}
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
              className={`relative w-full ${className}`}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LazyImage;
