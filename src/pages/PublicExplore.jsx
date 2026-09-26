import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PublicPostCard from "../components/PublicPostCard";
import SeoHead from "../components/SeoHead";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import { FiCompass, FiLoader } from "react-icons/fi";
import { useSsrInitialData } from "../hooks/useSsrInitialData";

const PublicExplore = () => {
  const navigate = useNavigate();
  const { user: viewer } = useAuth();

  // See PublicProfile.jsx's comment on useSsrInitialData for the full
  // server/client handoff explanation.
  const initial = useSsrInitialData();

  const [posts, setPosts] = useState(initial?.posts || []);
  const [cursor, setCursor] = useState(initial?.nextCursor || null);
  const [hasMore, setHasMore] = useState(Boolean(initial?.hasMore));
  const [loading, setLoading] = useState(!initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initial) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/public/explore", {
          params: { limit: 12 },
          skipAuthRefresh: true,
        });
        if (cancelled) return;
        setPosts(res.data.posts || []);
        setHasMore(Boolean(res.data.hasMore));
        setCursor(res.data.nextCursor || null);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await api.get("/public/explore", {
        params: { limit: 12, afterScore: cursor.afterScore, afterId: cursor.afterId },
        skipAuthRefresh: true,
      });
      setPosts((prev) => [...prev, ...(res.data.posts || [])]);
      setHasMore(Boolean(res.data.hasMore));
      setCursor(res.data.nextCursor || null);
    } catch {
      // Silent — same reasoning as the other public pages' loadMore.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

  const promptLogin = useCallback(() => navigate("/login"), [navigate]);

  return (
    <MainLayout>
      <SeoHead
        title="Explore"
        description="Discover trending posts and creators on Tronites."
        canonical="/explore"
      />

      <div className="flex items-center gap-2 mb-4">
        <FiCompass size={18} className="text-primary-600" />
        <h1 className="font-bold text-lg text-ink">Explore</h1>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <FiLoader className="animate-spin text-primary-500" size={22} />
        </div>
      )}

      {!loading && error && (
        <div className="bg-card border border-stroke rounded-2xl p-8 text-center">
          <p className="text-ink-muted text-sm">
            Something went wrong loading Explore. Try again shortly.
          </p>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="bg-card border border-stroke rounded-2xl p-8 text-center">
          <p className="text-ink-muted text-sm">Nothing trending yet — check back soon.</p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <PublicPostCard key={post._id} post={post} onRequireLogin={promptLogin} />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl border border-stroke hover:bg-surface text-ink-muted font-medium text-sm transition disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default PublicExplore;
