import { useState, useRef } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import compressImage from "../utils/compressImage";
import { FiX, FiImage, FiVideo } from "react-icons/fi";
import useMentionAutocomplete from "../hooks/useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";

const MAX_IMAGES = 4;
const MAX_VIDEO_DURATION_SECONDS = 30;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

const CreatePostModal = ({ closeModal, fetchPosts }) => {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // objectURL[]
  const [video, setVideo] = useState(null); // File | null
  const [videoPreview, setVideoPreview] = useState(null); // objectURL | null
  const [videoDuration, setVideoDuration] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const mention = useMentionAutocomplete();

  const handleTextChange = (e) => {
    setText(e.target.value);
    mention.handleTextChange(e.target.value, e.target.selectionStart);
  };

  const handleSelectMention = (username) => {
    const { text: newText, cursorPos } = mention.applySuggestion(text, username);
    setText(newText);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleImages = (e) => {
    if (video) {
      toast.error("Remove the video first to add images");
      e.target.value = "";
      return;
    }
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} images`);
      e.target.value = "";
      return;
    }
    const accepted = files.slice(0, room);
    if (files.length > room) {
      toast.error(`Only ${room} more image${room === 1 ? "" : "s"} allowed`);
    }

    setImages((prev) => [...prev, ...accepted]);
    setPreviews((prev) => [
      ...prev,
      ...accepted.map((f) => URL.createObjectURL(f)),
    ]);
    e.target.value = "";
  };

  const removeImage = (index) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoSelect = (e) => {
    if (images.length > 0) {
      toast.error("Remove your images first to add a video");
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      toast.error("Video must be under 100MB");
      return;
    }

    const url = URL.createObjectURL(file);
    // Read actual duration client-side before uploading — catches an
    // obviously-too-long video immediately instead of making the person
    // wait through an upload only to find out the server trimmed it.
    // The server's eager transformation (see videoUploadWorker.js) is
    // still the authoritative 30s cap either way; this is just faster
    // feedback, not a substitute for it.
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(probe.src);
      setVideo(file);
      setVideoPreview(url);
      setVideoDuration(probe.duration);
      if (probe.duration > MAX_VIDEO_DURATION_SECONDS) {
        toast(
          `Video is ${Math.round(probe.duration)}s — it'll be trimmed to the first ${MAX_VIDEO_DURATION_SECONDS}s.`,
          { icon: "✂️" },
        );
      }
    };
    probe.onerror = () => {
      toast.error("Couldn't read that video file");
      URL.revokeObjectURL(url);
    };
    probe.src = url;
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
    setVideoDuration(null);
  };

  const handleSubmit = async () => {
    if (!text.trim() && images.length === 0 && !video) {
      return toast.error("Post cannot be empty");
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (text.trim()) formData.append("text", text);

      if (video) {
        formData.append("video", video);
        await api.post("/posts/video", formData);
        toast.success("Video uploading — it'll appear in your feed shortly.");
      } else {
        if (images.length) {
          const compressed = await Promise.all(images.map(compressImage));
          compressed.forEach((file) => formData.append("images", file));
        }
        await api.post("/posts", formData);
        toast.success("Post created!");
      }

      fetchPosts();
      closeModal();
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        toast.error("Upload is taking longer than expected — check your feed in a moment.");
      } else if (error?.response?.data?.code === "UPLOAD_LOST" || error?.response?.data?.code === "UPLOAD_FAILED") {
        toast.error(error.response.data.message || "Image upload failed — please try again.");
      } else if (error?.response?.data?.code === "VIDEO_QUEUE_UNAVAILABLE") {
        toast.error(error.response.data.message || "Video upload is temporarily unavailable.");
      } else {
        toast.error(error?.response?.data?.message || error.message || "Failed to create post");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const gridClass = previews.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
          <h2 className="text-base font-semibold text-ink">Create Post</h2>
          <button onClick={closeModal} className="text-ink-muted hover:text-ink transition p-1 rounded-lg hover:bg-surface">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={mention.closeSuggestions}
              maxLength={280}
              rows={4}
              placeholder="What's happening?"
              className="w-full border border-stroke rounded-xl p-4 text-sm text-ink placeholder:text-ink-muted outline-none resize-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
            />
            {mention.showSuggestions && (
              <MentionSuggestions
                suggestions={mention.suggestions}
                onSelect={handleSelectMention}
              />
            )}
          </div>
          <div className="flex justify-end">
            <span className={`text-xs ${text.length >= 260 ? "text-red-400" : "text-ink-muted"}`}>
              {text.length}/280
            </span>
          </div>

          {/* Image previews — carousel grid */}
          {previews.length > 0 && (
            <div className={`grid ${gridClass} gap-2`}>
              {previews.map((src, i) => (
                <div key={src} className="relative rounded-xl overflow-hidden bg-surface">
                  <img src={src} alt={`preview-${i}`} className="w-full h-40 object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Video preview */}
          {videoPreview && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                src={videoPreview}
                controls
                className="w-full max-h-72 object-contain"
              />
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
              >
                <FiX size={12} />
              </button>
              {videoDuration && videoDuration > MAX_VIDEO_DURATION_SECONDS && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-lg">
                  Will trim to first {MAX_VIDEO_DURATION_SECONDS}s
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-stroke">
          <div className="flex items-center gap-4">
            <label
              className={`flex items-center gap-2 text-sm font-medium transition ${
                images.length >= MAX_IMAGES || Boolean(video)
                  ? "text-ink-muted cursor-not-allowed opacity-50"
                  : "text-primary-600 cursor-pointer hover:text-primary-800"
              }`}
            >
              <FiImage size={16} />
              <span>
                Photo {images.length > 0 && `(${images.length}/${MAX_IMAGES})`}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImages}
                disabled={images.length >= MAX_IMAGES || Boolean(video)}
                className="hidden"
              />
            </label>

            <label
              className={`flex items-center gap-2 text-sm font-medium transition ${
                Boolean(video) || images.length > 0
                  ? "text-ink-muted cursor-not-allowed opacity-50"
                  : "text-primary-600 cursor-pointer hover:text-primary-800"
              }`}
            >
              <FiVideo size={16} />
              <span>Video</span>
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                disabled={Boolean(video) || images.length > 0}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!text.trim() && images.length === 0 && !video)}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
