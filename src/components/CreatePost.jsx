import { useState } from "react";
import CreatePostModal from "./CreatePostModal";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";

const CreatePost = ({ fetchPosts }) => {
  const [openModal, setOpenModal] = useState(false);
  const { user } = useAuth();

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
        <CreatePostModal closeModal={() => setOpenModal(false)} fetchPosts={fetchPosts} />
      )}
    </>
  );
};

export default CreatePost;
