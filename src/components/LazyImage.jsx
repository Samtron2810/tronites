import { useState, useEffect } from "react";
import { FiImage } from "react-icons/fi";

const LazyImage = ({
  src,
  alt,
  className = "",
  aspectRatio,
  eager = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // When the same component is reused with a new src (e.g. the PostCard
  // carousel slides between images), reset so each image gets its own
  // fade-in and a fresh loaded/error state instead of carrying over the
  // previous slide's.
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

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
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`relative w-full transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            } ${className}`}
          />
        </>
      )}
    </div>
  );
};

export default LazyImage;
