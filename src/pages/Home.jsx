import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import PostSkeleton from "../components/PostSkeleton";
import api from "../services/api";
import { useSocket } from "../context/useSocket";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null); // last post _id, or null for first page
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const { socket } = useSocket();

  // isFirstPage distinguishes "reset to the top" (cursor=null on
  // purpose) from "load more" (cursor=null because there's no cursor
  // yet) — both look the same via the cursor value alone.
  const fetchPosts = async (afterCursor, isFirstPage) => {
    try {
      if (isFirstPage) setLoading(true);
      else setIsLoadingMore(true);
      const res = await api.get("/posts/feed", {
        params: { limit: 10, ...(afterCursor ? { before: afterCursor } : {}) },
      });
      if (isFirstPage) setPosts(res.data.posts);
      else setPosts((prev) => [...prev, ...res.data.posts]);
      setHasMore(res.data.hasMore);
      setCursor(res.data.nextCursor);
    } catch (e) {
      console.error(e);
      // Only surface a toast for "load more" failures — the initial load
      // already has an empty-feed message in the UI, so a toast there
      // would be redundant.
      if (!isFirstPage) toast.error("Couldn't load more posts. Try again.");
    } finally {
      if (isFirstPage) setLoading(false);
      else setIsLoadingMore(false);
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
  }, [cursor, hasMore, isLoadingMore, loading]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    fetchPosts(null, true);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewPost = (newPost) => {
      setPosts((prev) =>
        prev.some((p) => p._id === newPost._id) ? prev : [newPost, ...prev],
      );
    };
    socket.on("newPost", handleNewPost);
    return () => socket.off("newPost", handleNewPost);
  }, [socket]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <CreatePost fetchPosts={() => fetchPosts(null, true)} />

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
            />
          ))}

        {!loading && posts.length === 0 && (
          <div className="bg-white border border-stroke rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">👋</p>
            <h2 className="text-base font-semibold text-ink">
              Your feed is empty
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              Follow users to start seeing posts.
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

export default Home;
