import { useState } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import compressImage from "../utils/compressImage";
import { FiX, FiImage } from "react-icons/fi";

const CreatePostModal = ({ closeModal, fetchPosts }) => {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => { setImage(null); setPreview(""); };

  const handleSubmit = async () => {
    if (!text.trim()) return toast.error("Post cannot be empty");
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("text", text);
      if (image) {
        const compressed = await compressImage(image);
        formData.append("image", compressed);
      }
      await api.post("/posts", formData);
      toast.success("Post created!");
      fetchPosts();
      closeModal();
    } catch (error) {
      if (error.code === "ECONNABORTED") {
        toast.error("Upload is taking longer than expected — check your feed in a moment.");
      } else {
        toast.error(error?.response?.data?.message || error.message || "Failed to create post");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="What's happening?"
            className="w-full border border-stroke rounded-xl p-4 text-sm text-ink placeholder:text-ink-muted outline-none resize-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
          />
          <div className="flex justify-end">
            <span className={`text-xs ${text.length >= 260 ? "text-red-400" : "text-ink-muted"}`}>
              {text.length}/280
            </span>
          </div>

          {/* Image preview */}
          {preview && (
            <div className="relative inline-block">
              <img src={preview} alt="preview" className="rounded-xl max-h-52 object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition"
              >
                <FiX size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-stroke">
          <label className="flex items-center gap-2 text-sm text-primary-600 font-medium cursor-pointer hover:text-primary-800 transition">
            <FiImage size={16} />
            <span>Photo</span>
            <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </label>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
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
