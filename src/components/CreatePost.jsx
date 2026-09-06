import { useState } from "react";
import toast from "react-hot-toast";
import CreatePostModal from "./CreatePostModal";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import api from "../services/api";
import compressImage from "../utils/compressImage";
import { uploadToCloudinary } from "../services/cloudinary";
import { uploadVideoToCloudinary, MAX_VIDEO_DURATION_SECONDS } from "../services/videoUpload";

const CreatePost = ({ fetchPosts }) => {
  const [openModal, setOpenModal] = useState(false);
  const { user } = useAuth();

  // Background post submission for text/image posts — the modal closes
  // immediately and this runs the actual upload in the background so the
  // user isn't left staring at a loading spinner. Toasts surface
  // progress/completion.
  const handleSubmit = async ({ text, images, privacy }) => {
    const toastId = toast.loading("Posting…");
    try {
      if (images.length) {
        // Images: get a signed upload request, upload each image directly
        // to Cloudinary, then create the post with the returned URLs.
        const sigRes = await api.post("/posts/signature/image");
        const signatureData = sigRes.data;
        const compressed = await Promise.all(images.map(compressImage));
        const uploaded = await Promise.all(
          compressed.map((file) => uploadToCloudinary({ file, signatureData })),
        );
        const imagePayload = uploaded.map((r) => ({
          url: r.secure_url,
          publicId: r.public_id,
        }));
        await api.post("/posts", { text, images: imagePayload, privacy });
        toast.success("Post created!", { id: toastId });
      } else {
        // Text-only post.
        await api.post("/posts", { text, privacy });
        toast.success("Post created!", { id: toastId });
      }

      api.invalidate("/posts/search");
      fetchPosts();
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
  // transform (server-side trim to 30s) happen here with toast progress,
  // so the user is free to browse/post again while it finishes.
  const handleSubmitVideo = async ({ text, videoFile, privacy }) => {
    const toastId = toast.loading("Uploading video… 0%");
    try {
      const video = await uploadVideoToCloudinary({
        file: videoFile,
        onProgress: (pct) => {
          toast.loading(
            pct >= 100 ? "Processing video…" : `Uploading video… ${pct}%`,
            { id: toastId },
          );
        },
      });

      await api.post("/posts/video", { text, video, privacy });

      // durationSeconds is the SOURCE video's duration (Cloudinary's
      // top-level `duration` field, read before the eager transform)
      // — not the trimmed clip's. Comparing it against the cap is how
      // we know, after the fact, whether the eager transform actually
      // cut anything.
      if (video.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
        toast.success(
          `Video posted — trimmed to the first ${MAX_VIDEO_DURATION_SECONDS}s`,
          { id: toastId, icon: "✂️", duration: 4000 },
        );
      } else {
        toast.success("Video posted!", { id: toastId });
      }
      api.invalidate("/posts/search");
      fetchPosts();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Couldn't post your video",
        { id: toastId },
      );
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
