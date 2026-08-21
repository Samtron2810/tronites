import { useState } from "react";
import toast from "react-hot-toast";
import CreatePostModal from "./CreatePostModal";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
import api from "../services/api";
import compressImage from "../utils/compressImage";
import { uploadToCloudinary } from "../services/cloudinary";

const CreatePost = ({ fetchPosts }) => {
  const [openModal, setOpenModal] = useState(false);
  const { user } = useAuth();

  // Background post submission for text/image posts — the modal closes
  // immediately and this runs the actual upload in the background so the
  // user isn't left staring at a loading spinner. Toasts surface
  // progress/completion. Video posts are handled entirely inside
  // CreatePostModal (the Cloudinary widget uploads directly and the post
  // is already created server-side before onSubmit ever fires for
  // video), so this only ever receives { text, images }.
  const handleSubmit = async ({ text, images }) => {
    const toastId = toast.loading("Posting…");
    try {
      if (images.length) {
        // Images: get a signed upload request, upload each image directly
        // to Cloudinary, then create the post with the returned URLs.
        const sigRes = await api.post("/posts/signature/image", {
          count: images.length,
        });
        const signatureData = sigRes.data;
        const compressed = await Promise.all(images.map(compressImage));
        const uploaded = await Promise.all(
          compressed.map((file) => uploadToCloudinary({ file, signatureData })),
        );
        const urls = uploaded.map((r) => r.secure_url);
        await api.post("/posts", { text, images: urls });
        toast.success("Post created!", { id: toastId });
      } else {
        // Text-only post.
        await api.post("/posts", { text });
        toast.success("Post created!", { id: toastId });
      }

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

  return (
    <>
      <div className="bg-white border border-stroke rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <img
            src={user?.profilePic || defaultAvatar}
            alt="profile"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
          />
          <button
            onClick={() => setOpenModal(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-xl border border-stroke text-ink-muted text-sm bg-surface hover:border-primary-400 hover:bg-primary-50 transition cursor-text"
          >
            What's on your mind?
          </button>
        </div>
      </div>

      {openModal && (
        <CreatePostModal
          closeModal={() => setOpenModal(false)}
          onSubmit={handleSubmit}
          onVideoPosted={fetchPosts}
        />
      )}
    </>
  );
};

export default CreatePost;
