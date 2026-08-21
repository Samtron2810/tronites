import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { FiX, FiImage, FiVideo } from "react-icons/fi";
import useMentionAutocomplete from "../hooks/useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";
import ConfirmDiscardModal from "./ConfirmDiscardModal";
import {
  validateVideoFile,
  probeVideoDuration,
  uploadVideoToCloudinary,
  MAX_VIDEO_DURATION_SECONDS,
} from "../services/videoUpload";
import api from "../services/api";

const MAX_IMAGES = 4;

const CreatePostModal = ({ closeModal, onSubmit, onVideoPosted }) => {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // objectURL[]
  // Custom video uploader state — the file is validated + previewed
  // locally first, then uploaded to Cloudinary when the user hits Post.
  const [videoFile, setVideoFile] = useState(null); // File | null
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null); // objectURL | null
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100 (bytes sent)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const textareaRef = useRef(null);
  const videoInputRef = useRef(null);
  const mention = useMentionAutocomplete();

  const handleTextChange = (e) => {
    setText(e.target.value);
    mention.handleTextChange(e.target.value, e.target.selectionStart);
  };

  const handleSelectMention = (username) => {
    const { text: newText, cursorPos } = mention.applySuggestion(
      text,
      username,
    );
    setText(newText);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleImages = (e) => {
    if (videoFile) {
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

  // Video selection: validate synchronously (format/size), then probe the
  // duration from metadata — all before anything is uploaded, so bad files
  // are rejected instantly with no bandwidth spent.
  const handleSelectVideo = async (e) => {
    if (images.length > 0) {
      toast.error("Remove your images first to add a video");
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    const validationError = validateVideoFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    let duration;
    try {
      duration = await probeVideoDuration(file);
    } catch (error) {
      toast.error(error.message || "Couldn't read this video");
      return;
    }
    if (duration > MAX_VIDEO_DURATION_SECONDS) {
      toast.error(
        `Video is too long — the maximum duration is ${MAX_VIDEO_DURATION_SECONDS}s`,
      );
      return;
    }

    // Local blob preview — playable immediately, no upload required to
    // see what you're posting (an upgrade over the old widget, which only
    // previewed after the file had been uploaded).
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoFile(file);
  };

  const removeVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setVideoFile(null);
  };

  const hasDraft = text.trim() || images.length > 0 || Boolean(videoFile);

  const handleClose = () => {
    // Don't let the modal close mid-upload — that would orphan an
    // in-flight Cloudinary upload with no post attached to it.
    if (videoUploading) return;
    if (hasDraft) {
      setShowDiscardConfirm(true);
    } else {
      closeModal();
    }
  };

  const handleDiscard = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    closeModal();
  };

  const handleSubmit = async () => {
    if (!text.trim() && images.length === 0 && !videoFile) {
      return toast.error("Post cannot be empty");
    }

    // ── Video path: upload → create post → done ──────────────────────
    // The post is created in one shot AFTER the asset is fully uploaded
    // AND transformed (synchronous eager), so it appears in feeds as
    // "ready" immediately — no processing state, no webhook dependency.
    if (videoFile) {
      if (videoUploading) return;
      setVideoUploading(true);
      setUploadProgress(0);

      try {
        const video = await uploadVideoToCloudinary({
          file: videoFile,
          onProgress: setUploadProgress,
        });

        await api.post("/posts/video", { text, video });

        toast.success("Video posted!");
        onVideoPosted?.();
        removeVideo();
        closeModal();
      } catch (error) {
        // Keep the draft intact so the user can retry without re-selecting
        // the file. The failed Cloudinary asset (if any bytes made it up)
        // is simply never referenced by any post.
        toast.error(
          error?.response?.data?.message ||
            error.message ||
            "Couldn't post your video",
        );
      } finally {
        setVideoUploading(false);
        setUploadProgress(0);
      }
      return;
    }

    // ── Image path: hand off to the parent (unchanged) ────────────────
    onSubmit({ text, images });
    closeModal();
  };

  const gridClass = previews.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
          <h2 className="text-base font-semibold text-ink">Create Post</h2>
          <button
            onClick={handleClose}
            disabled={videoUploading}
            className="text-ink-muted hover:text-ink transition p-1 rounded-lg hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
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
            <span
              className={`text-xs ${text.length >= 260 ? "text-red-400" : "text-ink-muted"}`}
            >
              {text.length}/280
            </span>
          </div>

          {/* Image previews — carousel grid */}
          {previews.length > 0 && (
            <div className={`grid ${gridClass} gap-2`}>
              {previews.map((src, i) => (
                <div
                  key={src}
                  className="relative rounded-xl overflow-hidden bg-surface"
                >
                  <img
                    src={src}
                    alt={`preview-${i}`}
                    className="w-full h-40 object-cover"
                  />
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

          {/* Video preview — local blob, playable before any upload */}
          {videoPreviewUrl && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                src={videoPreviewUrl}
                controls
                playsInline
                className={`w-full max-h-72 object-contain ${
                  videoUploading ? "opacity-60" : ""
                }`}
              />
              {!videoUploading && (
                <button
                  onClick={removeVideo}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          )}

          {/* Custom upload progress bar — replaces the widget's own UI.
              Progress tracks bytes sent; once it hits 100% the label
              switches to "Processing…" for the final transformation step
              (trimming to 30s / mp4 conversion) before the post resolves. */}
          {videoUploading && (
            <div className="rounded-xl border border-stroke bg-surface px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>
                  {uploadProgress >= 100
                    ? "Processing video…"
                    : `Uploading video… ${uploadProgress}%`}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-stroke overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all duration-200"
                  style={{ width: `${Math.max(uploadProgress, 4)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-stroke">
          <div className="flex items-center gap-4">
            <label
              className={`flex items-center gap-2 text-sm font-medium transition ${
                images.length >= MAX_IMAGES ||
                Boolean(videoFile) ||
                videoUploading
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
                disabled={
                  images.length >= MAX_IMAGES ||
                  Boolean(videoFile) ||
                  videoUploading
                }
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={
                Boolean(videoFile) || videoUploading || images.length > 0
              }
              className={`flex items-center gap-2 text-sm font-medium transition ${
                Boolean(videoFile) || videoUploading || images.length > 0
                  ? "text-ink-muted cursor-not-allowed opacity-50"
                  : "text-primary-600 hover:text-primary-800"
              }`}
            >
              <FiVideo size={16} />
              <span>Video</span>
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,.mp4,.mov,.webm,.avi,.mkv"
              onChange={handleSelectVideo}
              disabled={
                Boolean(videoFile) || videoUploading || images.length > 0
              }
              className="hidden"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              videoUploading ||
              (!text.trim() && images.length === 0 && !videoFile)
            }
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {videoUploading ? "Posting…" : videoFile ? "Post video" : "Post"}
          </button>
        </div>
      </div>

      {showDiscardConfirm && (
        <ConfirmDiscardModal
          onConfirm={handleDiscard}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
};

export default CreatePostModal;
