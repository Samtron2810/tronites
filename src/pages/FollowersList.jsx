import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import UserCardSkeleton from "../components/UserCardSkeleton";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const FollowersList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  const activeTab = searchParams.get("tab") || "followers";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");

  const fetchConnectionsList = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === "followers" ? "followers" : "following";
      const res = await api.get(`/users/${endpoint}/${id}`);
      setUsers(res.data);
    } catch (error) {
      console.error(error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileName = async () => {
    try {
      const res = await api.get(`/users/profile/${id}`);
      setProfileName(res.data.user.name);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProfileName();
  }, [id]);

  useEffect(() => {
    fetchConnectionsList();
  }, [id, activeTab]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <MainLayout>
      <div className="bg-white rounded-2xl shadow-md p-2">
        {/* centerized Header */}
        <h4 className="text-xl font-bold text-ink mb-6 text-center">
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
            users.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between px-4 py-2 mb-1 border border-stroke rounded-lg hover:border-primary-200 transition cursor-pointer"
                onClick={() => navigate(`/profile/${user._id}`)}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={user.profilePic || "https://i.pravatar.cc/"}
                    alt={user.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink truncate">
                      {user.name}
                    </h3>
                    <p className="text-xs text-ink-muted truncate">
                      {user.bio || "No bio yet."}
                    </p>
                  </div>
                </div>
              </div>
            ))
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
