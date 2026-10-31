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

// variant: "chips" (horizontal scroller, inline in the feed on small screens)
//          "list"  (numbered "Trending now" list for the right rail)
const TrendingHashtagsWidget = ({ variant = "chips" }) => {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- TTL-cache fast path; the fetch below covers a miss.
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

  const isList = variant === "list";

  // Global / Near-you switch — only offered when the user has a location.
  const scopeToggle = userLocation && (
    <div className="seg">
      <button
        type="button"
        aria-pressed={!nearMode}
        onClick={() => setNearMode(false)}
        className="seg-item flex items-center gap-1 px-2 py-1 text-[10px]"
      >
        <FiGlobe size={10} />
        Global
      </button>
      <button
        type="button"
        aria-pressed={nearMode}
        onClick={() => setNearMode(true)}
        className="seg-item flex items-center gap-1 px-2 py-1 text-[10px]"
      >
        <FiMapPin size={10} />
        Near you
      </button>
    </div>
  );

  const emptyNear =
    nearMode && userLocation ? (
      <p className="py-1 text-xs text-ink-muted">
        No trending hashtags found near {userLocation}.
      </p>
    ) : null;

  const locationLabel = nearMode && userLocation && (
    <p className="mb-2 flex items-center gap-1 text-[11px] text-ink-muted">
      <FiMapPin size={10} className="text-primary-600" />
      {userLocation}
    </p>
  );

  // ── Right-rail list: big green numerals, dotted dividers ───────────────
  if (isList) {
    return (
      <section aria-label="Trending now">
        <div className="flex items-center justify-between gap-2 border-b-2 border-line pb-2">
          <h2 className="mono-label">
            Trending now
          </h2>
          {scopeToggle}
        </div>
        {locationLabel && <div className="pt-2">{locationLabel}</div>}

        {loading && tags === null ? (
          <div className="space-y-3 pt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-sand" />
            ))}
          </div>
        ) : tags === null || tags.length === 0 ? (
          emptyNear
        ) : (
          <ol className="border-b-2 border-line">
            {tags.slice(0, 5).map(({ tag, postCount }, i) => (
              <li key={tag} className="border-b border-dotted border-line/50 last:border-b-0">
                <Link
                  to={`/hashtag/${tag}`}
                  className="group flex items-center gap-4 py-3"
                >
                  <span className="w-6 font-display text-3xl font-extrabold leading-none text-primary-600">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-ink group-hover:underline">
                    #{tag}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">
                    {postCount}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }

  // ── Inline chips (tablet / phone) ──────────────────────────────────────
  return (
    <div className="card px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FiTrendingUp size={14} className="text-primary-600" />
          <h2 className="mono-label">Trending</h2>
        </div>
        {scopeToggle}
      </div>

      {locationLabel}

      {loading && tags === null ? (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-7 w-20 shrink-0 animate-pulse rounded bg-sand" />
          ))}
        </div>
      ) : tags === null || tags.length === 0 ? (
        emptyNear
      ) : (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {tags.map(({ tag, postCount }) => (
            <Link
              key={tag}
              to={`/hashtag/${tag}`}
              className="flex shrink-0 items-center gap-1 rounded border-[1.5px] border-line bg-surface py-1.5 pl-2 pr-2.5 text-ink transition hover:bg-accent hover:text-[#16140f]"
            >
              <FiHash size={12} className="shrink-0" />
              <span className="font-mono text-[13px] font-medium">{tag}</span>
              <span className="font-mono text-[11px] text-ink-muted">{postCount}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingHashtagsWidget;
