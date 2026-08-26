import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";

// Thin redirect target for @mention links: /u/:username -> /profile/:id
const UsernameRedirect = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/users/u/${username}`);
        if (!cancelled) navigate(`/profile/${res.data.user._id}`, { replace: true });
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, navigate]);

  if (notFound) {
    toast.error(`@${username} not found`);
    return (
      <div className="min-h-screen app-bg flex items-center justify-center px-6">
        <p className="text-ink-muted text-base">User @{username} not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-6">
      <p className="text-ink-muted text-base">Loading profile...</p>
    </div>
  );
};

export default UsernameRedirect;
