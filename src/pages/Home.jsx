import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import api from "../services/api";
import { useSocket } from "../context/SocketContext";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const { socket } = useSocket();

  const fetchPosts = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);
      const res = await api.get(`/posts/feed?page=${pageNum}&limit=10`);
      if (pageNum === 1) setPosts(res.data.posts);
      else setPosts((prev) => [...prev, ...res.data.posts]);
      setHasMore(pageNum < res.data.totalPages);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
      // Only surface a toast for "load more" failures — the initial load
      // already has an empty-feed message in the UI, so a toast there
      // would be redundant.
      if (pageNum > 1) toast.error("Couldn't load more posts. Try again.");
    }
    finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading)
          fetchPosts(page + 1);
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => { if (observerTarget.current) observer.unobserve(observerTarget.current); };
  }, [page, hasMore, isLoadingMore, loading]);

  useEffect(() => { fetchPosts(1); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewPost = (newPost) => {
      setPosts((prev) => prev.some((p) => p._id === newPost._id) ? prev : [newPost, ...prev]);
    };
    socket.on("newPost", handleNewPost);
    return () => socket.off("newPost", handleNewPost);
  }, [socket]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <CreatePost fetchPosts={() => fetchPosts(1)} />

        {loading && <><PostSkeleton /><PostSkeleton /></>}

        {!loading && posts.map((post) => (
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
            <p className="text-2xl mb-2">👋</p>
            <h2 className="text-base font-semibold text-ink">Your feed is empty</h2>
            <p className="text-sm text-ink-muted mt-1">Follow users to start seeing posts.</p>
          </div>
        )}

        <div ref={observerTarget} className="py-4 text-center">
          {isLoadingMore && <><PostSkeleton /><PostSkeleton /></>}
          {!hasMore && posts.length > 0 && (
            <p className="text-xs text-ink-muted">You're all caught up</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
