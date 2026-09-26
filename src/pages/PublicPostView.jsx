import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PublicPostCard from "../components/PublicPostCard";
import VerifiedBadge from "../components/VerifiedBadge";
import SeoHead from "../components/SeoHead";
import { truncateForDescription } from "../hooks/useSeoMeta";
import { useAuth } from "../context/useAuth";
import api from "../services/api";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { FiArrowLeft, FiLoader } from "react-icons/fi";
import { useSsrInitialData } from "../hooks/useSsrInitialData";

// Public counterpart to PostView.jsx. That page wraps PostByIdModal, which
// assumes an authenticated viewer throughout (like/comment/bookmark
// handlers, the authenticated /posts/:id fetch) — same reasoning as
// Phase 3's PublicProfile not reusing Profile.jsx's chrome. This is a
// separate, read-only page hitting the public API instead.
const PublicPostView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();

  // See PublicProfile.jsx's comment on useSsrInitialData for the full
  // server/client handoff explanation.
  const initial = useSsrInitialData();

  const [state, setState] = useState(
    initial ? { loading: false, error: null, data: initial } : { loading: true, error: null, data: null },
  );

  useEffect(() => {
    if (initial) return;

    let cancelled = false;
    setState({ loading: true, error: null, data: null });

    (async () => {
      try {
        const res = await api.get(`/public/posts/${id}`, {
          skipAuthRefresh: true,
        });
        if (!cancelled) setState({ loading: false, error: null, data: res.data });
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
  }, [id]);

  const promptLogin = useCallback(() => navigate("/login"), [navigate]);

  if (state.loading) {
    return (
      <MainLayout>
        <SeoHead title="Post" robots="noindex, nofollow" />
        <div className="flex items-center justify-center min-h-[50vh]">
          <FiLoader className="animate-spin text-primary-500" size={22} />
        </div>
      </MainLayout>
    );
  }

  if (state.error === "not-found") {
    return (
      <MainLayout>
        <SeoHead title="Post Not Found" robots="noindex, nofollow" />
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
          <p className="text-ink text-lg font-semibold mb-1">Post not found</p>
          <p className="text-ink-muted text-sm mb-5">
            This post is private, was removed, or never existed.
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
        <SeoHead title="Post" robots="noindex, nofollow" />
        <div className="flex items-center justify-center min-h-[50vh] text-center px-6">
          <p className="text-ink-muted text-sm">
            Something went wrong loading this post. Try again shortly.
          </p>
        </div>
      </MainLayout>
    );
  }

  const { post, comments = [] } = state.data;
  const authorText = post.text
    ? truncateForDescription(post.text)
    : `A post by ${post.user?.name} (@${post.user?.username}) on Tronites.`;

  return (
    <MainLayout>
      <SeoHead
        title={`${post.user?.name} on Tronites`}
        description={authorText}
        canonical={`/post/${post._id}`}
        image={
          Array.isArray(post.images) && post.images[0]
            ? post.images[0].url
            : post.user?.profilePic
        }
        ogType="article"
      />

      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        className="inline-flex items-center gap-1.5 text-base font-medium text-ink-muted hover:text-ink mb-4 transition"
      >
        <FiArrowLeft size={15} />
        Back
      </button>

      <PublicPostCard post={post} onRequireLogin={promptLogin} />

      <div className="mt-5 flex items-center gap-2.5">
        <button
          onClick={promptLogin}
          className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-800 text-white font-semibold text-sm transition"
        >
          {viewer ? "Reply" : "Log in to reply"}
        </button>
        <Link
          to={`/u/${post.user?.username}`}
          className="px-4 py-2.5 rounded-xl border border-stroke hover:bg-surface text-ink font-semibold text-sm transition"
        >
          View profile
        </Link>
      </div>

      {/* ── comments — top-level, read-only ─────────────────────────── */}
      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide px-1">
          Comments
        </p>
        {comments.length === 0 && (
          <p className="text-ink-muted text-sm px-1">
            No comments yet.{" "}
            <button onClick={promptLogin} className="text-primary-600 font-medium">
              {viewer ? "Be the first to reply." : "Log in to reply."}
            </button>
          </p>
        )}
        {comments.map((comment) => (
          <div
            key={comment._id}
            className="bg-card border border-stroke rounded-xl p-3.5 flex gap-2.5"
          >
            <img
              src={
                comment.user?.profilePic
                  ? resizedImageUrl(comment.user.profilePic, IMAGE_SIZES.avatarSmall)
                  : defaultAvatar
              }
              alt=""
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-ink text-sm">
                  {comment.user?.name}
                </span>
                <VerifiedBadge verifications={comment.user?.verifications} size={12} />
              </div>
              <p className="text-[14px] text-ink whitespace-pre-wrap break-words">
                {comment.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
};

export default PublicPostView;
