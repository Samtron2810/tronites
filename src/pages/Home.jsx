import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import TrendingHashtagsWidget from "../components/TrendingHashtagsWidget";
import api from "../services/api";
import { useRefetchOnFocus } from "../hooks/useRefetchOnFocus";
import { useSocket } from "../context/useSocket";
import { HiOutlineSparkles } from "react-icons/hi2";
import { FiClock, FiUsers } from "react-icons/fi";

// Two tabs — see tab-architecture.html. For You absorbs Trending as a
// weighted source (services/forYouService.js on the backend) rather
// than sitting alongside it as a third, overlapping algorithmic tab.
// Following stays the strictly-chronological, never-ranked promise.
const TABS = [
  { key: "forYou", label: "For You", icon: HiOutlineSparkles },
  { key: "following", label: "Following", icon: FiClock },
];

const Home = () => {
  const [tab, setTab] = useState("forYou"); // "forYou" | "following"

  // Each tab keeps fully independent feed/pagination state so switching
  // back and forth never re-fetches or loses scroll-position-relevant
  // data for the tab you're leaving.
  const [feeds, setFeeds] = useState({
    forYou: { posts: [], cursor: null, hasMore: true, loaded: false },
    following: { posts: [], cursor: null, hasMore: true, loaded: false },
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
  // (empty deps) can read the current list for the For You excludeIds
  // param without closing over a stale `feeds`. Synced via an effect —
  // the react-hooks/refs rule forbids touching refs during render.
  const feedsRef = useRef(feeds);
  useEffect(() => {
    feedsRef.current = feeds;
  }, [feeds]);
  const { socket } = useSocket();

  const current = feeds[tab];

  // fetchPosts — the `silent` flag controls whether a first-page fetch
  // shows the skeleton or not.
  //   silent=false (default): shows skeleton — used on initial tab open.
  //   silent=true: leaves existing posts visible and revalidates behind
  //     the scenes — used by useRefetchOnFocus and explicit invalidation
  //     after creating a post (getCached revalidate:true already returns
  //     stale data instantly, so the skeleton would flash for no reason).
  const fetchPosts = useCallback(
    async (targetTab, afterCursor, isFirstPage, { silent = false } = {}) => {
      // Drop concurrent fetches (see fetchInFlightRef above); the first
      // call still completes and resets the ref in `finally`.
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
      try {
        if (isFirstPage && !silent) setLoading(true);
        else if (!isFirstPage) setIsLoadingMore(true);

        const params =
          targetTab === "forYou"
            ? {
                limit: 10,
                ...(afterCursor
                  ? {
                      // Opaque comma-joined id cursor — see
                      // getForYouFeed in postController.js. Unlike
                      // Trending's score+id cursor, For You's ranking
                      // shifts between loads (affinity/exploration are
                      // meant to vary), so it hard-excludes everything
                      // already delivered rather than trying to resume
                      // from a stable rank position.
                      excludeIds: afterCursor,
                    }
                  : {}),
              }
            : {
                limit: 10,
                ...(afterCursor ? { before: afterCursor } : {}),
              };

        const endpoint =
          targetTab === "forYou" ? "/posts/for-you" : "/posts/feed";

        const res = isFirstPage
          ? await api.getCached(endpoint, { params, ttlMs: 30_000, revalidate: true })
          : await api.get(endpoint, { params });

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
            // score decay in For You from duplicating posts.
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
        if (isFirstPage && !silent) setLoading(false);
        else if (!isFirstPage) setIsLoadingMore(false);
        fetchInFlightRef.current = false;
      }
    },
    [],
  );

  // Load a tab the first time it's opened; switching back later reuses
  // what's already in state instead of re-fetching from scratch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-tab-open; setState happens inside the async fetchPosts fn, not synchronously in this effect body
    if (!feeds[tab].loaded) fetchPosts(tab, null, true, { silent: false });
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Tier-2 revalidate-on-focus — re-runs the CURRENT tab's first-page
  // fetch SILENTLY: getCached revalidate:true already serves stale data
  // instantly, so we must not set loading=true here or the existing
  // posts flash away and the skeleton appears for no reason.
  useRefetchOnFocus(() => fetchPosts(tab, null, true, { silent: true }));

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
      // feed — For You is ranked by score, so a brand new post belongs
      // wherever its score lands, not at the top.
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
      forYou: {
        ...prev.forYou,
        posts: prev.forYou.posts.filter((p) => p._id !== id),
      },
      following: {
        ...prev.following,
        posts: prev.following.posts.filter((p) => p._id !== id),
      },
    }));
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <CreatePost
          fetchPosts={() => {
            api.invalidateMany(["/posts/for-you", "/posts/feed", "/posts/hashtag/"]);
            // Silent revalidate — we just created a post so the feed will
            // update, but we don't want to flash the skeleton.
            fetchPosts("following", null, true, { silent: true });
          }}
        />

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
              userId={post.user?._id || post.quoteOf?.user?._id}
              name={post.user?.name}
              username={post.user?.username}
              profilePic={post.user?.profilePic}
              verifications={post.user?.verifications}
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
              repostedBy={post.repostedBy}
              isQuotePost={post.isQuotePost}
              quoteOf={post.quoteOf}
              edited={post.edited}
              privacy={post.privacy}
              editedAt={post.editedAt}
              onDelete={removePost}
              forYouSource={tab === "forYou" ? post.forYouSource : undefined}
              priority={index === 0}
            />
          ))}

        {!loading && current.posts.length === 0 && (
          <div className="bg-card border border-stroke rounded-2xl p-10 text-center">
            <p className="text-3xl mb-2">{tab === "forYou" ? "✨" : "👋"}</p>
            <h2 className="text-lg font-semibold text-ink">
              {tab === "forYou"
                ? "Nothing to show yet"
                : "Your feed is empty"}
            </h2>
            <p className="text-base text-ink-muted mt-1">
              {tab === "forYou"
                ? "Follow a few people or explore to get this tab started."
                : "Follow users to start seeing posts."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
              >
                <FiUsers size={16} />
                Explore users
              </Link>
              {tab === "following" && (
                <button
                  type="button"
                  onClick={() => setTab("forYou")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-stroke text-ink text-sm font-medium hover:bg-surface transition"
                >
                  <HiOutlineSparkles size={16} />
                  See For You
                </button>
              )}
            </div>
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
