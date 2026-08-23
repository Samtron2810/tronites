import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import api from "../services/api";
import { FaRegBookmark } from "react-icons/fa";
import { FiArrowLeft } from "react-icons/fi";

const Bookmarks = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  const fetchBookmarks = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);
      const res = await api.get(`/posts/bookmarks?page=${pageNum}&limit=12`);
      if (pageNum === 1) setPosts(res.data.posts);
      else setPosts((prev) => [...prev, ...res.data.posts]);
      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
      if (pageNum > 1) toast.error("Couldn't load more posts. Try again.");
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    fetchBookmarks(1);
  }, []);

  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading)
          fetchBookmarks(page + 1);
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [page, hasMore, isLoadingMore, loading]);

  // A post can be unbookmarked from within PostCard while viewing this
  // list — remove it locally instead of waiting for a refetch.
  const handleUnbookmarked = (postId) =>
    setPosts((prev) => prev.filter((p) => p._id !== postId));

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-ink-muted hover:text-ink transition p-2 rounded-lg hover:bg-surface"
          >
            <FiArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <FaRegBookmark className="text-primary-600" size={16} />
            <h1 className="text-lg font-bold text-ink">Saved posts</h1>
          </div>
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
              isLiked={post.isLiked}
              isBookmarked={post.isBookmarked}
              edited={post.edited}
              editedAt={post.editedAt}
              onDelete={(id) =>
                setPosts((prev) => prev.filter((p) => p._id !== id))
              }
              onUnbookmark={() => handleUnbookmarked(post._id)}
            />
          ))}

        {!loading && posts.length === 0 && (
          <div className="bg-card border border-stroke rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">🔖</p>
            <h2 className="text-base font-semibold text-ink">
              No saved posts yet
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Tap the bookmark icon on any post to save it here.
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
            <p className="text-xs text-ink-muted">You're all caught up</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Bookmarks;
