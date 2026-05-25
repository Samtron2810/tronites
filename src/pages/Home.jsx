import { useEffect, useState, useRef } from "react";
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

  // Fetch Posts
  const fetchPosts = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const res = await api.get(`/posts/feed?page=${pageNum}&limit=10`);

      if (pageNum === 1) {
        setPosts(res.data.posts);
      } else {
        setPosts((prev) => [...prev, ...res.data.posts]);
      }

      setHasMore(pageNum < res.data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.log(error);
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !loading
        ) {
          fetchPosts(page + 1);
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [page, hasMore, isLoadingMore, loading]);

  const { socket } = useSocket();

  useEffect(() => {
    fetchPosts(1);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewPost = (newPost) => {
        // Prepend new post in followers' feeds in real-time (prevent duplicates)
        setPosts((prev) => {
          if (prev.some((p) => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
      };

      socket.on("newPost", handleNewPost);

      return () => {
        // Clean up socket listener
        socket.off("newPost", handleNewPost);
      };
    }
  }, [socket]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Create Post */}
        <CreatePost fetchPosts={fetchPosts} />

        {/* Loading Skeletons */}
        {loading && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {/* Feed */}
        {!loading &&
          posts.map((post) => (
            <PostCard
              key={post._id}
              postId={post._id}
              userId={post.user._id}
              name={post.user.name}
              profilePic={post.user.profilePic}
              time={new Date(post.createdAt).toLocaleString()}
              text={post.text}
              image={post.image}
              likes={post.likes.length}
              commentsCount={post.commentsCount}
              isLiked={post.isLiked}
              onDelete={(id) =>
                setPosts((prev) => prev.filter((p) => p._id !== id))
              }
            />
          ))}

        {/* Empty Feed */}
        {!loading && posts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800">
              Your feed is empty
            </h2>

            <p className="text-gray-500 mt-2">
              Follow users to start seeing posts.
            </p>
          </div>
        )}

        {/* Load More Trigger */}
        <div ref={observerTarget} className="py-8 text-center">
          {isLoadingMore && (
            <p className="text-gray-500">Loading more posts...</p>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-gray-400">No more posts to load</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
