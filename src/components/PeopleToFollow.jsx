import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

const MAX_PEOPLE = 4;

// "People to follow" rail card. Uses the same endpoint as Explore's empty
// search (GET /users/search?q= → ranked who-to-follow) and the same follow
// endpoint (PUT /users/follow/:id, which toggles).
const PeopleToFollow = () => {
  const { user: me } = useAuth();
  const [people, setPeople] = useState(null);
  const [following, setFollowing] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getCached("/users/search", {
        params: { q: "", page: 1, limit: MAX_PEOPLE + 2 },
        ttlMs: 60_000,
        revalidate: true,
      })
      .then((res) => {
        if (cancelled) return;
        const list = (res.data?.users || [])
          .filter((u) => u._id !== me?._id)
          .slice(0, MAX_PEOPLE);
        setPeople(list);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setPeople([]);
      });
    return () => {
      cancelled = true;
    };
  }, [me?._id]);

  const toggleFollow = async (id) => {
    if (busyId) return;
    setBusyId(id);
    const was = following.has(id);
    const flip = (on) =>
      setFollowing((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
    flip(!was); // optimistic
    try {
      const res = await api.put(`/users/follow/${id}`);
      flip(Boolean(res.data?.following)); // trust the server
      api.invalidateMany(["/users/search", "/posts/feed", "/posts/for-you"]);
    } catch (e) {
      console.error(e);
      flip(was);
      toast.error("Couldn't update follow status. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  if (people && people.length === 0) return null;

  return (
    <section aria-label="People to follow">
      <h2 className="mono-label border-b-2 border-line pb-2">
        People to follow
      </h2>

      {people === null ? (
        <div className="space-y-3 pt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-sand" />
          ))}
        </div>
      ) : (
        <ul className="border-b-2 border-line">
          {people.map((p) => {
            const isFollowing = following.has(p._id);
            return (
              <li
                key={p._id}
                className="flex items-center gap-3 border-b border-dotted border-line/50 py-3 last:border-b-0"
              >
                <Link to={`/profile/${p._id}`} className="shrink-0">
                  <img
                    src={
                      resizedImageUrl(p.profilePic, IMAGE_SIZES.avatarSmall) ||
                      defaultAvatar
                    }
                    alt=""
                    className="h-10 w-10 rounded-lg border-2 border-line object-cover"
                  />
                </Link>
                <Link to={`/profile/${p._id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold leading-tight text-ink">
                    {p.name}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-ink-muted">
                    @{p.username}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFollow(p._id)}
                  disabled={busyId === p._id}
                  aria-pressed={isFollowing}
                  className={`shrink-0 rounded border-[1.5px] border-line px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition disabled:opacity-60 ${
                    isFollowing
                      ? "bg-ink text-surface"
                      : "bg-transparent text-ink hover:bg-ink hover:text-surface"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default PeopleToFollow;
