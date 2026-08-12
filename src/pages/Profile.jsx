import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import toast from "react-hot-toast";
import PostCard from "../components/PostCard";
import ProfileSkeleton from "../components/ProfileSkeleton";
import api from "../services/api";
import compressImage from "../utils/compressImage";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { FiEdit2, FiMessageCircle, FiCamera } from "react-icons/fi";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const { onlineUsers } = useSocket();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const postsObserverTarget = useRef(null);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/users/profile/${id}?page=1&limit=12`);
      setProfile(res.data.user);
      setPosts(res.data.posts);
      setTotalPosts(res.data.totalPosts);
      setPostsPage(1);
      setPostsHasMore(res.data.hasMore);
      setIsFollowing(res.data.isFollowing);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMorePosts = async () => {
    if (isLoadingMorePosts || !postsHasMore) return;
    try {
      setIsLoadingMorePosts(true);
      const nextPage = postsPage + 1;
      const res = await api.get(
        `/users/profile/${id}?page=${nextPage}&limit=12`,
      );
      setPosts((prev) => [...prev, ...res.data.posts]);
      setPostsPage(nextPage);
      setPostsHasMore(res.data.hasMore);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't load more posts. Try again.");
    } finally {
      setIsLoadingMorePosts(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && postsHasMore && !isLoadingMorePosts)
          fetchMorePosts();
      },
      { threshold: 0.1 },
    );
    if (postsObserverTarget.current)
      observer.observe(postsObserverTarget.current);
    return () => {
      if (postsObserverTarget.current)
        observer.unobserve(postsObserverTarget.current);
    };
  }, [postsPage, postsHasMore, isLoadingMorePosts, id]);

  const handleFollow = async () => {
    if (isFollowingLoading) return;
    setIsFollowingLoading(true);
    try {
      const res = await api.put(`/users/follow/${id}`);
      setIsFollowing(res.data.following);
      // `profile.followers` is an array of populated { _id } objects (see
      // getUserProfile), so keep the shape consistent instead of pushing
      // a raw id string — mixed shapes would break anything downstream
      // that expects follower._id to exist.
      setProfile((prev) => ({
        ...prev,
        followers: res.data.following
          ? [...prev.followers, { _id: currentUser._id }]
          : prev.followers.filter(
              (f) => (f._id || f).toString() !== currentUser._id.toString(),
            ),
      }));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update follow status. Try again.");
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      // Avatars only ever render small — compress client-side so we don't
      // ship full-resolution camera photos (up to 10MB) over the wire.
      const compressed = await compressImage(file, {
        maxWidth: 512,
        quality: 0.8,
        skipBelowBytes: 150 * 1024,
      });
      const formData = new FormData();
      formData.append("image", compressed);
      const res = await api.put("/users/profile-picture", formData);
      setProfile((prev) => ({ ...prev, profilePic: res.data.profilePic }));
      updateUser({ profilePic: res.data.profilePic });
      toast.success("Profile picture updated!");
    } catch (e) {
      console.error(e);
      toast.error(
        e?.response?.data?.message || "Failed to update profile picture.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleBioSave = async () => {
    if (bioText.trim() === (profile.bio || "")) {
      setEditingBio(false);
      return;
    }
    if (isSavingBio) return;
    setIsSavingBio(true);
    try {
      const res = await api.put("/users/bio", { bio: bioText });
      setProfile((prev) => ({ ...prev, bio: res.data.bio }));
      setEditingBio(false);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save bio. Try again.");
    } finally {
      setIsSavingBio(false);
    }
  };

  if (!currentUser) return <ProfileSkeleton />;
  if (!profile) return <ProfileSkeleton />;

  const isOwnProfile = currentUser?._id === profile?._id;
  const isOnline = onlineUsers.includes(profile._id);

  return (
    <MainLayout>
      {/* Profile card */}
      <div className="bg-white border border-stroke rounded-2xl overflow-hidden">
        {/* Cover strip */}
        <div className="h-24 bg-linear-to-r from-primary-600 to-primary-400" />

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <img
                src={profile.profilePic || "https://i.pravatar.cc/"}
                alt="profile"
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-sm"
              />
              {/* only show this if not own profile */}
              {!isOwnProfile && (
                <span
                  className={`absolute bottom-1 right-1 block h-3 w-3 rounded-full border-2 border-white ${isOnline ? "bg-primary-400" : "bg-gray-300"}`}
                  title={isOnline ? "Online" : "Offline"}
                />
              )}
              {isOwnProfile && (
                <label className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-lg p-1 cursor-pointer hover:bg-primary-800 transition shadow">
                  <FiCamera size={11} />
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleProfileUpload}
                  />
                </label>
              )}
            </div>

            {/* Action buttons */}

            {!isOwnProfile && (
              <div className="flex gap-2 mt-10">
                <button
                  onClick={handleFollow}
                  disabled={isFollowingLoading}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
                    isFollowing
                      ? "bg-surface border border-stroke text-ink-sub hover:border-red-300 hover:text-red-500"
                      : "bg-primary-600 text-white hover:bg-primary-800"
                  }`}
                >
                  {isFollowingLoading
                    ? "..."
                    : isFollowing
                      ? "Following"
                      : "Follow"}
                </button>
                <button
                  onClick={() => navigate(`/chat?user=${profile._id}`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-stroke text-ink-sub hover:border-primary-400 hover:text-primary-600 transition"
                >
                  <FiMessageCircle size={14} />
                  Message
                </button>
              </div>
            )}
          </div>

          {/* Name + bio */}
          <h1 className="text-xl font-bold text-ink">{profile.name}</h1>

          {editingBio ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={150}
                placeholder="Write your bio..."
                className="flex-1 border border-stroke rounded-xl px-3 py-2 text-sm text-ink outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <button
                onClick={handleBioSave}
                disabled={isSavingBio}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 transition"
              >
                {isSavingBio ? "..." : "Save"}
              </button>
              <button
                onClick={() => setEditingBio(false)}
                className="text-sm text-ink-muted hover:text-ink transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-ink-sub">
                {profile.bio || "No bio yet."}
              </p>
              {isOwnProfile && (
                <button
                  onClick={() => {
                    setBioText(profile.bio || "");
                    setEditingBio(true);
                  }}
                  className="text-ink-muted hover:text-primary-600 transition"
                  title="Edit bio"
                >
                  <FiEdit2 size={13} />
                </button>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-5 mt-4 text-sm">
            <span className="text-ink font-semibold">
              {totalPosts}{" "}
              <span className="text-ink-muted font-normal">Posts</span>
            </span>
            <Link
              to={`/connections/${profile._id}?tab=followers`}
              className="text-ink font-semibold hover:text-primary-600 transition"
            >
              {profile.followers.length}{" "}
              <span className="text-ink-muted font-normal">Followers</span>
            </Link>
            <Link
              to={`/connections/${profile._id}?tab=following`}
              className="text-ink font-semibold hover:text-primary-600 transition"
            >
              {profile.following.length}{" "}
              <span className="text-ink-muted font-normal">Following</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="mt-4 space-y-4">
        {posts.length === 0 && (
          <div className="bg-white border border-stroke rounded-2xl p-10 text-center">
            <p className="text-sm text-ink-muted">No posts yet.</p>
          </div>
        )}
        {posts.map((post) => (
          <PostCard
            key={post._id}
            postId={post._id}
            userId={post.user?._id || profile._id}
            name={profile.name}
            profilePic={profile.profilePic}
            time={new Date(post.createdAt).toLocaleString()}
            text={post.text}
            image={post.image}
            images={post.images}
            likes={post.likes.length}
            commentsCount={post.commentsCount}
            isLiked={post.likes.some(
              (id) => id.toString() === currentUser?._id,
            )}
            onDelete={(id) => {
              setPosts((prev) => prev.filter((p) => p._id !== id));
              setTotalPosts((prev) => Math.max(prev - 1, 0));
            }}
          />
        ))}
        {postsHasMore && posts.length > 0 && (
          <div ref={postsObserverTarget} className="py-4 text-center">
            {isLoadingMorePosts && (
              <p className="text-xs text-ink-muted">Loading more posts...</p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
