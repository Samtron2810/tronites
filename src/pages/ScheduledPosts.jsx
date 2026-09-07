import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useRefetchOnFocus } from "../hooks/useRefetchOnFocus";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaClock,
  FaTrash,
  FaPaperPlane,
  FaImage,
  FaVideo,
} from "react-icons/fa";

// Short TTL — scheduled posts are mutable (user can publish/delete them),
// so we keep the local cache very fresh (20 s) and always revalidate on
// focus so the list reflects any action taken in another tab or device.
const SCHEDULED_TTL_MS = 20_000;
const CACHE_PREFIX = "/posts/scheduled";

const formatScheduledTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const timeUntil = (iso) => {
  const diff = new Date(iso) - new Date();
  if (diff <= 0) return "Publishing now…";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
};

const ScheduledPosts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [publishing, setPublishing] = useState(null);

  const fetchPosts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const r = await api.getCached(CACHE_PREFIX, {
        ttlMs: SCHEDULED_TTL_MS,
        revalidate: silent,
      });
      setPosts(r.data.posts || []);
    } catch {
      if (!silent) toast.error("Couldn't load scheduled posts.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Revalidate on focus — catches publishes/deletes from other tabs/devices
  useRefetchOnFocus(() => fetchPosts({ silent: true }));

  const handlePublishNow = async (postId) => {
    setPublishing(postId);
    try {
      await api.delete(`/posts/${postId}/schedule`);
      // Invalidate local cache so next mount gets fresh data
      api.invalidate(CACHE_PREFIX);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      toast.success("Post published!");
    } catch {
      toast.error("Failed to publish.");
    } finally {
      setPublishing(null);
    }
  };

  const handleCancel = async (postId) => {
    setCancelling(postId);
    try {
      await api.delete(`/posts/${postId}`);
      api.invalidate(CACHE_PREFIX);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      toast.success("Scheduled post deleted.");
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setCancelling(null);
    }
  };

  const snippet = (post) => {
    if (post.text?.trim()) return post.text.length > 100 ? post.text.slice(0, 100) + "…" : post.text;
    if (post.images?.length) return null;
    if (post.video?.url) return null;
    return "No content";
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface transition text-ink-muted"
        >
          <FaArrowLeft size={13} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-ink">Scheduled Posts</h1>
          <p className="text-xs text-ink-muted">
            {loading ? "Loading…" : `${posts.length} post${posts.length !== 1 ? "s" : ""} queued`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-card border border-stroke rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-card border border-stroke rounded-2xl p-12 text-center">
          <FaCalendarAlt size={28} className="text-ink-muted mx-auto mb-3" />
          <p className="text-base font-semibold text-ink mb-1">Nothing scheduled</p>
          <p className="text-sm text-ink-muted">
            When you schedule a post it'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post._id}
              className="bg-card border border-stroke rounded-2xl p-4 flex gap-3"
            >
              {/* Media type icon */}
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                {post.video?.url ? (
                  <FaVideo size={14} className="text-primary-600" />
                ) : post.images?.length ? (
                  <FaImage size={14} className="text-primary-600" />
                ) : (
                  <FaCalendarAlt size={14} className="text-primary-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {snippet(post) && (
                  <p className="text-sm text-ink leading-snug mb-1">{snippet(post)}</p>
                )}

                {/* Image thumbnails */}
                {post.images?.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {post.images.slice(0, 3).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="w-12 h-12 object-cover rounded-lg border border-stroke"
                      />
                    ))}
                    {post.images.length > 3 && (
                      <div className="w-12 h-12 rounded-lg bg-surface border border-stroke flex items-center justify-center text-xs font-bold text-ink-muted">
                        +{post.images.length - 3}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <FaClock size={10} />
                  <span className="font-semibold text-primary-600">
                    {timeUntil(post.scheduledFor)}
                  </span>
                  <span>·</span>
                  <span>{formatScheduledTime(post.scheduledFor)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => handlePublishNow(post._id)}
                  disabled={!!publishing}
                  title="Publish now"
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary-600 text-white hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {publishing === post._id ? (
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FaPaperPlane size={11} />
                  )}
                </button>
                <button
                  onClick={() => handleCancel(post._id)}
                  disabled={!!cancelling}
                  title="Delete scheduled post"
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface hover:bg-red-50 text-ink-muted hover:text-red-500 transition disabled:opacity-50"
                >
                  {cancelling === post._id ? (
                    <span className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                  ) : (
                    <FaTrash size={11} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
};

export default ScheduledPosts;
