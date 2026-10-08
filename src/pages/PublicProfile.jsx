import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import VerifiedBadge from "../components/VerifiedBadge";
import PublicPostCard from "../components/PublicPostCard";
import SeoHead from "../components/SeoHead";
import { buildProfileJsonLd, truncateForDescription } from "../hooks/useSeoMeta";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { FiArrowLeft, FiCalendar, FiLock, FiLoader } from "react-icons/fi";
import { isCreator } from "../utils/creator";
import { useSsrInitialData } from "../hooks/useSsrInitialData";

// Same "Member since Jan 2024" formatting Profile.jsx uses, kept in sync
// deliberately rather than imported — Profile.jsx isn't a shared module,
// it's a page component, and pulling a helper out of a page file to share
// with a second page is a bigger refactor than this slice needs.
const formatJoinDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();

  // The SSR entry (server/render.jsx) pre-fetches this same endpoint and
  // provides the result through SsrDataContext before rendering this
  // page to a string; server/entry-client.jsx then serializes that same
  // value into the page as a <script> tag so the client's Provider seeds
  // its context with an identical value before hydration. Either way —
  // server render or client hydration — this hook returns the SAME
  // value on first render, which is what keeps hydration from mismatching.
  // On a later client-side navigation *to* this same route (e.g. a
  // profile link clicked while already in the app), the context has
  // nothing queued for this path, so this returns null and the normal
  // fetch below runs, exactly as it always has.
  const initial = useSsrInitialData();

  const [state, setState] = useState(
    initial ? { loading: false, error: null, data: initial } : { loading: true, error: null, data: null },
  );
  const [posts, setPosts] = useState(initial?.posts || []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(Boolean(initial?.hasMore));
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // Skip the fetch entirely on the render where SSR data was just
    // consumed — this effect still runs once on mount/hydration
    // regardless, so without this guard it would immediately re-fetch
    // and discard the exact data just used to avoid a loading flash.
    if (initial) return;

    let cancelled = false;
    setState({ loading: true, error: null, data: null });
    setPosts([]);
    setPage(1);

    (async () => {
      try {
        const res = await api.get(`/public/profiles/${username}`, {
          skipAuthRefresh: true,
        });
        if (cancelled) return;
        setState({ loading: false, error: null, data: res.data });
        setPosts(res.data.posts || []);
        setHasMore(Boolean(res.data.hasMore));
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        setState({
          loading: false,
          error: status === 404 ? "not-found" : "error",
          data: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await api.get(`/public/profiles/${username}`, {
        params: { page: nextPage },
        skipAuthRefresh: true,
      });
      setPosts((prev) => [...prev, ...(res.data.posts || [])]);
      setHasMore(Boolean(res.data.hasMore));
      setPage(nextPage);
    } catch {
      // Silent — "load more" failing shouldn't disrupt what's already
      // rendered; the button just stays available to retry.
    } finally {
      setLoadingMore(false);
    }
  }, [username, page, hasMore, loadingMore]);

  const promptLogin = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  // ── loading ──────────────────────────────────────────────────────────
  if (state.loading) {
    return (
      <MainLayout>
        <SeoHead title="Profile" robots="noindex, nofollow" />
        <div className="flex items-center justify-center min-h-[50vh]">
          <FiLoader className="animate-spin text-primary-500" size={22} />
        </div>
      </MainLayout>
    );
  }

  // ── not found ────────────────────────────────────────────────────────
  if (state.error === "not-found") {
    return (
      <MainLayout>
        <SeoHead title="User Not Found" robots="noindex, nofollow" />
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
          <p className="text-ink text-lg font-semibold mb-1">
            @{username} not found
          </p>
          <p className="text-ink-muted text-sm mb-5">
            This account doesn't exist or is no longer available.
          </p>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-800 text-white font-semibold text-sm transition"
          >
            Back to Tronites
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (state.error === "error") {
    return (
      <MainLayout>
        <SeoHead title="Profile" robots="noindex, nofollow" />
        <div className="flex items-center justify-center min-h-[50vh] text-center px-6">
          <p className="text-ink-muted text-sm">
            Something went wrong loading this profile. Try again shortly.
          </p>
        </div>
      </MainLayout>
    );
  }

  const { user: profile, isPrivate, pinnedPosts = [] } = state.data;
  const join = formatJoinDate(profile.createdAt);
  const isOwnProfile = viewer && viewer.username === profile.username;

  return (
    <MainLayout>
      <SeoHead
        title={`${profile.name} (@${profile.username})`}
        description={truncateForDescription(
          profile.bio
            ? `${profile.bio}`
            : `View ${profile.name}'s (@${profile.username}) posts and public profile on Tronites.`,
        )}
        canonical={`/u/${profile.username}`}
        image={profile.profilePic}
        ogType="profile"
        jsonLd={buildProfileJsonLd({
          username: profile.username,
          name: profile.name,
          bio: profile.bio,
          imageUrl: profile.profilePic,
          url: `https://tronites.com/u/${profile.username}`,
          accountType: isCreator(profile) ? "business" : "individual",
        })}
      />

      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={15} />
        Back
      </button>

      {/* ── header ──────────────────────────────────────────────────── */}
      <div className="bg-card border border-stroke rounded-2xl p-5 sm:p-6 mb-5">
        <div className="flex items-start gap-4">
          <img
            src={
              profile.profilePic
                ? resizedImageUrl(profile.profilePic, IMAGE_SIZES.avatarLarge)
                : defaultAvatar
            }
            alt={profile.name}
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border border-stroke shrink-0"
          />
          <div className="min-w-0 flex-1 pt-1">
            {/* Inline (not flex + truncate) so long names wrap instead of
                being cut off; the badge flows after the last word. */}
            <h1 className="font-bold text-lg text-ink break-words">
              {profile.name}
              <span className="ml-1.5 inline-flex shrink-0 align-middle">
                <VerifiedBadge verifications={profile.verifications} size={16} />
              </span>
            </h1>
            <p className="text-ink-muted text-sm break-all">@{profile.username}</p>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-[15px] text-ink whitespace-pre-wrap break-words">
            {profile.bio}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 flex-wrap text-sm">
          <span className="text-ink">
            <strong>{profile.followerCount ?? 0}</strong>{" "}
            <span className="text-ink-muted">Followers</span>
          </span>
          <span className="text-ink">
            <strong>{profile.followingCount ?? 0}</strong>{" "}
            <span className="text-ink-muted">Following</span>
          </span>
          {join && (
            <span className="flex items-center gap-1 text-ink-muted">
              <FiCalendar size={12} />
              Joined {join}
            </span>
          )}
        </div>

        {!isOwnProfile && (
          <div className="mt-5 flex gap-2.5">
            <button
              onClick={promptLogin}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-800 text-white font-semibold text-sm transition"
            >
              {viewer ? "Follow" : "Log in to follow"}
            </button>
            <button
              onClick={promptLogin}
              className="px-4 py-2.5 rounded-xl border border-stroke hover:bg-surface text-ink font-semibold text-sm transition"
            >
              Message
            </button>
          </div>
        )}
        {isOwnProfile && (
          <Link
            to={`/profile/${viewer._id}`}
            className="mt-5 block text-center px-4 py-2.5 rounded-xl border border-stroke hover:bg-surface text-ink font-semibold text-sm transition"
          >
            Go to your full profile
          </Link>
        )}
      </div>

      {/* ── private account ─────────────────────────────────────────── */}
      {isPrivate && (
        <div className="bg-card border border-stroke rounded-2xl p-8 flex flex-col items-center text-center">
          <FiLock size={22} className="text-ink-muted mb-2" />
          <p className="text-ink font-semibold text-[15px]">
            This account is private
          </p>
          <p className="text-ink-muted text-sm mt-1">
            {viewer
              ? "Follow this account to see their posts."
              : "Log in and follow this account to see their posts."}
          </p>
        </div>
      )}

      {/* ── posts ────────────────────────────────────────────────────── */}
      {!isPrivate && (
        <div className="space-y-4">
          {pinnedPosts.length > 0 && (
            <div className="space-y-3 mb-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide px-1">
                Pinned
              </p>
              {pinnedPosts.map((post) => (
                <PublicPostCard
                  key={post._id}
                  post={post}
                  onRequireLogin={promptLogin}
                />
              ))}
            </div>
          )}

          {posts.length === 0 && pinnedPosts.length === 0 && (
            <div className="bg-card border border-stroke rounded-2xl p-8 text-center">
              <p className="text-ink-muted text-sm">No public posts yet.</p>
            </div>
          )}

          {posts.map((post) => (
            <PublicPostCard
              key={post._id}
              post={post}
              onRequireLogin={promptLogin}
            />
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

export default PublicProfile;
