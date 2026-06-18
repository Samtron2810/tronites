import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import toast from "react-hot-toast";

import PostCard from "../components/PostCard";
import ProfileSkeleton from "../components/ProfileSkeleton";

import api from "../services/api";

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // const { user: currentUser } = useAuth();
  const { user: currentUser, updateUser } = useAuth();

  // ✅ ALL hooks must be here, before any early returns
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isFollowing_Loading, setIsFollowing_Loading] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);

  const { onlineUsers } = useSocket();

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/users/profile/${id}`);
      setProfile(res.data.user);
      setPosts(res.data.posts);
      setIsFollowing(res.data.isFollowing);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  // Follow toggle
  const handleFollow = async () => {
    if (isFollowing_Loading) return;

    setIsFollowing_Loading(true);
    try {
      const res = await api.put(`/users/follow/${id}`);

      setIsFollowing(res.data.following);

      // update follower count instantly
      setProfile((prev) => ({
        ...prev,

        followers: res.data.following
          ? [...prev.followers, currentUser._id]
          : prev.followers.filter(
              (follower) =>
                (follower._id || follower).toString() !==
                currentUser._id.toString(),
            ),
      }));
    } catch (error) {
      console.log(error);
    } finally {
      setIsFollowing_Loading(false);
    }
  };

  //HANDLE PROFILE UPLOAD
  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append("image", file);

      const res = await api.put("/users/profile-picture", formData);

      setProfile((prev) => ({
        ...prev,
        profilePic: res.data.profilePic,
      }));

      // Update the current user's profile picture in context
      updateUser({ profilePic: res.data.profilePic });
      toast.success("Profile picture updated!");
    } catch (error) {
      console.log(error);
    } finally {
      setUploading(false);
    }
  };

  //HANDLE BIO UPDATE
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
    } catch (error) {
      console.log(error);
    } finally {
      setIsSavingBio(false);
    }
  };

  // ✅ Early returns AFTER hooks
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-orange-400 animate-pulse">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-full bg-gray-300"></div>
                <div>
                  <div className="h-6 bg-gray-300 rounded w-40"></div>
                  <div className="h-4 bg-gray-200 rounded w-56 mt-2"></div>
                  <div className="flex gap-6 mt-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
              <div className="w-28 h-10 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 mt-2"></div>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="mt-5 h-64 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <ProfileSkeleton />;
  }

  const isOwnProfile = currentUser?._id === profile?._id;

  return (
    <MainLayout>
      <div className="bg-white rounded-2xl shadow-md p-6">
        {/* Top */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className={editingBio ? "hidden" : "relative"}>
              <img
                src={profile.profilePic || "https://i.pravatar.cc/"}
                alt="profile"
                className="w-24 h-24 rounded-full object-cover border"
              />

              <span
                className={`absolute bottom-1 right-1 block h-3.5 w-3.5 rounded-full border-2 border-white ${
                  onlineUsers.includes(profile._id)
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
                title={onlineUsers.includes(profile._id) ? "Online" : "Offline"}
              />

              {/* Upload Button */}
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-lg cursor-pointer">
                  {uploading ? "..." : "Edit"}

                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleProfileUpload}
                  />
                </label>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.name}
              </h1>

              {/* BIO DISPLAY AND EDITING */}
              {editingBio ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    maxLength={150}
                    placeholder="Write your bio..."
                    className="border rounded-lg px-3 py-1 text-sm outline-none w-64"
                  />
                  <button
                    onClick={handleBioSave}
                    disabled={isSavingBio}
                    className={`text-sm text-white px-3 py-1 rounded-lg transition ${
                      isSavingBio
                        ? "bg-blue-400 opacity-70 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isSavingBio ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingBio(false)}
                    className="text-sm text-gray-500 hover:text-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-600">
                    {profile.bio || "No bio yet."}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => {
                        setBioText(profile.bio || "");
                        setEditingBio(true);
                      }}
                      className="text-xs bg-blue-400 hover:bg-blue-500 text-white p-1 rounded-lg transition cursor-pointer"
                    >
                      {profile.bio ? "Edit bio" : "+ Add bio"}
                    </button>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-6 mt-4 text-sm text-gray-700">
                <p>
                  <span className="font-bold">{posts.length}</span> Posts
                </p>

                <p>
                  <span className="font-bold">{profile.followers.length}</span>{" "}
                  Followers
                </p>

                <p>
                  <span className="font-bold">{profile.following.length}</span>{" "}
                  Following
                </p>
              </div>
            </div>
          </div>

          {/* Follow Button */}
          {!isOwnProfile && (
            <div className="flex gap-3">
              <button
                onClick={handleFollow}
                disabled={isFollowing_Loading}
                className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                  isFollowing_Loading
                    ? isFollowing
                      ? "bg-gray-500 opacity-70 cursor-not-allowed"
                      : "bg-blue-400 opacity-70 cursor-not-allowed"
                    : isFollowing
                      ? "bg-gray-600 hover:bg-gray-700"
                      : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isFollowing_Loading
                  ? "Loading..."
                  : isFollowing
                    ? "Following"
                    : "Follow"}
              </button>
              <button
                onClick={() => navigate(`/chat?user=${profile._id}`)}
                className="px-6 py-2 rounded-lg font-semibold bg-green-500 hover:bg-green-600 text-white transition"
              >
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Posts */}
      <div className="mt-6 space-y-6">
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
            likes={post.likes.length}
            commentsCount={post.commentsCount}
            isLiked={post.likes.some(
              (id) => id.toString() === currentUser?._id,
            )}
            onDelete={(id) =>
              setPosts((prev) => prev.filter((p) => p._id !== id))
            }
          />
        ))}
      </div>
    </MainLayout>
  );
};

export default Profile;
