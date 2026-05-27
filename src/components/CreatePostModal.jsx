import { useState } from "react";

import toast from "react-hot-toast";

import api from "../services/api";

const CreatePostModal = ({ closeModal, fetchPosts }) => {
  const [text, setText] = useState("");

  const [image, setImage] = useState(null);

  const [preview, setPreview] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Image
  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImage(file);

    setPreview(URL.createObjectURL(file));
  };

  // real submit
  const handleSubmit = async () => {
    if (!text.trim()) return toast.error("Post cannot be empty");
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("text", text);
      if (image) formData.append("image", image);

      await api.post("/posts", formData);

      toast.success("Post created successfully");
      fetchPosts();
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setIsSubmitting(false);
      closeModal();
    }
  };

  return (
    <div className="h-screen fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="overflow-y-auto bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl">
        {/* Heading */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Post</h2>

          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-red-500 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="What's happening?"
          className="w-full border border-gray-300 rounded-xl p-4 mt-5 outline-none resize-none focus:border-blue-500"
        />

        {/* Character Counter */}
        <div className="text-right text-sm text-gray-500 mt-2">
          {text.length}/280
        </div>

        {/* Image Preview */}
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="mt-2 mx-auto rounded-xl w-1/2 h-auto object-cover"
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-5">
          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="cursor-pointer border-2 border-blue-500 rounded-lg bg-blue-200 pl-2 text-sm text-blue-700 hover:bg-blue-300 transition duration-200"
          />

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
            className={`text-white px-6 py-2 rounded-lg font-semibold transition duration-200 ${
              isSubmitting || !text.trim()
                ? "bg-blue-300 cursor-not-allowed opacity-70"
                : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
            }`}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
