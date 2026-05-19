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
      const res = await api.get("/posts");

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

        {/* Loading */}
        {loading && (
          <>
            <PostSkeleton />
            <br />
            <PostSkeleton />
          </>
        )}

        {/* Feed */}
        {!loading &&
          posts.map((post) => (
            <PostCard
              key={post._id}
              postId={post._id}
              name={post.user.name}
              time={new Date(post.createdAt).toLocaleString()}
              text={post.text}
              image={post.image}
              likes={post.likes.length}
              commentsCount={post.commentsCount}
              isLiked={post.isLiked}
            />
          ))}
      </div>
    </MainLayout>
  );
};

export default Home;
