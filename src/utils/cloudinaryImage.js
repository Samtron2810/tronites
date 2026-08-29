// Inserts Cloudinary delivery transformations into an already-uploaded
// image URL -- no re-upload needed, since Cloudinary resizes/recompresses
// on the fly the first time a given transformation is requested, then
// caches that variant at their CDN edge for subsequent requests.
//
// Post images are uploaded capped at 1600px (see the upload signature in
// postController.createImageUploadSignature) but a feed card renders one
// at maybe 400-600px wide -- shipping the full 1600px asset into every
// card is wasted bandwidth. This lets each call site ask for the size it
// actually needs.
//
// Cloudinary URL shape: https://res.cloudinary.com/<cloud>/image/upload/
//   [transformations/] v<version>/<folder>/<public_id>.<ext>
// Transformations are just another path segment inserted right after
// "/upload/" -- this only works for URLs already in that shape (i.e.
// genuine Cloudinary delivery URLs), which is all this app ever stores
// for post images/avatars (validated server-side on upload).
const UPLOAD_MARKER = "/upload/";

// width: target display width in CSS px. The function requests 2x that
// (capped at 1600, since that's the ceiling already baked in at upload
// time) so the image still looks sharp on retina/high-DPI screens
// without over-fetching for a 1x display.
export const resizedImageUrl = (url, width) => {
  if (!url || typeof url !== "string") return url;
  const markerIndex = url.indexOf(UPLOAD_MARKER);
  if (markerIndex === -1) return url; // not a Cloudinary delivery URL -- pass through unchanged

  const targetWidth = Math.min(Math.round(width * 2), 1600);
  const transformation = `w_${targetWidth},c_limit,q_auto,f_auto`;

  const insertAt = markerIndex + UPLOAD_MARKER.length;
  return url.slice(0, insertAt) + transformation + "/" + url.slice(insertAt);
};

// Common sizes used across the app, named by where they're used rather
// than by pixel value -- keeps call sites readable and makes it obvious
// what to change if a layout's actual rendered size changes later.
export const IMAGE_SIZES = {
  avatarTiny: 24, // mention-suggestion rows, nav-bar avatar
  avatarSmall: 40, // post/comment header avatars
  avatarLarge: 96, // profile page header
  // ChatModal media bubbles (video-message stills + image grid cells).
  // Cells render at ~72-180px wide, so this fetches a small variant
  // (the function asks for 2x for retina) instead of the full upload.
  chatThumbnail: 160,
  feedImage: 600, // post carousel image inside a feed card
  modalImage: 900, // PostDetailModal's larger carousel view
};
