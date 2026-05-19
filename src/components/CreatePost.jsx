import { useState } from "react";

import CreatePostModal from "./CreatePostModal";

const CreatePost = ({ fetchPosts }) => {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      {/* Create Box */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <button
          onClick={() => setOpenModal(true)}
          className="w-full border border-gray-300 rounded-xl p-4 text-left text-gray-500 hover:border-blue-500 transition cursor-text"
        >
          What's happening?
        </button>
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
