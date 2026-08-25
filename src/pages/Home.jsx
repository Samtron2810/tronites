import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import api from "../services/api";
import { useSocket } from "../context/useSocket";
import { HiOutlineSparkles } from "react-icons/hi2";
import { FiClock } from "react-icons/fi";

const TABS = [
  { key: "following", label: "Following", icon: FiClock },
  { key: "trending", label: "Trending", icon: HiOutlineSparkles },
];

const Home = () => {
  const [tab, setTab] = useState("following"); // "following" | "trending"

  // Each tab keeps fully independent feed/pagination state so switching
  // back and forth never re-fetches or loses scroll-position-relevant
  // data for the tab you're leaving.
  const [feeds, setFeeds] = useState({
    following: { posts: [], cursor: null, hasMore: true, loaded: false },
    trending: { posts: [], cursor: null, hasMore: true, loaded: false },
  });
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const { socket } = useSocket();

  const current = feeds[tab];

  const fetchPosts = useCallback(
    async (targetTab, afterCursor, isFirstPage) => {
      try {
        if (isFirstPage) setLoading(true);
        else setIsLoadingMore(true);

        const params =
          targetTab === "trending"
            ? {
                limit: 10,
                ...(afterCursor
                  ? {
                      afterScore: afterCursor.afterScore,
                      afterId: afterCursor.afterId,
                    }
                  : {}),
              }
            : {
                limit: 10,
                ...(afterCursor ? { before: afterCursor } : {}),
              };

        const endpoint =
          targetTab === "trending" ? "/posts/trending" : "/posts/feed";

        const res = await api.get(endpoint, { params });

        setFeeds((prev) => ({
          ...prev,
          [targetTab]: {
            posts: isFirstPage
              ? res.data.posts
              : [...prev[targetTab].posts, ...res.data.posts],
            cursor: res.data.nextCursor,
            hasMore: res.data.hasMore,
            loaded: true,
          },
        }));
      } catch (e) {
        console.error(e);
        if (!isFirstPage) toast.error("Couldn't load more posts. Try again.");
      } finally {
        if (isFirstPage) setLoading(false);
        else setIsLoadingMore(false);
      }
    },
    [],
  );

  // Load a tab the first time it's opened; switching back later reuses
  // what's already in state instead of re-fetching from scratch.
  useEffect(() => {
    if (!feeds[tab].loaded) fetchPosts(tab, null, true);
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          current.hasMore &&
          !isLoadingMore &&
          !loading
        )
          fetchPosts(tab, current.cursor, false);
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [tab, current.cursor, current.hasMore, isLoadingMore, loading, fetchPosts]);

  useEffect(() => {
    if (!socket) return;
    const handleNewPost = (newPost) => {
      // New posts only prepend into the reverse-chronological Following
      // feed — Trending is ranked by engagement/decay, so a brand new
      // post belongs wherever its score lands, not at the top.
      setFeeds((prev) =>
        prev.following.posts.some((p) => p._id === newPost._id)
          ? prev
          : {
              ...prev,
              following: {
                ...prev.following,
                posts: [newPost, ...prev.following.posts],
              },
            },
      );
    };
    socket.on("newPost", handleNewPost);
    return () => socket.off("newPost", handleNewPost);
  }, [socket]);

  const removePost = (id) => {
    setFeeds((prev) => ({
      following: {
        ...prev.following,
        posts: prev.following.posts.filter((p) => p._id !== id),
      },
      trending: {
        ...prev.trending,
        posts: prev.trending.posts.filter((p) => p._id !== id),
      },
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <CreatePost fetchPosts={() => fetchPosts("following", null, true)} />

        {/* Underline tab switcher — deliberately not the filled-pill
            style Explore uses, so Home reads as its own surface. */}
        <div className="flex border-b border-stroke">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition ${
                tab === key
                  ? "text-primary-600"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon size={16} />
              {label}
              {tab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {loading && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {!loading &&
          current.posts.map((post) => (
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
              isLiked={post.isLiked}
              isBookmarked={post.isBookmarked}
              edited={post.edited}
              editedAt={post.editedAt}
              onDelete={removePost}
            />
          ))}

        {!loading && current.posts.length === 0 && (
          <div className="bg-card border border-stroke rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">{tab === "trending" ? "✨" : "👋"}</p>
            <h2 className="text-base font-semibold text-ink">
              {tab === "trending"
                ? "Nothing trending yet"
                : "Your feed is empty"}
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              {tab === "trending"
                ? "Check back once posts start getting engagement."
                : "Follow users to start seeing posts."}
            </p>
          </div>
        )}

        <div ref={observerTarget} className="py-4 text-center">
          {isLoadingMore && (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          )}
          {!current.hasMore && current.posts.length > 0 && (
            <p className="text-xs text-ink-muted">You're all caught up</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
