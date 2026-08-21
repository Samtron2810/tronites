// Custom video uploader — replaces the Cloudinary Upload Widget (see
// cloudinaryWidget.js, now removed). The browser uploads the file
// directly to Cloudinary using a signature from POST /posts/signature/video,
// then the caller creates the post via POST /posts/video with the finished
// asset. Because the backend signs a *synchronous* eager transformation,
// Cloudinary's upload response already contains the trimmed/transformed
// MP4 — no webhook, no "processing" post state, no orphan shells.
//
// XHR (not fetch) is used deliberately: only XHR exposes upload progress
// events, which drive the custom progress bar in CreatePostModal.

import api from "./api";

export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_DURATION_SECONDS = 30;
const ALLOWED_FORMATS = ["mp4", "mov", "webm", "avi", "mkv"];

// Returns an error message string if the file is unacceptable, or null if
// it passes. Cheap synchronous checks only (format + size) — duration
// needs a metadata probe, see probeVideoDuration below.
export const validateVideoFile = (file) => {
  if (!file) return "No file selected";

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.type || "";
  const formatOk =
    ALLOWED_FORMATS.includes(extension) ||
    ALLOWED_FORMATS.some((fmt) => mimeType.includes(fmt));
  if (!formatOk) {
    return "Unsupported video format — use MP4, MOV, WebM, AVI, or MKV";
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return "Video is too large — the maximum size is 100MB";
  }

  return null;
};

// Reads the video's duration from its metadata without uploading anything.
// Resolves with the duration in seconds; rejects if the file can't be
// decoded as video at all.
export const probeVideoDuration = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Couldn't read the video's duration"));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("This file doesn't appear to be a valid video"));
    };

    video.src = objectUrl;
  });

// Uploads the file to Cloudinary and resolves with the finished asset:
// { publicId, url, durationSeconds }. `url` is the eager-transformed MP4
// (trimmed to 30s, h264/mp4, auto quality) — ready to serve as-is.
//
// onProgress, if provided, is called with a 0–100 integer as bytes are
// sent. Note the request doesn't resolve until Cloudinary has ALSO
// finished the synchronous eager transformation, so 100% means "bytes
// sent" — the caller shows its own "processing" state for the final
// transformation stretch.
export const uploadVideoToCloudinary = async ({ file, onProgress }) => {
  // 1. Get the signed upload params from our backend.
  const { data: config } = await api.post("/posts/signature/video");
  const { signature, timestamp, apiKey, cloudName, folder, eager } = config;

  // 2. Upload directly to Cloudinary. The FormData keys must exactly
  // match the signed params (timestamp, folder, eager) — any extra
  // signed-relevant param would fail Cloudinary's signature check.
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("eager", eager);
  formData.append("signature", signature);

  const response = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Unexpected response from Cloudinary"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        // Cloudinary error bodies carry a human-readable `error.message`.
        reject(
          new Error(body?.error?.message || "Video upload failed — try again"),
        );
      }
    };
    xhr.onerror = () =>
      reject(new Error("Network error during upload — check your connection"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    xhr.send(formData);
  });

  // 3. Extract the transformed asset. With synchronous eager the response
  // contains an `eager` array whose [0] is the trimmed MP4; fall back to
  // the raw secure_url if eager is somehow missing (still playable, just
  // untrimmed).
  const eagerUrl = response.eager?.[0]?.secure_url;
  const url = eagerUrl || response.secure_url;

  if (!response.public_id || !url) {
    throw new Error("Upload succeeded but the response was incomplete");
  }

  return {
    publicId: response.public_id,
    url,
    durationSeconds: response.duration ?? null,
  };
};
