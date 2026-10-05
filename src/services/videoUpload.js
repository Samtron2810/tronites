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
import { retryWithBackoff, isTransientError } from "../utils/retry";

export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
export const MAX_VIDEO_DURATION_SECONDS = 30;
const ALLOWED_FORMATS = ["mp4", "mov", "webm", "avi", "mkv"];

// Returns an error message string if the file is unacceptable, or null if
// it passes. Format + size only — no local decode/duration probe.
// Browsers can't reliably decode every codec these containers can hold
// (HEVC MOV, AVI/MKV with non-web codecs), which made client-side
// probing reject valid files inconsistently. Cloudinary decodes and
// transcodes server-side regardless of source codec, so we upload
// first and let its eager transform (f_mp4,vc_h264) be the real
// gatekeeper — trimming to 30s and normalizing format in the same step.
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

// Chunked + resumable upload core shared by the post and chat flows.
// The file is sent in 6MB chunks (Cloudinary's X-Unique-Upload-Id /
// Content-Range protocol), so a dropped connection only re-sends the
// current chunk instead of the whole video. Every network step retries
// with backoff and pauses while the device is offline.
//
// onProgress(0-100) fires as bytes are confirmed; onStatus(msg|null) reports
// "retrying…" / "waiting for connection…" so the caller can keep its toast
// honest. The final chunk's response carries the synchronous eager result.
const CHUNK_SIZE = 6 * 1024 * 1024; // Cloudinary minimum chunk is 5MB
const CHUNK_TIMEOUT_MS = 5 * 60 * 1000; // last chunk also runs the eager transform
const RETRY_BUDGET_MS = 40 * 60 * 1000; // signature stays valid ~1h

const sendChunk = ({ url, formData, uploadId, start, end, total, onBytes }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = CHUNK_TIMEOUT_MS;
    if (total !== null) {
      xhr.setRequestHeader("X-Unique-Upload-Id", uploadId);
      xhr.setRequestHeader("Content-Range", `bytes ${start}-${end - 1}/${total}`);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBytes(e.loaded);
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) return resolve(body);
      const err = new Error(
        body?.error?.message || "Video upload failed — try again",
      );
      err.status = xhr.status;
      reject(err);
    };
    xhr.onerror = () =>
      reject(new Error("Network error during upload — check your connection"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(formData);
  });

const uploadVideoCore = async ({ file, signaturePath, onProgress, onStatus }) => {
  const retryOpts = {
    maxElapsedMs: RETRY_BUDGET_MS,
    shouldRetry: isTransientError,
    onRetry: () => onStatus?.("Connection issue — retrying…"),
    onWaitingForNetwork: () => onStatus?.("Waiting for connection…"),
  };

  // 1. Signed params from our backend (Render can cold-start, so a generous timeout).
  const { data: config } = await retryWithBackoff(
    () => api.post(signaturePath, undefined, { timeout: 60000 }),
    retryOpts,
  );
  const { signature, timestamp, apiKey, cloudName, folder, eager } = config;
  onStatus?.(null);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
  const buildForm = (blob) => {
    // Keys must exactly match the signed params (timestamp, folder, eager).
    const fd = new FormData();
    fd.append("file", blob, file.name);
    fd.append("api_key", apiKey);
    fd.append("timestamp", timestamp);
    fd.append("folder", folder);
    fd.append("eager", eager);
    fd.append("signature", signature);
    return fd;
  };

  const total = file.size;
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const chunked = total > CHUNK_SIZE;
  let response = null;
  let confirmed = 0;

  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total);
    const blob = chunked ? file.slice(start, end) : file;
    response = await retryWithBackoff(
      () =>
        sendChunk({
          url,
          formData: buildForm(blob),
          uploadId,
          start,
          end,
          total: chunked ? total : null,
          onBytes: (loaded) =>
            onProgress?.(
              Math.min(100, Math.round(((confirmed + loaded) / total) * 100)),
            ),
        }),
      retryOpts,
    );
    confirmed = end;
    onStatus?.(null);
  }

  // 3. Extract the transformed asset (eager[0] = trimmed MP4; fall back to raw).
  const eagerUrl = response?.eager?.[0]?.secure_url;
  const assetUrl = eagerUrl || response?.secure_url;
  if (!response?.public_id || !assetUrl) {
    throw new Error("Upload succeeded but the response was incomplete");
  }
  return {
    publicId: response.public_id,
    url: assetUrl,
    durationSeconds: response.duration ?? null,
  };
};

// Post videos → { publicId, url, durationSeconds }
export const uploadVideoToCloudinary = ({ file, onProgress, onStatus }) =>
  uploadVideoCore({ file, signaturePath: "/posts/signature/video", onProgress, onStatus });

// Chat videos — same flow, dedicated signed folder.
export const uploadVideoMessageToCloudinary = ({ file, onProgress, onStatus }) =>
  uploadVideoCore({ file, signaturePath: "/messages/signature/video", onProgress, onStatus });
