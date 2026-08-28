import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiHash, FiTrendingUp } from "react-icons/fi";
import api from "../services/api";

// Compact horizontal-scroll chip row rather than a tall list — this app
// has no sidebar/right-rail layout (single centered column throughout),
// so a vertical "Trending" panel would eat a full screen's height on
// mobile before any actual content appears. A scrollable chip strip
// gives the same discovery value in a fixed ~60px band.
const TrendingHashtagsWidget = () => {
  const [tags, setTags] = useState(null); // null = loading, [] = loaded-empty
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/posts/trending-hashtags", { params: { limit: 12 } })
      .then((res) => {
        if (!cancelled) setTags(res.data);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Silent on failure/empty — this is a discovery accent, not a page a
  // user came to see; an error state here would be more distracting
  // than useful. It simply doesn't render.
  if (failed || tags === null || tags.length === 0) return null;

  return (
    <div className="bg-card border border-stroke rounded-2xl px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <FiTrendingUp size={14} className="text-primary-600" />
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide">
          Trending hashtags
        </h2>
      </div>
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
    </div>
  );
};

export default TrendingHashtagsWidget;
