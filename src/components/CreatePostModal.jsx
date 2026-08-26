import { useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  FiX,
  FiImage,
  FiVideo,
  FiFilm,
  FiGlobe,
  FiUsers,
  FiLock,
} from "react-icons/fi";
import useMentionAutocomplete from "../hooks/useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";
import ConfirmDiscardModal from "./ConfirmDiscardModal";
import { validateVideoFile } from "../services/videoUpload";

const MAX_IMAGES = 4;

// Post audience options — mirrors the backend's Post.privacy enum
// (backend/models/Post.js) and the values validated in
// backend/utils/validators.js.
const PRIVACY_OPTIONS = [
  { value: "public", label: "Public", icon: FiGlobe },
  { value: "followers", label: "Followers", icon: FiUsers },
  { value: "only-me", label: "Only me", icon: FiLock },
];

const CreatePostModal = ({ closeModal, onSubmit, onSubmitVideo }) => {
  const [text, setText] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [images, setImages] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // objectURL[]
  // Video is only validated (format/size) + previewed locally here — no
  // local decode/duration probe. The browser's <video> support doesn't
  // match what Cloudinary can actually accept (HEVC MOV, AVI/MKV with
  // exotic codecs all upload and transcode fine server-side even when
  // the browser can't play them), so we trust the upload and let
  // Cloudinary's eager transform be the real validator. The preview
  // below degrades gracefully if the browser can't render it.
  const [videoFile, setVideoFile] = useState(null); // File | null
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null); // objectURL | null
  const [videoPreviewFailed, setVideoPreviewFailed] = useState(false);
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

  // Video selection: format/size validation only, no decode probe. Any
  // file that passes gets uploaded — Cloudinary transcodes/trims
  // whatever codec is inside regardless of what the browser can preview.
  const handleSelectVideo = (e) => {
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

    setVideoPreviewFailed(false);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setVideoFile(file);
  };

  const removeVideo = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setVideoPreviewFailed(false);
    setVideoFile(null);
  };

  const hasDraft = text.trim() || images.length > 0 || Boolean(videoFile);

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
    if (!text.trim() && images.length === 0 && !videoFile) {
      return toast.error("Post cannot be empty");
    }

    // Both paths now close the modal immediately and hand off to the
    // parent, which runs the upload in the background and reports
    // progress/result via toast — matches the image post UX.
    if (videoFile) {
      onSubmitVideo({ text, videoFile, privacy });
    } else {
      onSubmit({ text, images, privacy });
    }
    closeModal();
  };

  const gridClass = previews.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
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
                // The textarea is the first element of the body, directly
                // under the header. Its wrapper is clipped by both the
                // body's overflow-y-auto and the card's overflow-hidden,
                // so a list opening upward ("up" default) gets sliced to a
                // sliver under the header. Open downward instead; trimmed
                // max-height keeps it inside the ~102px guaranteed clear
                // below the textarea even in an empty modal.
                direction="down"
                maxHeightClass="max-h-24"
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

          {/* Post audience selector */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ink-sub cursor-pointer">
              {(() => {
                const current = PRIVACY_OPTIONS.find(
                  (o) => o.value === privacy,
                );
                const CurrentIcon = current?.icon || FiGlobe;
                return (
                  <CurrentIcon
                    size={15}
                    className="text-primary-600 shrink-0"
                  />
                );
              })()}
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                aria-label="Who can see this post"
                className="bg-surface border border-stroke rounded-lg px-2.5 py-1.5 text-sm text-ink outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition cursor-pointer"
              >
                {PRIVACY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
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

          {/* an instruction that displays when a video is selected, saying a video of more than 30 seconds will be trimmed to 30 seconds */}
          {videoFile && (
            <p className="text-xs text-ink-muted">
              Note: Videos longer than 30 seconds will be trimmed to 30 seconds.
            </p>
          )}
          {/* Video preview — local blob when the browser can decode it;
              falls back to a file chip when it can't (HEVC MOV, exotic
              AVI/MKV codecs, etc). Either way the file still uploads and
              Cloudinary transcodes it server-side. */}
          {videoPreviewUrl && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              {videoPreviewFailed ? (
                <div className="flex items-center gap-3 px-4 py-6 bg-surface">
                  <FiFilm size={28} className="text-primary-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {videoFile?.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      Preview isn't available in this browser — it'll still
                      upload and post normally.
                    </p>
                  </div>
                </div>
              ) : (
                <video
                  src={videoPreviewUrl}
                  controls
                  playsInline
                  onError={() => setVideoPreviewFailed(true)}
                  className="w-full max-h-72 object-contain"
                />
              )}
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
              >
                <FiX size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-stroke">
          <div className="flex items-center gap-4">
            <label
              className={`flex items-center gap-2 text-sm font-medium transition ${
                images.length >= MAX_IMAGES || Boolean(videoFile)
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
                disabled={images.length >= MAX_IMAGES || Boolean(videoFile)}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={Boolean(videoFile) || images.length > 0}
              className={`flex items-center gap-2 text-sm font-medium transition ${
                Boolean(videoFile) || images.length > 0
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
              disabled={Boolean(videoFile) || images.length > 0}
              className="hidden"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!text.trim() && images.length === 0 && !videoFile}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {videoFile ? "Post video" : "Post"}
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
