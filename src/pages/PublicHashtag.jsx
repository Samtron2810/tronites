import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PublicPostCard from "../components/PublicPostCard";
import SeoHead from "../components/SeoHead";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import { FiHash, FiArrowLeft, FiLoader } from "react-icons/fi";
import { useSsrInitialData } from "../hooks/useSsrInitialData";

// A hashtag page with fewer than this many total public posts is
// considered too thin to be worth indexing (plan §5: "Add noindex for
// empty, thin or low-quality hashtag pages"). The backend only computes
// totalCount on the first page (see publicHashtagController's comment),
// so this only ever applies on initial load.
const THIN_PAGE_THRESHOLD = 3;

const PublicHashtag = () => {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();

  // See PublicProfile.jsx's comment on useSsrInitialData for the full
  // server/client handoff explanation.
  const initial = useSsrInitialData();

  const [posts, setPosts] = useState(initial?.posts || []);
  const [totalCount, setTotalCount] = useState(initial?.totalCount ?? null);
  const [cursor, setCursor] = useState(initial?.nextCursor || null);
  const [hasMore, setHasMore] = useState(Boolean(initial?.hasMore));
  const [loading, setLoading] = useState(!initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initial) return;

    let cancelled = false;
    setLoading(true);
    setError(false);
    setPosts([]);
    setCursor(null);

    (async () => {
      try {
        const res = await api.get(`/public/hashtags/${tag}`, {
          params: { limit: 10 },
          skipAuthRefresh: true,
        });
        if (cancelled) return;
        setPosts(res.data.posts || []);
        setHasMore(Boolean(res.data.hasMore));
        setCursor(res.data.nextCursor);
        setTotalCount(res.data.totalCount ?? null);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tag]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get(`/public/hashtags/${tag}`, {
        params: { limit: 10, before: cursor },
        skipAuthRefresh: true,
      });
      setPosts((prev) => [...prev, ...(res.data.posts || [])]);
      setHasMore(Boolean(res.data.hasMore));
      setCursor(res.data.nextCursor);
    } catch {
      // Silent — same reasoning as PublicProfile's loadMore.
    } finally {
      setLoadingMore(false);
    }
  }, [tag, cursor, hasMore, loadingMore]);

  const promptLogin = useCallback(() => navigate("/login"), [navigate]);

  const isThin = totalCount !== null && totalCount < THIN_PAGE_THRESHOLD;

  return (
    <MainLayout>
      <SeoHead
        title={`#${tag}`}
        description={`Posts tagged #${tag} on Tronites.`}
        canonical={`/hashtag/${tag}`}
        robots={isThin ? "noindex, follow" : "index, follow"}
      />

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="text-ink-muted hover:text-ink transition"
        >
          <FiArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <FiHash size={18} className="text-primary-600 shrink-0" />
          <h1 className="font-bold text-lg text-ink truncate">{tag}</h1>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <FiLoader className="animate-spin text-primary-500" size={22} />
        </div>
      )}

      {!loading && error && (
        <div className="bg-card border border-stroke rounded-2xl p-8 text-center">
          <p className="text-ink-muted text-sm">
            Something went wrong loading this hashtag. Try again shortly.
          </p>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="bg-card border border-stroke rounded-2xl p-8 text-center">
          <p className="text-ink-muted text-sm">No public posts tagged #{tag} yet.</p>
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

export default PublicHashtag;
