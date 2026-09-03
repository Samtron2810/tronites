import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import UserCardSkeleton from "../components/UserCardSkeleton";
import VerifiedBadge from "../components/VerifiedBadge";
import api from "../services/api";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

const FollowersList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "followers";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [profileName, setProfileName] = useState("");
  const observerTarget = useRef(null);

  const fetchConnectionsList = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const endpoint = activeTab === "followers" ? "followers" : "following";
      const params = { page: pageNum, limit: 20 };
      const res =
        pageNum === 1
          ? await api.getCached(`/users/${endpoint}/${id}`, { params, ttlMs: Infinity })
          : await api.get(`/users/${endpoint}/${id}`, { params });
      const list = activeTab === "followers" ? res.data.followers : res.data.following;

      if (pageNum === 1) setUsers(list);
      else setUsers((prev) => [...prev, ...list]);

      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error(error);
      if (pageNum === 1) setUsers([]);
      else toast.error("Couldn't load more. Try again.");
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  };

  const fetchProfileName = async () => {
    try {
      const res = await api.getCached(`/users/profile/${id}`, { ttlMs: Infinity });
      setProfileName(res.data.user.name);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    fetchProfileName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/tab-change
    fetchConnectionsList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeTab]);

  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          fetchConnectionsList(page + 1);
        }
      },
      { threshold: 0.1 }
    );
    if (target) observer.observe(target);
    return () => { if (target) observer.unobserve(target); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, isLoadingMore, loading, id, activeTab]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <MainLayout>
      <div className="bg-card rounded-2xl shadow-md p-2">
        {/* centerized Header */}
        <h4 className="text-2xl font-bold text-ink mb-6 text-center">
          {profileName}'s{" "}
          {activeTab === "followers" ? "Followers" : "Following"}
        </h4>

        {/* Toggle Buttons */}
        <div className="flex gap-4 mb-2 border-b">
          <button
            onClick={() => handleTabChange("followers")}
            className={`px-6 py-2 font-semibold transition border-b-2 ${
              activeTab === "followers"
                ? "text-primary-600 border-primary-600"
                : "text-ink-muted border-transparent hover:text-ink"
            }`}
          >
            Followers
          </button>
          <button
            onClick={() => handleTabChange("following")}
            className={`px-6 py-2 font-semibold transition border-b-2 ${
              activeTab === "following"
                ? "text-primary-600 border-primary-600"
                : "text-ink-muted border-transparent hover:text-ink"
            }`}
          >
            Following
          </button>
        </div>

        {/* Users List */}
        <div>
          {loading ? (
            <>
              <UserCardSkeleton />
              <UserCardSkeleton />
              <UserCardSkeleton />
            </>
          ) : users.length > 0 ? (
            <>
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between px-4 py-2 mb-1 border border-stroke rounded-lg hover:border-primary-200 transition cursor-pointer"
                  onClick={() => navigate(`/profile/${user._id}`)}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={resizedImageUrl(user.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
                      alt={user.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100"
                    />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-ink truncate flex items-center gap-1.5">
                        {user.name}
                        <VerifiedBadge verifications={user.verifications} size="sm" />
                      </h3>
                      <p className="text-sm text-ink-muted truncate">
                        {user.bio || "No bio yet."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {hasMore && (
                <div ref={observerTarget} className="py-4 text-center">
                  {isLoadingMore && <p className="text-sm text-ink-muted">Loading more...</p>}
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-ink-muted py-8">
              No {activeTab} yet
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default FollowersList;
