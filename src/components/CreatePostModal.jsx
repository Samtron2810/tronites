import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { FiX, FiImage, FiVideo, FiLoader } from "react-icons/fi";
import useMentionAutocomplete from "../hooks/useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";
import ConfirmDiscardModal from "./ConfirmDiscardModal";
import { openVideoUploadWidget } from "../services/cloudinaryWidget";
import api from "../services/api";

const MAX_IMAGES = 4;

const CreatePostModal = ({ closeModal, onSubmit, onVideoPosted }) => {
  const [text, setText] = useState("");
  const [images, setImages] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // objectURL[]
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoResult, setVideoResult] = useState(null); // Cloudinary widget `info` object | null
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const textareaRef = useRef(null);
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
    if (videoResult) {
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

  const handleOpenVideoWidget = async () => {
    if (images.length > 0) {
      toast.error("Remove your images first to add a video");
      return;
    }

    setVideoUploading(true);
    const toastId = toast.loading("Preparing upload…");

    try {
      // Creates the post shell server-side (status: "processing") and
      // returns the folder/eager/notificationUrl/context config the
      // widget needs. The widget signs each attempt itself via
      // uploadSignature (see cloudinaryWidget.js) — no signature is
      // returned from this call.
      const res = await api.post("/posts/signature/video", { text });
      const signatureConfig = res.data;
      toast.dismiss(toastId);

      openVideoUploadWidget({
        signatureConfig,
        onSuccess: (info) => {
          setVideoResult({ ...info, postId: signatureConfig.postId });
          setVideoUploading(false);
          toast.success("Video uploaded — processing will finish shortly.");
          onVideoPosted?.();
        },
        onError: async (error) => {
          setVideoUploading(false);
          toast.error(error.message || "Video upload failed");
          try {
            await api.delete(`/posts/${signatureConfig.postId}`);
          } catch (cleanupError) {
            console.error(
              "Failed to clean up failed video post shell:",
              cleanupError.message,
            );
          }
        },
        onClose: async () => {
          // Widget closed without a completed upload (user cancelled,
          // or closed after an error). The post shell was already
          // created server-side with status "processing" and no video
          // attached — clean it up now rather than leaving an orphaned
          // draft that never reaches "ready" and never shows up
          // anywhere, but still sits in the database and counts toward
          // the user's post history.
          setVideoUploading(false);
          try {
            await api.delete(`/posts/${signatureConfig.postId}`);
          } catch (cleanupError) {
            // Not user-facing — the shell just lingers as "processing"
            // forever if this fails, same as before this fix existed.
            console.error(
              "Failed to clean up abandoned video post shell:",
              cleanupError.message,
            );
          }
        },
      });
    } catch (error) {
      setVideoUploading(false);
      toast.error(
        error?.response?.data?.message || "Couldn't start video upload",
        { id: toastId },
      );
    }
  };

  const removeVideo = () => {
    setVideoResult(null);
  };

  const hasDraft = text.trim() || images.length > 0 || Boolean(videoResult);

  const handleClose = () => {
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

  const handleSubmit = () => {
    // Video posts are already created server-side by the time
    // videoResult is set (see handleOpenVideoWidget) — the webhook
    // flips them to "ready" independently of this modal, so submitting
    // here just closes the modal.
    if (videoResult) {
      closeModal();
      return;
    }

    if (!text.trim() && images.length === 0) {
      return toast.error("Post cannot be empty");
    }

    // Hand the draft off to the parent, which runs the actual upload in
    // the background (see CreatePost.jsx). Close the modal immediately
    // so the user isn't left waiting on a loading spinner — toasts from
    // the background upload surface progress/completion.
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
            className="text-ink-muted hover:text-ink transition p-1 rounded-lg hover:bg-surface"
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

          {/* Video preview — uses the Cloudinary-hosted eager thumbnail
              (so_1,f_jpg) since the widget already uploaded the file;
              there's no local blob to preview from anymore. */}
          {videoResult && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                src={videoResult.secure_url}
                controls
                className="w-full max-h-72 object-contain"
              />
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
              >
                <FiX size={12} />
              </button>
            </div>
          )}

          {videoUploading && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-stroke bg-surface py-6 text-sm text-ink-muted">
              <FiLoader size={16} className="animate-spin" />
              Waiting for upload widget…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-stroke">
          <div className="flex items-center gap-4">
            <label
              className={`flex items-center gap-2 text-sm font-medium transition ${
                images.length >= MAX_IMAGES || Boolean(videoResult) || videoUploading
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
                disabled={images.length >= MAX_IMAGES || Boolean(videoResult) || videoUploading}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleOpenVideoWidget}
              disabled={Boolean(videoResult) || videoUploading || images.length > 0}
              className={`flex items-center gap-2 text-sm font-medium transition ${
                Boolean(videoResult) || videoUploading || images.length > 0
                  ? "text-ink-muted cursor-not-allowed opacity-50"
                  : "text-primary-600 hover:text-primary-800"
              }`}
            >
              <FiVideo size={16} />
              <span>Video</span>
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!text.trim() && images.length === 0 && !videoResult}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {videoResult ? "Done" : "Post"}
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
