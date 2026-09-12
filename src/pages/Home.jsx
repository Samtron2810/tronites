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

const TABS = [
  { key: "forYou", label: "For You", icon: HiOutlineSparkles },
  { key: "following", label: "Following", icon: FiClock },
];

const Home = () => {
  const scrollKeyForTab = (t) => `home-scroll-${t}`;

  const [tab, setTab] = useState(() => {
    return sessionStorage.getItem("home-active-tab") || "forYou";
  });

  // ── feeds must be declared BEFORE any useEffect that reads feeds[tab] ──
  // Moving it here (above the scroll-restore effect) fixes the
  // ReferenceError: Cannot access 'feeds' before initialization that was
  // crashing the page with the ErrorBoundary.
  const [feeds, setFeeds] = useState({
    forYou: { posts: [], cursor: null, hasMore: true, loaded: false },
    following: { posts: [], cursor: null, hasMore: true, loaded: false },
  });
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const fetchInFlightRef = useRef(false);
  const loadPausedUntilRef = useRef(0);
  const feedsRef = useRef(feeds);
  useEffect(() => {
    feedsRef.current = feeds;
  }, [feeds]);
  const { socket } = useSocket();

  const current = feeds[tab];

  // Persist active tab
  useEffect(() => {
    sessionStorage.setItem("home-active-tab", tab);
  }, [tab]);

  const handleTabChange = (newTab) => {
    sessionStorage.setItem(scrollKeyForTab(tab), String(window.scrollY));
    setTab(newTab);
  };

  // Restore scroll position — feeds is now declared above so this is safe
  useEffect(() => {
    const key = scrollKeyForTab(tab);
    const saved = sessionStorage.getItem(key);
    if (!saved || Number(saved) === 0) return;
    const y = Number(saved);
    const timer = setTimeout(() => {
      window.scrollTo({ top: y, behavior: "instant" });
    }, 100);
    return () => clearTimeout(timer);
  }, [tab, feeds[tab].loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save scroll on page hide / browser back
  useEffect(() => {
    const save = () => {
      sessionStorage.setItem(scrollKeyForTab(tab), String(window.scrollY));
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
    };
  }, [tab]);

  const fetchPosts = useCallback(
    async (targetTab, afterCursor, isFirstPage, { silent = false } = {}) => {
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
      try {
        if (isFirstPage && !silent) setLoading(true);
        else if (!isFirstPage) setIsLoadingMore(true);

        const params =
          targetTab === "forYou"
            ? {
                limit: 10,
                ...(afterCursor ? { excludeIds: afterCursor } : {}),
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
            nextPosts = res.data.posts;
          } else {
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
        if (!isFirstPage) {
          toast.error("Couldn't load more posts. Try again.");
          loadPausedUntilRef.current = Date.now() + 5_000;
        }
      } finally {
        if (isFirstPage && !silent) setLoading(false);
        else if (!isFirstPage) setIsLoadingMore(false);
        fetchInFlightRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!feeds[tab].loaded) fetchPosts(tab, null, true, { silent: false });
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useRefetchOnFocus(() => fetchPosts(tab, null, true, { silent: true }));

  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          current.hasMore &&
          !isLoadingMore &&
          !loading &&
          Date.now() > loadPausedUntilRef.current
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

    const handleScheduledPublished = () => {
      fetchPosts("following", null, true, { silent: true });
    };
    socket.on("scheduledPostPublished", handleScheduledPublished);

    return () => {
      socket.off("newPost", handleNewPost);
      socket.off("scheduledPostPublished", handleScheduledPublished);
    };
  }, [socket, fetchPosts]);

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
            fetchPosts("following", null, true, { silent: true });
          }}
        />

        <TrendingHashtagsWidget />

        <div className="flex border-b border-stroke">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
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
              isPromoted={post.isPromoted === true}
              promotionReference={post.promotionReference ?? null}
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
