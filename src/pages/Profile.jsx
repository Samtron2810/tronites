import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import PostCard from "../components/PostCard";

import api from "../services/api";

import { useAuth } from "../context/AuthContext";

const Profile = () => {
  const { id } = useParams();
  // const { user: currentUser } = useAuth();
  const { user: currentUser, updateUser } = useAuth();

  // ✅ ALL hooks must be here, before any early returns
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");

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
    try {
      const res = await api.put("/users/bio", { bio: bioText });
      setProfile((prev) => ({ ...prev, bio: res.data.bio }));
      setEditingBio(false);
    } catch (error) {
      console.log(error);
    }
  };

  // ✅ Early returns AFTER hooks
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-orange-400 flex items-center justify-center">
        <h1 className="text-2xl font-bold">Loading user...</h1>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-orange-400 flex items-center justify-center">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </div>
    );
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
                // src={profile.profilePic || "https://via.placeholder.com/150"}
                src={profile.profilePic || "https://i.pravatar.cc/"}
                alt="profile"
                className="w-24 h-24 rounded-full object-cover border"
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
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition"
                  >
                    Save
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
            <button
              onClick={handleFollow}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                isFollowing
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
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
