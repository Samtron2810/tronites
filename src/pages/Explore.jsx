const Explore = () => {
  return (
    <div className="min-h-screen bg-orange-400 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <h1 className="text-4xl font-extrabold text-gray-900">
          Explore <span className="text-blue-500">Users</span>
        </h1>

        <p className="text-gray-800 mt-2">
          Discover and connect with people in the community.
        </p>

        {/* Search */}
        <div className="mt-6">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full p-4 rounded-xl border border-gray-300 outline-none focus:border-blue-500 bg-white"
          />
        </div>

        {/* Users List */}
        <div className="mt-8 space-y-4">
          {/* User Card */}
          <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-300"></div>

              <div>
                <h2 className="font-bold text-gray-900">Jane Smith</h2>

                <p className="text-gray-600 text-sm">UI/UX Designer</p>
              </div>
            </div>

            <button className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold transition duration-200">
              Follow
            </button>
          </div>

          {/* Another User */}
          <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-300"></div>

              <div>
                <h2 className="font-bold text-gray-900">Michael Lee</h2>

                <p className="text-gray-600 text-sm">Fullstack Developer</p>
              </div>
            </div>

            <button className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold transition duration-200">
              Follow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
