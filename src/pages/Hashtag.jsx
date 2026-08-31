import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import api from "../services/api";
import { FiHash, FiArrowLeft, FiBell, FiBellOff } from "react-icons/fi";

const Hashtag = () => {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  // 2.3 — follow hashtags. Loaded independently of the post list (a
  // separate, cheap GET) so a slow post-page fetch never blocks the
  // follow button from rendering its real state.
  const [isFollowingTag, setIsFollowingTag] = useState(false);
  const [followLoaded, setFollowLoaded] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const fetchPosts = async (afterCursor, isFirstPage) => {
    try {
      if (isFirstPage) setLoading(true);
      else setIsLoadingMore(true);
      const res = await api.get(`/posts/hashtag/${tag}`, {
        params: { limit: 10, ...(afterCursor ? { before: afterCursor } : {}) },
      });
      if (isFirstPage) setPosts(res.data.posts);
      else setPosts((prev) => [...prev, ...res.data.posts]);
      setHasMore(res.data.hasMore);
      setCursor(res.data.nextCursor);
    } catch (e) {
      console.error(e);
      if (!isFirstPage) toast.error("Couldn't load more posts. Try again.");
    } finally {
      if (isFirstPage) setLoading(false);
      else setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/tag-change
    fetchPosts(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  useEffect(() => {
    let cancelled = false;
    setFollowLoaded(false);
    api
      .get("/posts/hashtag-follows")
      .then((res) => {
        if (cancelled) return;
        setIsFollowingTag(res.data.tags.includes(tag.toLowerCase()));
        setFollowLoaded(true);
      })
      .catch((e) => {
        console.error(e);
        // Silent — the button just falls back to "Follow" until the
        // next successful load; not worth a toast for a background
        // state check.
        if (!cancelled) setFollowLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tag]);

  const handleToggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    const previous = isFollowingTag;
    // Optimistic — this is a low-stakes personal preference toggle, not
    // an action with a visible side effect on other users, so instant
    // feedback matters more than waiting for the round trip.
    setIsFollowingTag(!previous);
    try {
      const res = await api.put(`/posts/hashtag-follows/${tag}`);
      setIsFollowingTag(res.data.following);
    } catch (e) {
      console.error(e);
      setIsFollowingTag(previous);
      toast.error("Couldn't update. Try again.");
    } finally {
      setFollowBusy(false);
    }
  };

  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading)
          fetchPosts(cursor, false);
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hasMore, isLoadingMore, loading]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="text-ink-muted hover:text-ink transition p-2 rounded-lg hover:bg-surface shrink-0"
            >
              <FiArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <FiHash className="text-primary-600 shrink-0" size={18} />
              <h1 className="text-xl font-bold text-ink truncate">{tag}</h1>
            </div>
          </div>

          {/* 2.3 — this is the signal that feeds For You's "interest"
              source (see backend services/forYouService.js), so
              following a tag here has a real downstream effect on the
              home feed, not just this page. */}
          <button
            onClick={handleToggleFollow}
            disabled={!followLoaded || followBusy}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              isFollowingTag
                ? "bg-surface border border-stroke text-ink-sub hover:border-red-300 hover:text-red-500"
                : "bg-primary-600 text-white hover:bg-primary-800"
            }`}
          >
            {isFollowingTag ? (
              <>
                <FiBellOff size={13} />
                Following
              </>
            ) : (
              <>
                <FiBell size={13} />
                Follow
              </>
            )}
          </button>
        </div>

        {loading && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {!loading &&
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

        {!loading && posts.length === 0 && (
          <div className="bg-card border border-stroke rounded-2xl p-10 text-center">
            <p className="text-3xl mb-2">#ï¸⃣</p>
            <h2 className="text-lg font-semibold text-ink">No posts yet</h2>
            <p className="text-base text-ink-muted mt-1">
              Nobody's posted with #{tag} yet.
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
          {!hasMore && posts.length > 0 && (
            <p className="text-sm text-ink-muted">You're all caught up</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Hashtag;
