import { useState } from "react";
import CreatePostModal from "./CreatePostModal";
import { useAuth } from "../context/AuthContext";

const CreatePost = ({ fetchPosts }) => {
  const [openModal, setOpenModal] = useState(false);
  const { user } = useAuth();

  return (
    <>
      {/* Create Box */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <div className="flex items-center gap-3">
          <img
            src={user?.profilePic || "https://i.pravatar.cc/"}
            alt="profile"
            className="w-12 h-12 rounded-full object-cover border"
          />

          <button
            onClick={() => setOpenModal(true)}
            className="flex-1 border border-gray-300 rounded-xl p-4 text-left text-gray-500 hover:border-blue-500 transition cursor-text"
          >
            What's on your mind?
          </button>
        </div>
      </div>

      {/* Modal */}
      {openModal && (
        <CreatePostModal
          closeModal={() => setOpenModal(false)}
          fetchPosts={fetchPosts}
        />
      )}
    </>
  );
};

export default CreatePost;
