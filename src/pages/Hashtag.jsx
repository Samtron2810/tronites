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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);

  const fetchPosts = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);
      const res = await api.get(`/posts/hashtag/${tag}?page=${pageNum}&limit=10`);
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
    fetchPosts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading)
          fetchPosts(page + 1);
      },
      { threshold: 0.1 },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [page, hasMore, isLoadingMore, loading]);

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
            <h1 className="text-lg font-bold text-ink">{tag}</h1>
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
              image={post.image}
              images={post.images}
              likes={post.likes.length}
              commentsCount={post.commentsCount}
              isLiked={post.isLiked}
              onDelete={(id) => setPosts((prev) => prev.filter((p) => p._id !== id))}
            />
          ))}

        {!loading && posts.length === 0 && (
          <div className="bg-white border border-stroke rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">#️⃣</p>
            <h2 className="text-base font-semibold text-ink">No posts yet</h2>
            <p className="text-sm text-ink-muted mt-1">
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
            <p className="text-xs text-ink-muted">You're all caught up</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Hashtag;
