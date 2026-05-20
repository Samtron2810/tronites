import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import api from "../services/api";

import { useAuth } from "../context/AuthContext";

const Explore = () => {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const res = await api.get(`/users/search?q=${search}`);

      setUsers(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  // Follow toggle
  const handleFollow = async (userId) => {
    try {
      const res = await api.put(`/users/follow/${userId}`);

      setUsers((prev) =>
        prev.map((user) => {
          if (user._id !== userId) {
            return user;
          }

          const alreadyFollowing = user.followers.includes(currentUser._id);

          return {
            ...user,

            followers: alreadyFollowing
              ? user.followers.filter((id) => id !== currentUser._id)
              : [...user.followers, currentUser._id],
          };
        }),
      );
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Search */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-xl p-3 outline-none"
          />
        </div>

        {/* Users */}
        <div className="space-y-4">
          {loading && <p className="text-center text-gray-500">Searching...</p>}

          {!loading &&
            users.map((user) => {
              const isFollowing = user.followers.includes(currentUser._id);

              return (
                <div
                  key={user._id}
                  className="bg-white rounded-2xl shadow-md p-4 flex items-center justify-between"
                >
                  {/* User Info */}
                  <Link
                    to={`/profile/${user._id}`}
                    className="flex items-center gap-4"
                  >
                    {/* USER AVATAR */}
                    <img
                      src={user.profilePic || "https://i.pravatar.cc/"}
                      alt="user"
                      className="w-14 h-14 rounded-full object-cover"
                    />

                    <div>
                      <h2 className="font-bold text-gray-900">{user.name}</h2>

                      <p className="text-sm text-gray-500">
                        {user.bio || "No bio"}
                      </p>
                    </div>
                  </Link>

                  {/* Follow Button */}
                  <button
                    onClick={() => handleFollow(user._id)}
                    className={`px-5 py-2 rounded-lg text-white font-semibold transition ${
                      isFollowing
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Explore;
