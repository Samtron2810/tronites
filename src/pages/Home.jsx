import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import TrendingHashtagsWidget from "../components/TrendingHashtagsWidget";
import api from "../services/api";
import { useSocket } from "../context/useSocket";
import { HiOutlineSparkles } from "react-icons/hi2";
import { FiClock, FiUsers } from "react-icons/fi";

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
  // Synchronous in-flight guard — the observer's `!isLoadingMore` check
  // reads React state, which commits asynchronously, so two intersection
  // callbacks in the same tick can both pass it and double-fetch a page.
  // A ref flips synchronously, so the second call is dropped before it
  // can fire a request.
  const fetchInFlightRef = useRef(false);
  // Latest posts per tab, kept in a ref so the stable fetchPosts callback
  // (empty deps) can read the current list for the trending excludeIds
  // param without closing over a stale `feeds`. Synced via an effect —
  // the react-hooks/refs rule forbids touching refs during render.
  const feedsRef = useRef(feeds);
  useEffect(() => {
    feedsRef.current = feeds;
  }, [feeds]);
  const { socket } = useSocket();

  const current = feeds[tab];

  const fetchPosts = useCallback(
    async (targetTab, afterCursor, isFirstPage) => {
      // Drop concurrent fetches (see fetchInFlightRef above); the first
      // call still completes and resets the ref in `finally`.
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
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
                      // Hard-exclude posts already delivered on earlier
                      // trending pages — a post's score decays with age
                      // between requests, so without this guard it can
                      // drop below the page-1 cursor and be re-served on
                      // page 2. The backend validates + caps this list.
                      excludeIds: feedsRef.current[targetTab].posts
                        .map((p) => p._id)
                        .join(","),
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

        setFeeds((prev) => {
          let nextPosts;
          if (isFirstPage) {
            // Full refresh (e.g. after creating a post) — replace
            // wholesale. Never filter against the old list here: that
            // would strip every already-displayed post and leave only
            // the brand-new one(s).
            nextPosts = res.data.posts;
          } else {
            // Append (load more): never re-add a post that's already in
            // the list — this is the guard that keeps ordering drift /
            // score decay in trending from duplicating posts.
            const existingIds = new Set(
              prev[targetTab].posts.map((p) => p._id),
            );
            nextPosts = [
              ...prev[targetTab].posts,
              ...res.data.posts.filter((p) => !existingIds.has(p._id)),
            ];
          }
          return {
            ...prev,
            [targetTab]: {
              posts: nextPosts,
              cursor: res.data.nextCursor,
              hasMore: res.data.hasMore,
              loaded: true,
            },
          };
        });
      } catch (e) {
        console.error(e);
        if (!isFirstPage) toast.error("Couldn't load more posts. Try again.");
      } finally {
        if (isFirstPage) setLoading(false);
        else setIsLoadingMore(false);
        fetchInFlightRef.current = false;
      }
    },
    [],
  );

  // Load a tab the first time it's opened; switching back later reuses
  // what's already in state instead of re-fetching from scratch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-tab-open; setState happens inside the async fetchPosts fn, not synchronously in this effect body
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

        <TrendingHashtagsWidget />

        {/* Underline tab switcher — deliberately not the filled-pill
            style Explore uses, so Home reads as its own surface. */}
        <div className="flex border-b border-stroke">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-4 py-3 text-base font-semibold transition ${
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
          current.posts.map((post, index) => (
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
              privacy={post.privacy}
              editedAt={post.editedAt}
              onDelete={removePost}
              priority={index === 0}
            />
          ))}

        {!loading && current.posts.length === 0 && (
          <div className="bg-card border border-stroke rounded-2xl p-10 text-center">
            <p className="text-3xl mb-2">{tab === "trending" ? "✨" : "👋"}</p>
            <h2 className="text-lg font-semibold text-ink">
              {tab === "trending"
                ? "Nothing trending yet"
                : "Your feed is empty"}
            </h2>
            <p className="text-base text-ink-muted mt-1">
              {tab === "trending"
                ? "Check back once posts start getting engagement."
                : "Follow users to start seeing posts."}
            </p>
            {tab === "following" && (
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
                >
                  <FiUsers size={16} />
                  Explore users
                </Link>
                <button
                  type="button"
                  onClick={() => setTab("trending")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-stroke text-ink text-sm font-medium hover:bg-surface transition"
                >
                  <HiOutlineSparkles size={16} />
                  See trending posts
                </button>
              </div>
            )}
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
            <p className="text-sm text-ink-muted">You're all caught up</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
