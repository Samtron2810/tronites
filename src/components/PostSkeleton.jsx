const PostSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 animate-pulse">
      {/* User */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-300"></div>

        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-32"></div>

          <div className="h-3 bg-gray-200 rounded w-20 mt-2"></div>
        </div>
      </div>

      {/* Text */}
      <div className="mt-5 space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>

        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>

      {/* Image */}
      <div className="mt-5 h-64 bg-gray-200 rounded-xl"></div>
    </div>
  );
};

export default PostSkeleton;
