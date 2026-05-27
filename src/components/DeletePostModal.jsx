import { useState } from "react";

const DeletePostModal = ({ onConfirm, onCancel }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <div className="fixed h-screen inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
        <h2 className="text-lg font-bold text-gray-900">Delete Post</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Are you sure you want to delete this post? This action cannot be
          undone.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className={`flex-1 px-4 py-2 rounded-lg border transition ${
              isDeleting
                ? "border-gray-300 text-gray-700 opacity-50 cursor-not-allowed"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold transition ${
              isDeleting
                ? "bg-red-400 cursor-not-allowed opacity-70"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletePostModal;
