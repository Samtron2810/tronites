const DeletePostModal = ({ onConfirm, onCancel }) => {
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
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeletePostModal;
