import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import api from "../services/api";
import { FiHash, FiArrowLeft } from "react-icons/fi";

const Hashtag = () => {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

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
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-ink-muted hover:text-ink transition p-2 rounded-lg hover:bg-surface"
          >
            <FiArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <FiHash className="text-primary-600" size={18} />
            <h1 className="text-xl font-bold text-ink">{tag}</h1>
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
              reposts={post.repostsCount}
              isLiked={post.isLiked}
              isBookmarked={post.isBookmarked}
              isReposted={post.isReposted}
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
            <p className="text-3xl mb-2">#ï¸⃣</p>
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
