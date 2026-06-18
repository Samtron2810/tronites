const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-orange-400">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-md p-6 animate-pulse">
          {/* Top */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gray-300"></div>

              {/* Info */}
              <div>
                <div className="h-6 bg-gray-300 rounded w-40"></div>
                <div className="h-4 bg-gray-200 rounded w-56 mt-2"></div>
                <div className="flex gap-6 mt-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>

            {/* Button skeleton */}
            <div className="w-28 h-10 bg-gray-300 rounded-lg"></div>
          </div>
        </div>

        {/* Posts skeletons */}
        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-300"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-20 mt-2"></div>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
            <div className="mt-5 h-64 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-300"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-20 mt-2"></div>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
            <div className="mt-5 h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
