import { useState, useEffect } from "react";
import { FiImage } from "react-icons/fi";

const toBlurPlaceholder = (url) => {
  if (typeof url !== "string" || !url.includes("/upload/")) return null;
  return url.replace("/upload/", "/upload/e_blur:1000,q_1,w_36/");
};

const LazyImage = ({
  src,
  alt,
  className = "",
  aspectRatio,
  eager = false,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const placeholder = toBlurPlaceholder(src);

  // When the same component is reused with a new src (e.g. the PostCard
  // carousel slides between images), reset so each image gets its own
  // blur-up fade and a fresh loaded/error state instead of carrying over
  // the previous slide's.
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
        // Failed to load — show a visible broken-image indicator instead
        // of a permanently invisible <img> (which would otherwise never
        // fire onLoad and stay opacity-0 forever).
        <div className="absolute inset-0 flex items-center justify-center text-ink-muted">
          <FiImage size={28} aria-hidden="true" />
          <span className="sr-only">Image failed to load</span>
        </div>
      ) : (
        <>
          {placeholder && !loaded && (
            <img
              src={placeholder}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full ${className}`}
              // Placeholder is decorative/interim only — never itself lazy,
              // it needs to appear the instant the container mounts.
            />
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
