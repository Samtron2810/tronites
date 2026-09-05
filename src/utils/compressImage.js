/**
 * Compresses an image file to reduce upload size.
 * Resizes to max `maxWidth` and re-encodes at `quality`.
 * Returns a compressed File object.
 *
 * Preserves transparency: PNG/WebP inputs stay PNG/WebP so alpha
 * channels survive; only formats without alpha (e.g. JPEG) are
 * re-encoded as JPEG. Forcing everything to JPEG previously flattened
 * transparent PNGs onto a black background.
 *
 * Formats the browser canvas pipeline can't decode (HEIC/HEIF from
 * iPhone, files with an empty or unrecognised MIME type) are passed
 * through unchanged. FileReader / Image / canvas all fail on these
 * silently or via onerror — Cloudinary handles them server-side fine.
 */
const TRANSPARENT_FORMATS = new Set(["image/png", "image/webp"]);

// Types the FileReader → canvas pipeline can reliably decode in every
// browser. Anything outside this set is passed through as-is.
const CANVAS_DECODABLE = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
]);

const compressImage = (
  file,
  { maxWidth = 1920, quality = 0.7, skipBelowBytes = 500 * 1024 } = {},
) => {
  return new Promise((resolve, reject) => {
    // Pass through formats the canvas pipeline can't decode (e.g. HEIC/HEIF
    // from iPhone cameras, files with an empty or unknown MIME type).
    // Cloudinary accepts these natively — no need to transcode client-side.
    if (!file.type || !CANVAS_DECODABLE.has(file.type)) {
      resolve(file);
      return;
    }

    // If file is small enough, skip compression
    if (file.size < skipBelowBytes) {
      resolve(file);
      return;
    }

    const outputType = TRANSPARENT_FORMATS.has(file.type)
      ? file.type
      : "image/jpeg";
    const outputExt =
      outputType === "image/png"
        ? "png"
        : outputType === "image/webp"
          ? "webp"
          : "jpg";

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Resize if too large
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height / width) * maxWidth);
            width = maxWidth;
          } else {
            width = Math.round((width / height) * maxWidth);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob failed"));
              return;
            }
            const baseName = file.name.replace(/\.[^.]+$/, "");
            const compressedFile = new File(
              [blob],
              `${baseName}.${outputExt}`,
              {
                type: outputType,
                lastModified: Date.now(),
              },
            );
            resolve(compressedFile);
          },
          outputType,
          quality,
        );
      };
      img.onerror = () => reject(new Error("Image loading failed"));
    };
    reader.onerror = () => reject(new Error("FileReader failed"));
  });
};

export default compressImage;
