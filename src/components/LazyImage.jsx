import { useState } from "react";
import { FiImage } from "react-icons/fi";

const LazyImage = ({
  src,
  alt,
  className = "",
  aspectRatio,
  style,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  // Remembers the last src this instance rendered, so that when the same
  // component is reused with a new src (e.g. the PostCard carousel slides
  // between images) we reset loading/error during render — the React-blessed
  // "adjust state when props change" pattern instead of a setState-in-effect
  // cascade.
  const [lastSrc, setLastSrc] = useState(src);
  if (lastSrc !== src) {
    setLastSrc(src);
    setLoaded(false);
    setError(false);
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-surface"
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {error ? (
        // Failed to load — show a visible broken-image indicator. The real
        // <img> below is always painted (never opacity-0), so a hard 404/
        // quota failure reliably surfaces here rather than as a blank box.
        <div className="absolute inset-0 flex items-center justify-center text-ink-muted">
          <FiImage size={28} aria-hidden="true" />
          <span className="sr-only">Image failed to load</span>
        </div>
      ) : (
        <>
          {/* Loading state — a neutral loader behind the image until the
              real pixels paint, so a still-loading image reads as
              "loading" rather than a stuck blur or a flat gray slab. */}
          {!loaded && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <div className="h-7 w-7 border-2 border-ink-muted border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            // Always loaded eagerly. The videos in this app stream the same
            // way and load reliably; native `loading="lazy"` proved flaky here
            // (browser deferred the fetch for images it deemed not-yet-in
            // viewport, so onLoad never fired and posts stuck on the loader),
            // even though the URLs themselves verify fine in a new tab.
            loading="eager"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={style}
            className={`relative w-full ${className}`}
          />
        </>
      )}
    </div>
  );
};

export default LazyImage;
