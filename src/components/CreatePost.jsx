import { useState } from "react";
import toast from "react-hot-toast";
import CreatePostModal from "./CreatePostModal";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import api from "../services/api";
import compressImage from "../utils/compressImage";
import { uploadToCloudinary } from "../services/cloudinary";
import { uploadVideoToCloudinary, MAX_VIDEO_DURATION_SECONDS, formatVideoLimit } from "../services/videoUpload";
import { retryWithBackoff } from "../utils/retry";

const CreatePost = ({ fetchPosts }) => {
  const [openModal, setOpenModal] = useState(false);
  const { user } = useAuth();

  // Background post submission for text/image posts — the modal closes
  // immediately and this runs the actual upload in the background so the
  // user isn't left staring at a loading spinner. Toasts surface
  // progress/completion.
  //
  // scheduledFor is passed directly in the POST /posts body so the backend
  // creates the post in a hidden state from the start — no two-step approach.
  const handleSubmit = async ({ text, images, altTexts = [], privacy, scheduledFor, commentsDisabled = false }) => {
    const isScheduled = !!scheduledFor;
    const toastId = toast.loading(isScheduled ? "Scheduling…" : "Posting…");
    try {
      // datetime-local yields "2026-09-10T14:30" (no timezone offset) —
      // convert to full ISO 8601 so the backend gets a correct UTC instant.
      const scheduledForISO = isScheduled
        ? new Date(scheduledFor).toISOString()
        : undefined;

      if (images.length) {
        const sigRes = await api.post("/posts/signature/image");
        const signatureData = sigRes.data;
        const compressed = await Promise.all(images.map(compressImage));
        const uploaded = await Promise.all(
          compressed.map((file) => uploadToCloudinary({ file, signatureData })),
        );
        const imagePayload = uploaded.map((r, i) => ({
          url: r.secure_url,
          publicId: r.public_id,
          altText: (altTexts[i] || "").trim(),
        }));
        await api.post("/posts", {
          text,
          images: imagePayload,
          privacy,
          commentsDisabled,
          ...(scheduledForISO ? { scheduledFor: scheduledForISO } : {}),
        });
      } else {
        await api.post("/posts", {
          text,
          privacy,
          commentsDisabled,
          ...(scheduledForISO ? { scheduledFor: scheduledForISO } : {}),
        });
      }

      if (isScheduled) {
        toast.success("Post scheduled!", { id: toastId });
        // Don't call fetchPosts — the post is hidden from the feed until
        // the cron publishes it. The Scheduled Posts page will show it.
      } else {
        toast.success("Post created!", { id: toastId });
        api.invalidate("/posts/search");
        fetchPosts();
      }
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        toast.error(
          "Upload is taking longer than expected — check your feed in a moment.",
          { id: toastId },
        );
      } else if (error?.response?.data?.code === "UPLOAD_LOST") {
        toast.error("Image upload failed — please try again.", {
          id: toastId,
        });
      } else if (error?.response?.data?.code === "UPLOAD_FAILED") {
        toast.error(
          error.response.data.message ||
            "Image upload failed — please try again.",
          { id: toastId },
        );
      } else {
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Failed to create post",
          { id: toastId },
        );
      }
    }
  };

  // Background video post submission — mirrors handleSubmit above. The
  // modal has already closed by the time this runs; upload + eager
  // transform (server-side trim to the max duration) happen here with toast progress,
  // so the user is free to browse/post again while it finishes.
  const handleSubmitVideo = async ({ text, videoFile, privacy, scheduledFor, commentsDisabled = false }) => {
    const isScheduled = !!scheduledFor;
    const toastId = toast.loading("Uploading video… 0%");
    // Keep the tab from being closed silently mid-upload.
    const warnOnLeave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warnOnLeave);
    try {
      let pct = 0;
      let status = null;
      const render = () =>
        toast.loading(
          status || (pct >= 100 ? "Processing video…" : `Uploading video… ${pct}%`),
          { id: toastId },
        );
      const video = await uploadVideoToCloudinary({
        file: videoFile,
        onProgress: (p) => {
          pct = p;
          render();
        },
        onStatus: (msg) => {
          status = msg;
          render();
        },
      });

      const scheduledForISO = isScheduled
        ? new Date(scheduledFor).toISOString()
        : undefined;

      // Video is already on Cloudinary — never re-upload it for a failed
      // post-create call. The backend de-duplicates on video.publicId, so
      // retrying this request is safe even if an earlier attempt landed.
      status = "Finishing your post…";
      render();
      await retryWithBackoff(
        () =>
          api.post(
            "/posts/video",
            {
              text,
              video,
              privacy,
              commentsDisabled,
              ...(scheduledForISO ? { scheduledFor: scheduledForISO } : {}),
            },
            { timeout: 60000 },
          ),
        {
          maxElapsedMs: 40 * 60 * 1000,
          onRetry: () => {
            status = "Connection issue — retrying…";
            render();
          },
          onWaitingForNetwork: () => {
            status = "Waiting for connection…";
            render();
          },
        },
      );

      if (isScheduled) {
        toast.success("Video scheduled!", { id: toastId });
      } else if (video.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
        // durationSeconds is the SOURCE video's duration (Cloudinary's
        // top-level `duration` field, read before the eager transform)
        // — not the trimmed clip's. Comparing it against the cap is how
        // we know, after the fact, whether the eager transform actually
        // cut anything.
        toast.success(
          `Video posted — trimmed to the first ${formatVideoLimit()}`,
          { id: toastId, icon: "✂️", duration: 4000 },
        );
        api.invalidate("/posts/search");
        fetchPosts();
      } else {
        toast.success("Video posted!", { id: toastId });
        api.invalidate("/posts/search");
        fetchPosts();
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Couldn't post your video",
        { id: toastId },
      );
    } finally {
      window.removeEventListener("beforeunload", warnOnLeave);
    }
  };

  return (
    <>
      <div className="bg-card border border-stroke rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <img
            src={resizedImageUrl(user?.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
          />
          <button
            onClick={() => setOpenModal(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-xl border border-stroke text-ink-muted text-base bg-surface hover:border-primary-400 hover:bg-primary-50 transition cursor-text"
          >
            What's on your mind?
          </button>
        </div>
      </div>

      {openModal && (
        <CreatePostModal
          closeModal={() => setOpenModal(false)}
          onSubmit={handleSubmit}
          onSubmitVideo={handleSubmitVideo}
        />
      )}
    </>
  );
};

export default CreatePost;
