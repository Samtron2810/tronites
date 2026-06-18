const UserCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gray-300"></div>

        <div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-20 mt-2"></div>
        </div>
      </div>

      {/* Button skeleton */}
      <div className="w-24 h-10 bg-gray-300 rounded-lg"></div>
    </div>
  );
};

export default UserCardSkeleton;
