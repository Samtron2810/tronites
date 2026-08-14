import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import UserCardSkeleton from "../components/UserCardSkeleton";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { FiSearch } from "react-icons/fi";

const Explore = () => {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [followingId, setFollowingId] = useState(null);
  const observerTarget = useRef(null);

  const fetchUsers = async (query, pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const res = await api.get(`/users/search`, {
        params: { q: query, page: pageNum, limit: 10 },
      });

      if (pageNum === 1) setUsers(res.data.users);
      else setUsers((prev) => [...prev, ...res.data.users]);

      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
      if (pageNum > 1) toast.error("Couldn't load more users. Try again.");
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      setUsers([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    const t = window.setTimeout(() => fetchUsers(trimmed, 1), trimmed.length === 0 ? 0 : 400);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          fetchUsers(search.trim(), page + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [page, hasMore, isLoadingMore, loading, search]);

  const handleFollow = async (userId) => {
    if (followingId) return;
    setFollowingId(userId);
    try {
      const res = await api.put(`/users/follow/${userId}`);
      // Trust the server's answer for whether we're now following,
      // rather than re-deriving it from local state (which could be
      // stale if this list hasn't refetched recently).
      setUsers((prev) =>
        prev.map((u) => {
          if (u._id !== userId) return u;
          return {
            ...u,
            followers: res.data.following
              ? [...u.followers, currentUser._id]
              : u.followers.filter((id) => id !== currentUser._id),
          };
        })
      );
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update follow status. Try again.");
    }
    finally { setFollowingId(null); }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Search bar */}
        <div className="bg-white border border-stroke rounded-2xl px-4 py-3 flex items-center gap-3">
          <FiSearch className="text-ink-muted shrink-0" size={16} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-ink placeholder:text-ink-muted outline-none bg-transparent"
          />
        </div>

        {/* Hint */}
        {!loading && !search.trim() && users.length > 0 && (
          <p className="text-xs text-ink-muted px-1">Suggested users</p>
        )}
        {!loading && search.trim().length > 0 && search.trim().length < 2 && (
          <p className="text-xs text-ink-muted text-center py-6">Type at least 2 characters to search.</p>
        )}
        {!loading && search.trim().length >= 2 && users.length === 0 && (
          <p className="text-sm text-ink-muted text-center py-10">No users found for "{search}"</p>
        )}

        {/* Skeletons */}
        {loading && <><UserCardSkeleton /><UserCardSkeleton /><UserCardSkeleton /></>}

        {/* User list */}
        {!loading && users.map((user) => {
          const isFollowing = user.followers.includes(currentUser._id);
          const isOnline = onlineUsers.includes(user._id);
          return (
            <div key={user._id} className="bg-white border border-stroke rounded-2xl p-4 flex items-center justify-between gap-4">
              <Link to={`/profile/${user._id}`} className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={user.profilePic || "https://i.pravatar.cc/"}
                    alt={user.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100"
                  />
                  <span
                    className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white ${isOnline ? "bg-primary-400" : "bg-gray-300"}`}
                    title={isOnline ? "Online" : "Offline"}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{user.name}</p>
                  {user.username && (
                    <p className="text-xs text-primary-600 truncate">@{user.username}</p>
                  )}
                  <p className="text-xs text-ink-muted truncate">{user.bio || "No bio"}</p>
                </div>
              </Link>

              <button
                onClick={() => handleFollow(user._id)}
                disabled={followingId === user._id}
                className={`shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isFollowing
                    ? "bg-surface border border-stroke text-ink-sub hover:border-red-300 hover:text-red-500"
                    : "bg-primary-600 text-white hover:bg-primary-800"
                }`}
              >
                {followingId === user._id ? "..." : isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}

        {!loading && hasMore && users.length > 0 && (
          <div ref={observerTarget} className="py-4 text-center">
            {isLoadingMore && <p className="text-xs text-ink-muted">Loading more...</p>}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Explore;
