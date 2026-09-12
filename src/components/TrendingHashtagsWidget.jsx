import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiHash, FiTrendingUp, FiMapPin, FiGlobe } from "react-icons/fi";
import api from "../services/api";
import { useAuth } from "../context/useAuth";

const TTL_MS = 5 * 60 * 1000;

// Per-scope cache: global and per-location
const cache = new Map(); // key → { tags, at }

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry.tags;
};

const TrendingHashtagsWidget = () => {
  const { user } = useAuth();
  // Feature 4 — "near you" toggle. Default to location-aware when user has location set.
  const userLocation = user?.location || "";
  const [nearMode, setNearMode] = useState(Boolean(userLocation));
  const [tags, setTags] = useState(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const cacheKey = nearMode && userLocation ? `near:${userLocation.toLowerCase()}` : "global";

  useEffect(() => {
    const cached = getCached(cacheKey);
    if (cached) {
      setTags(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const params = { limit: 12 };
    if (nearMode && userLocation) params.near = userLocation;

    api
      .get("/posts/trending-hashtags", { params })
      .then((res) => {
        cache.set(cacheKey, { tags: res.data, at: Date.now() });
        if (!cancelled) {
          setTags(res.data);
          setFailed(false);
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [cacheKey, nearMode, userLocation]);

  if (failed) return null;

  return (
    <div className="bg-card border border-stroke rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <FiTrendingUp size={14} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
            Trending
          </h2>
        </div>
        {/* Feature 4 — toggle only shown when user has location set */}
        {userLocation && (
          <div className="flex items-center bg-surface rounded-lg p-0.5 border border-stroke">
            <button
              type="button"
              onClick={() => setNearMode(false)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition ${
                !nearMode ? "bg-card text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              <FiGlobe size={10} />
              Global
            </button>
            <button
              type="button"
              onClick={() => setNearMode(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition ${
                nearMode ? "bg-card text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              <FiMapPin size={10} />
              Near you
            </button>
          </div>
        )}
      </div>

      {/* Location label */}
      {nearMode && userLocation && (
        <p className="text-[11px] text-ink-muted mb-2 flex items-center gap-1">
          <FiMapPin size={10} className="text-primary-600" />
          {userLocation}
        </p>
      )}

      {loading && tags === null ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shrink-0 h-7 w-20 rounded-full bg-surface animate-pulse" />
          ))}
        </div>
      ) : tags === null || tags.length === 0 ? (
        nearMode ? (
          <p className="text-xs text-ink-muted py-1">
            No trending hashtags found near {userLocation}.
          </p>
        ) : null
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5">
          {tags.map(({ tag, postCount }) => (
            <Link
              key={tag}
              to={`/hashtag/${tag}`}
              className="shrink-0 flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 hover:bg-primary-100 transition"
            >
              <FiHash size={12} className="shrink-0" />
              <span className="text-sm font-semibold">{tag}</span>
              <span className="text-xs text-primary-500">{postCount}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingHashtagsWidget;
