import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import UserCardSkeleton from "../components/UserCardSkeleton";

import api from "../services/api";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const Explore = () => {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");

  const [users, setUsers] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [followingId, setFollowingId] = useState(null);

  const fetchUsers = async (query) => {
    try {
      setLoading(true);

      const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);

      setUsers(res.data);
      if (query.trim().length === 0) {
        setSuggestedUsers(res.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const trimmedSearch = search.trim();

    if (trimmedSearch.length === 0) {
      setUsers(suggestedUsers);
      setLoading(false);
      return;
    }

    if (trimmedSearch.length < 2) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      fetchUsers(trimmedSearch);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search, suggestedUsers]);

  useEffect(() => {
    fetchUsers("");
  }, []);

  // Follow toggle
  const handleFollow = async (userId) => {
    if (followingId) return;

    setFollowingId(userId);
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
    } finally {
      setFollowingId(null);
    }
  };

  const { onlineUsers } = useSocket();

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
          {loading && (
            <>
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
            </>
          )}

          {!loading && !search.trim() && (
            <div className="text-center text-gray-500">
              <b>
                <i>
                  Search users by name. Type at least 2 characters to begin.
                </i>
              </b>
            </div>
          )}

          {!loading && !search.trim() && suggestedUsers.length > 0 && (
            <div className="text-sm text-gray-500 px-2 pb-1">
              Suggested users
            </div>
          )}

          {!loading && search.trim().length > 0 && search.trim().length < 2 && (
            <div className="text-center text-gray-500 py-10">
              Please enter at least 2 characters to search.
            </div>
          )}

          {!loading && search.trim().length >= 2 && users.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              No users found. Try another name.
            </div>
          )}

          {!loading &&
            users.map((user) => {
              const isFollowing = user.followers.includes(currentUser._id);
              const isOnline = onlineUsers.includes(user._id);

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
                    <div className="relative">
                      <img
                        src={user.profilePic || "https://i.pravatar.cc/"}
                        alt="user"
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      <span
                        className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full border-2 border-white ${
                          isOnline ? "bg-green-500" : "bg-gray-300"
                        }`}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    </div>

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
                    disabled={followingId === user._id}
                    className={`px-5 py-2 rounded-lg text-white font-semibold transition ${
                      followingId === user._id
                        ? isFollowing
                          ? "bg-gray-500 opacity-70 cursor-not-allowed"
                          : "bg-blue-400 opacity-70 cursor-not-allowed"
                        : isFollowing
                          ? "bg-gray-600 hover:bg-gray-700"
                          : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {followingId === user._id
                      ? "Loading..."
                      : isFollowing
                        ? "Following"
                        : "Follow"}
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
