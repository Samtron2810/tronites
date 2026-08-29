import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import toast from "react-hot-toast";
import PostCard from "../components/PostCard";
import ProfileSkeleton from "../components/ProfileSkeleton";
import api from "../services/api";
import compressImage from "../utils/compressImage";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/useSocket";
import {
  FiEdit2,
  FiMessageCircle,
  FiCamera,
  FiMoreVertical,
  FiSlash,
  FiFlag,
  FiBellOff,
  FiBell,
  FiSettings,
} from "react-icons/fi";
import BlockUserModal from "../components/BlockUserModal";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import ReportModal from "../components/ReportModal";

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
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const postsObserverTarget = useRef(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get(`/users/profile/${id}?page=1&limit=12`);
      setProfile(res.data.user);
      setPosts(res.data.posts);
      setTotalPosts(res.data.totalPosts);
      setPostsPage(1);
      setPostsHasMore(res.data.hasMore);
      setIsFollowing(res.data.isFollowing);
      if (currentUser?._id !== id) {
        const [blockRes, muteRes] = await Promise.all([
          api.get(`/users/${id}/block-status`),
          api.get(`/users/${id}/mute-status`),
        ]);
        setIBlockedThem(blockRes.data.iBlockedThem);
        setTheyBlockedMe(blockRes.data.theyBlockedMe);
        setIsMuted(muteRes.data.muted);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id, currentUser]);

  const fetchMorePosts = useCallback(async () => {
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
  }, [id, isLoadingMorePosts, postsHasMore, postsPage]);

  // Fetch on mount / when the viewed profile id changes. Data-fetch-in-effect
  // is the documented React pattern; the lint rule flags it because
  // fetchProfile eventually calls setState, but there's no synchronous
  // setState in the effect body itself.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented data-fetch-on-mount pattern; no sync setState in the effect body itself
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const target = postsObserverTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && postsHasMore && !isLoadingMorePosts)
          fetchMorePosts();
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [postsHasMore, isLoadingMorePosts, fetchMorePosts]);

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

  const handleBlockToggle = async () => {
    try {
      if (iBlockedThem) {
        await api.delete(`/users/${id}/block`);
        setIBlockedThem(false);
        toast.success(`Unblocked ${profile.name}`);
      } else {
        await api.post(`/users/${id}/block`);
        setIBlockedThem(true);
        toast.success(`Blocked ${profile.name}`);
      }
      setShowBlockModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update block status. Try again.");
    }
  };

  const handleMuteToggle = async () => {
    try {
      if (isMuted) {
        await api.delete(`/users/${id}/mute`);
        setIsMuted(false);
        toast.success(`Unmuted ${profile.name}`);
      } else {
        await api.post(`/users/${id}/mute`);
        setIsMuted(true);
        toast.success(`Muted ${profile.name}. They won't know.`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update mute status. Try again.");
    }
  };

  const handleReportSubmit = async ({ reason, details }) => {
    try {
      await api.post("/reports", {
        targetType: "user",
        targetId: id,
        reason,
        details,
      });
      toast.success("Report submitted. Thanks for the heads up.");
      setShowReportModal(false);
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't submit report. Try again.",
      );
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
      <div className="bg-card border border-stroke rounded-2xl overflow-hidden">
        {/* Cover strip */}
        <div className="h-24 bg-linear-to-r from-primary-600 to-primary-400" />

        <div className="px-6 pb-6">
          {/* Avatar row — stacks below the avatar under 430px so the
              Follow/Message buttons never squeeze the profile pic. */}
          <div className="flex flex-col items-start gap-3 -mt-10 mb-4 min-[430px]:flex-row min-[430px]:items-end min-[430px]:justify-between">
            <div className="relative">
              <img
                src={
                  resizedImageUrl(
                    profile.profilePic,
                    IMAGE_SIZES.avatarLarge,
                  ) || defaultAvatar
                }
                alt="profile"
                className={`w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-sm ${uploading ? "opacity-50" : ""}`}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* only show this if not own profile */}
              {!isOwnProfile && (
                <span
                  className={`absolute bottom-0 right-0 block h-4 w-4 rounded-full border-2 border-white ${isOnline ? "bg-primary-400" : "bg-gray-300"}`}
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
                    disabled={uploading}
                    onChange={handleProfileUpload}
                  />
                </label>
              )}
            </div>

            {/* Action buttons */}
            {isOwnProfile && (
              <Link
                to="/settings"
                className="self-end p-2 rounded-xl border border-stroke text-ink-muted hover:text-ink hover:bg-surface transition min-[430px]:mt-10"
                aria-label="Settings"
                title="Settings"
              >
                <FiSettings size={18} />
              </Link>
            )}

            {!isOwnProfile && (
              <div className="flex gap-2 relative min-[430px]:mt-10">
                <button
                  onClick={handleFollow}
                  disabled={isFollowingLoading}
                  className={`px-2 py-2 rounded-xl text-base font-semibold transition disabled:opacity-50 ${
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
                  disabled={iBlockedThem || theyBlockedMe}
                  title={
                    iBlockedThem
                      ? "You've blocked this user"
                      : theyBlockedMe
                        ? "You can't message this user"
                        : undefined
                  }
                  className="flex items-center gap-1.5 px-2 py-2 rounded-xl text-base font-semibold border border-stroke text-ink-sub hover:border-primary-400 hover:text-primary-600 transition disabled:opacity-40 disabled:hover:border-stroke disabled:hover:text-ink-sub disabled:cursor-not-allowed"
                >
                  <FiMessageCircle size={14} />
                  Message
                </button>

                {/* More options — kept behind a dropdown so block/unblock
                    isn't a bare tappable button next to Follow/Message. */}
                <button
                  onClick={() => setShowOptionsMenu((v) => !v)}
                  className="p-2 rounded-xl border border-stroke text-ink-muted hover:text-ink hover:bg-surface transition"
                  aria-label="More options"
                >
                  <FiMoreVertical size={16} />
                </button>

                {showOptionsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowOptionsMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-1 w-44 bg-card border border-stroke rounded-xl shadow-lg z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          setShowOptionsMenu(false);
                          handleMuteToggle();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-base text-ink-sub hover:bg-surface transition"
                      >
                        {isMuted ? (
                          <FiBell size={14} />
                        ) : (
                          <FiBellOff size={14} />
                        )}
                        {isMuted ? "Unmute user" : "Mute user"}
                      </button>
                      <button
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setShowReportModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-base text-ink-sub hover:bg-surface transition"
                      >
                        <FiFlag size={14} />
                        Report user
                      </button>
                      <button
                        onClick={() => {
                          setShowOptionsMenu(false);
                          setShowBlockModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-base text-red-500 hover:bg-red-50 transition"
                      >
                        <FiSlash size={14} />
                        {iBlockedThem ? "Unblock user" : "Block user"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {showBlockModal && (
              <BlockUserModal
                userName={profile.name}
                isBlocked={iBlockedThem}
                onConfirm={handleBlockToggle}
                onCancel={() => setShowBlockModal(false)}
              />
            )}

            {showReportModal && (
              <ReportModal
                targetLabel={profile.name}
                onConfirm={handleReportSubmit}
                onCancel={() => setShowReportModal(false)}
              />
            )}
          </div>

          {/* Name + bio */}
          <h1 className="text-2xl font-bold text-ink">{profile.name}</h1>
          {profile.username && (
            <p className="text-base text-ink-muted -mt-0.5">
              @{profile.username}
            </p>
          )}

          {editingBio ? (
            <div className="flex items-center gap-2 mt-2">
              <input
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={150}
                placeholder="Write your bio..."
                className="flex-1 border border-stroke rounded-xl px-3 py-2 text-base text-ink outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
              />
              <button
                onClick={handleBioSave}
                disabled={isSavingBio}
                className="px-3 py-2 rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 transition"
              >
                {isSavingBio ? "..." : "Save"}
              </button>
              <button
                onClick={() => setEditingBio(false)}
                className="text-base text-ink-muted hover:text-ink transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base text-ink-sub">
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
          <div className="flex gap-5 mt-4 text-base">
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
          <div className="bg-card border border-stroke rounded-2xl p-10 text-center">
            <p className="text-base text-ink-muted">No posts yet.</p>
          </div>
        )}
        {posts.map((post) => (
          <PostCard
            key={post._id}
            postId={post._id}
            // For a quote item, post.user is the quoter (this profile
            // owner). For a plain repost, post.user is the ORIGINAL
            // author (not this profile owner) — falling back to
            // profile.* would mislabel the card as authored by the
            // profile owner instead of showing the true original author
            // under the "Reposted" header.
            userId={post.user?._id || profile._id}
            name={post.user?.name || profile.name}
            username={post.user?.username || profile.username}
            profilePic={post.user?.profilePic || profile.profilePic}
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
            // Only set on plain reposts (never on authored posts or
            // quotes — see userController's getUserProfile), so this
            // naturally stays undefined for the owner's own content.
            repostedBy={post.repostedBy}
            isQuotePost={post.isQuotePost}
            quoteOf={post.quoteOf}
            edited={post.edited}
            privacy={post.privacy}
            editedAt={post.editedAt}
            onDelete={(id) => {
              setPosts((prev) => prev.filter((p) => p._id !== id));
              setTotalPosts((prev) => Math.max(prev - 1, 0));
            }}
          />
        ))}
        {postsHasMore && posts.length > 0 && (
          <div ref={postsObserverTarget} className="py-4 text-center">
            {isLoadingMorePosts && (
              <p className="text-sm text-ink-muted">Loading more posts...</p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Profile;
