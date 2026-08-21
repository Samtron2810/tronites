// Wraps window.cloudinary (loaded via the script tag in index.html) into a
// promise-based helper. The widget owns its own picker UI (drag-drop,
// camera, progress bar) — it can't accept a File already selected
// elsewhere, so this fully replaces the old signed-fetch-upload flow for
// video. Images still use the manual signed-fetch flow in cloudinary.js.

import api from "./api.js";

const MAX_VIDEO_DURATION_SECONDS = 30;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

// `signatureConfig` is the response from POST /posts/signature/video
// (postId, folder, eager, notificationUrl, context, apiKey, cloudName) —
// everything except the per-attempt signature itself, which the widget
// requests via `uploadSignature` below on each upload attempt.
export const openVideoUploadWidget = ({ signatureConfig, onSuccess, onError, onClose }) => {
  if (!window.cloudinary) {
    onError(new Error("Upload widget failed to load — check your connection and try again."));
    return null;
  }

  const { apiKey, cloudName, folder, eager, notificationUrl, context } = signatureConfig;

  const widget = window.cloudinary.createUploadWidget(
    {
      cloudName,
      apiKey,
      uploadSignature: (callback, paramsToSign) => {
        // The widget calls this per upload attempt with the exact params
        // it's about to send (it merges in timestamp/source itself) — we
        // just forward them to the backend to sign, no manual param
        // rebuilding here (that mismatch was the root cause of the
        // original "Invalid Signature" bug).
        api
          .post("/posts/signature/video/sign", { paramsToSign })
          .then((res) => callback(res.data.signature))
          .catch(() => onError(new Error("Failed to sign upload — please try again.")));
      },
      folder,
      resourceType: "video",
      eager: [eager], // widget expects eager as an array of transformation strings
      eagerAsync: true,
      notificationUrl,
      context,
      sources: ["local", "camera"],
      multiple: false,
      maxFileSize: MAX_VIDEO_SIZE_BYTES,
      clientAllowedFormats: ["mp4", "mov", "webm", "avi", "mkv"],
      showAdvancedOptions: false,
      showSkipCropButton: false,
      styles: {
        palette: {
          window: "#FFFFFF",
          windowBorder: "#E2E8F0",
          tabIcon: "#0F766E", // primary-600
          menuIcons: "#64748B",
          textDark: "#0F172A",
          textLight: "#FFFFFF",
          link: "#0F766E",
          action: "#0F766E",
          inactiveTabIcon: "#94A3B8",
          error: "#EF4444",
          inProgress: "#0F766E",
          complete: "#10B981",
          sourceBg: "#F8FAFC",
        },
        fonts: {
          default: null,
          "'DM Sans', sans-serif": {
            url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
            active: true,
          },
        },
      },
    },
    (error, result) => {
      if (error) {
        // "Abort"/user-closed-the-widget isn't a real error — don't
        // surface a toast for it.
        if (result?.event === "close" || error?.status === "Aborted") {
          onClose?.();
          return;
        }
        onError(new Error(error.message || "Video upload failed"));
        return;
      }

      if (result.event === "close") {
        onClose?.();
        return;
      }

      if (result.event === "success") {
        const { info } = result;
        if (info.duration && info.duration > MAX_VIDEO_DURATION_SECONDS) {
          // Server-side eager transformation already trims to 30s
          // regardless — this is informational only, matching the old
          // client-side probe's toast.
        }
        onSuccess(info);
      }
    },
  );

  widget.open();
  return widget;
};
