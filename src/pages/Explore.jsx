import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import UserCardSkeleton from "../components/UserCardSkeleton";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import TrendingHashtagsWidget from "../components/TrendingHashtagsWidget";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/useSocket";
import { FiSearch, FiHash } from "react-icons/fi";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

const Explore = () => {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();
  const [activeTab, setActiveTab] = useState("users"); // "users" | "posts"
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [followingId, setFollowingId] = useState(null);
  const observerTarget = useRef(null);

  // Separate state for post-content search — keeps the two tabs from
  // stepping on each other's pagination/loading state when switching.
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsIsLoadingMore, setPostsIsLoadingMore] = useState(false);
  const [postsCursor, setPostsCursor] = useState(null); // { afterScore, afterId } | null
  const [postsHasMore, setPostsHasMore] = useState(false);
  const postsObserverTarget = useRef(null);

  // A query starting with # is unambiguously a hashtag lookup — offer a
  // direct jump to that hashtag's dedicated page instead of (or in
  // addition to) a content-search match.
  const hashtagMatch = search.trim().match(/^#?([a-z0-9_]{2,})$/i);
  const possibleHashtag =
    activeTab === "posts" && hashtagMatch
      ? hashtagMatch[1].toLowerCase()
      : null;

  const fetchPosts = async (query, afterCursor, isFirstPage) => {
    try {
      if (isFirstPage) setPostsLoading(true);
      else setPostsIsLoadingMore(true);

      const res = await api.get(`/posts/search`, {
        params: {
          q: query,
          limit: 10,
          ...(afterCursor
            ? { afterScore: afterCursor.afterScore, afterId: afterCursor.afterId }
            : {}),
        },
      });

      if (isFirstPage) setPosts(res.data.posts);
      else setPosts((prev) => [...prev, ...res.data.posts]);

      setPostsHasMore(res.data.hasMore);
      setPostsCursor(res.data.nextCursor);
    } catch (e) {
      console.error(e);
      if (!isFirstPage) toast.error("Couldn't load more posts. Try again.");
    } finally {
      if (isFirstPage) setPostsLoading(false);
      else setPostsIsLoadingMore(false);
    }
  };

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale results while user is mid-typing a too-short query
      setUsers([]);
      setHasMore(false);
      setLoading(false);
      setPosts([]);
      setPostsHasMore(false);
      setPostsLoading(false);
      return;
    }
    const delay = trimmed.length === 0 ? 0 : 400;
    const t = window.setTimeout(() => {
      if (activeTab === "users") fetchUsers(trimmed, 1);
      else fetchPosts(trimmed, null, true);
    }, delay);
    return () => window.clearTimeout(t);
  }, [search, activeTab]);

  useEffect(() => {
    if (activeTab !== "users") return;
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !loading
        ) {
          fetchUsers(search.trim(), page + 1);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [activeTab, page, hasMore, isLoadingMore, loading, search]);

  useEffect(() => {
    if (activeTab !== "posts") return;
    const target = postsObserverTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          postsHasMore &&
          !postsIsLoadingMore &&
          !postsLoading
        ) {
          fetchPosts(search.trim(), postsCursor, false);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [
    activeTab,
    postsCursor,
    postsHasMore,
    postsIsLoadingMore,
    postsLoading,
    search,
  ]);

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
        }),
      );
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update follow status. Try again.");
    } finally {
      setFollowingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <TrendingHashtagsWidget />

        {/* Tab switcher */}
        <div className="bg-card border border-stroke rounded-2xl p-1 flex gap-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 text-base font-semibold py-2 rounded-xl transition ${
              activeTab === "users"
                ? "bg-primary-600 text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            People
          </button>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 text-base font-semibold py-2 rounded-xl transition ${
              activeTab === "posts"
                ? "bg-primary-600 text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Posts
          </button>
        </div>

        {/* Search bar */}
        <div className="bg-card border border-stroke rounded-2xl px-4 py-3 flex items-center gap-3">
          <FiSearch className="text-ink-muted shrink-0" size={16} />
          <input
            type="text"
            placeholder={
              activeTab === "users"
                ? "Search users..."
                : "Search posts or #hashtag..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-base text-ink placeholder:text-ink-muted outline-none bg-transparent"
          />
        </div>

        {/* Hashtag shortcut */}
        {possibleHashtag && (
          <Link
            to={`/hashtag/${possibleHashtag}`}
            className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-2xl px-4 py-3 text-base text-primary-700 hover:bg-primary-100 transition"
          >
            <FiHash size={15} />
            Jump to <span className="font-semibold">
              #{possibleHashtag}
            </span>{" "}
            hashtag page
          </Link>
        )}

        {activeTab === "users" && (
          <>
            {/* Hint */}
            {!loading && !search.trim() && users.length > 0 && (
              <p className="text-sm text-ink-muted px-1">Suggested users</p>
            )}
            {!loading &&
              search.trim().length > 0 &&
              search.trim().length < 2 && (
                <p className="text-sm text-ink-muted text-center py-6">
                  Type at least 2 characters to search.
                </p>
              )}
            {!loading && search.trim().length >= 2 && users.length === 0 && (
              <p className="text-base text-ink-muted text-center py-10">
                No users found for "{search}"
              </p>
            )}

            {/* Skeletons */}
            {loading && (
              <>
                <UserCardSkeleton />
                <UserCardSkeleton />
                <UserCardSkeleton />
              </>
            )}

            {/* User list */}
            {!loading &&
              users.map((user) => {
                const isFollowing = user.followers.includes(currentUser._id);
                const isOnline = onlineUsers.includes(user._id);
                return (
                  <div
                    key={user._id}
                    className="bg-card border border-stroke rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <Link
                      to={`/profile/${user._id}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={resizedImageUrl(user.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
                          alt={user.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100"
                        />
                        <span
                          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white ${isOnline ? "bg-primary-400" : "bg-gray-300"}`}
                          title={isOnline ? "Online" : "Offline"}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-ink truncate">
                          {user.name}
                        </p>
                        {user.username && (
                          <p className="text-sm text-primary-600 truncate">
                            @{user.username}
                          </p>
                        )}
                        <p className="text-sm text-ink-muted truncate">
                          {user.bio || "No bio"}
                        </p>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleFollow(user._id)}
                      disabled={followingId === user._id}
                      className={`shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFollowing
                          ? "bg-surface border border-stroke text-ink-sub hover:border-red-300 hover:text-red-500"
                          : "bg-primary-600 text-white hover:bg-primary-800"
                      }`}
                    >
                      {followingId === user._id
                        ? "..."
                        : isFollowing
                          ? "Following"
                          : "Follow"}
                    </button>
                  </div>
                );
              })}

            {!loading && hasMore && users.length > 0 && (
              <div ref={observerTarget} className="py-4 text-center">
                {isLoadingMore && (
                  <p className="text-sm text-ink-muted">Loading more...</p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "posts" && (
          <>
            {!postsLoading &&
              search.trim().length > 0 &&
              search.trim().length < 2 && (
                <p className="text-sm text-ink-muted text-center py-6">
                  Type at least 2 characters to search.
                </p>
              )}
            {!postsLoading &&
              search.trim().length >= 2 &&
              posts.length === 0 && (
                <p className="text-base text-ink-muted text-center py-10">
                  No posts found for "{search}"
                </p>
              )}
            {!postsLoading && search.trim().length === 0 && (
              <p className="text-base text-ink-muted text-center py-10">
                Search for posts by caption or #hashtag.
              </p>
            )}

            {postsLoading && (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            )}

            {!postsLoading &&
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  postId={post._id}
                  userId={post.user._id}
                  name={post.user.name}
                  username={post.user.username}
                  profilePic={post.user.profilePic}
                  time={new Date(post.createdAt).toLocaleString()}
                  text={post.text}
                  images={post.images}
                  video={post.video}
                  likes={post.likesCount}
                  commentsCount={post.commentsCount}
                  reposts={post.repostsCount}
                  isLiked={post.isLiked}
                  isBookmarked={post.isBookmarked}
                  isReposted={post.isReposted}
                  reactionSummary={post.reactionSummary}
                  myReaction={post.myReaction}
                  isQuotePost={post.isQuotePost}
                  quoteOf={post.quoteOf}
                  edited={post.edited}
                  privacy={post.privacy}
                  editedAt={post.editedAt}
                  onDelete={(id) =>
                    setPosts((prev) => prev.filter((p) => p._id !== id))
                  }
                />
              ))}

            {!postsLoading && postsHasMore && posts.length > 0 && (
              <div ref={postsObserverTarget} className="py-4 text-center">
                {postsIsLoadingMore && (
                  <p className="text-sm text-ink-muted">Loading more...</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Explore;
