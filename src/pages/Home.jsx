import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";

import CreatePost from "../components/CreatePost";

import PostCard from "../components/PostCard";

import PostSkeleton from "../components/PostSkeleton";

import api from "../services/api";

const Home = () => {
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  // Fetch Posts
  const fetchPosts = async () => {
    try {
      setLoading(true);

      const res = await api.get("/posts/feed");

      setPosts(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

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
      </div>
    </MainLayout>
  );
};

export default Home;
