import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import PostDetailModal from "./PostDetailModal";
import DeletePostModal from "./DeletePostModal";
import ReportModal from "./ReportModal";

// Opens an arbitrary post's own detail view by id, fetching it fresh
// via GET /posts/:id rather than reusing whatever (possibly stale or
// partial) snapshot the caller already had. This is what "click the
// embedded original" resolves to, from anywhere it can be clicked
// (a quote's feed card, or a quote's own detail modal) — the original
// gets its OWN like/comment/bookmark/repost state and its own further
// embed-click-through, fully independent of the quote that linked
// here. Deliberately NOT reusing PostCard for this: PostCard is
// feed-item-shaped (needs a full prop set the caller may not have for
// a post it's only linking to, not rendering), whereas this only ever
// needs to open a modal.
//
// highlightCommentId/highlightParentId forward the notification
// "go to comment" deep-link target (see PostView) into the detail
// modal's comments panel.
const PostByIdModal = ({
  postId,
  isOpen,
  onClose,
  highlightCommentId,
  highlightParentId,
}) => {
  const { user: currentUser } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  // Set when the fetch fails (404 for a deleted/hidden post, network
  // error otherwise) so a persistent fallback card can render instead
  // of an empty overlay — the inline toasts were easy to miss and left
  // the /post/:id page-looking route showing nothing at all.
  const [loadError, setLoadError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const fetchPost = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/posts/${id}`);
      setPost(res.data);
      setCommentCount(res.data.commentsCount);
      setLoadError(null);
    } catch (e) {
      console.error(e);
      setLoadError(
        e.response?.status === 404
          ? "This post is no longer available."
          : "Couldn't load this post.",
      );
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset on close so a stale post doesn't flash before the next fetch
  // resolves when a different embedded original is opened next.
  /* eslint-disable react-hooks/set-state-in-effect -- resetting local view state when the modal closes, not synchronizing from a prop change on every render */
  useEffect(() => {
    if (isOpen) return;
    setPost(null);
    setShowDeleteModal(false);
    setReportTarget(null);
    setLoadError(null);
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch on open / when the target id changes — documented
  // data-fetch-on-mount pattern; no synchronous setState in the effect
  // body itself (fetchPost's setState calls happen inside its async
  // promise chain, not here), same convention as Profile.jsx's
  // fetchProfile effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented data-fetch-on-mount pattern; no sync setState in the effect body itself
    if (isOpen && postId) fetchPost(postId);
  }, [isOpen, postId, fetchPost]);

  if (!isOpen) return null;

  const isOwner = currentUser?._id === post?.user?._id;

  const handleLike = async () => {
    if (isLiking || !post) return;
    setIsLiking(true);
    try {
      const res = await api.put(`/posts/like/${post._id}`);
      setPost((p) => ({ ...p, likesCount: res.data.likes, isLiked: res.data.liked }));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update like. Try again.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarking || !post) return;
    setIsBookmarking(true);
    try {
      const res = await api.put(`/posts/bookmark/${post._id}`);
      setPost((p) => ({ ...p, isBookmarked: res.data.bookmarked }));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update saved posts. Try again.");
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleRepost = async () => {
    if (isReposting || !post) return;
    setIsReposting(true);
    try {
      const res = await api.put(`/posts/repost/${post._id}`);
      setPost((p) => ({
        ...p,
        isReposted: res.data.reposted,
        repostsCount: res.data.reposts,
      }));
      if (res.data.reposted) toast.success("Reposted");
      else toast.success("Repost undone");
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't update repost. Try again.",
      );
    } finally {
      setIsReposting(false);
    }
  };

  // Same set/switch/clear semantics as PostCard's handleReact — kept
  // here rather than lifted to a shared hook since PostByIdModal is
  // already a deliberately standalone, self-contained state owner (see
  // this file's top comment).
  const handleReact = async (emoji) => {
    if (isReacting || !post) return;
    setIsReacting(true);
    const prevMine = post.myReaction || null;
    const nextMine = prevMine === emoji ? null : emoji;
    try {
      const res = await api.put(`/posts/react/${post._id}`, {
        emoji: nextMine,
      });
      setPost((p) => ({
        ...p,
        reactionSummary: res.data.summary,
        myReaction: res.data.myReaction,
      }));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update reaction. Try again.");
    } finally {
      setIsReacting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post?.text || "");
      toast.success("Post text copied");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't copy post");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!post) return;
    try {
      await api.delete(`/posts/${post._id}`);
      setShowDeleteModal(false);
      onClose();
      toast.success("Post deleted");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete post. Try again.");
    }
  };

  const handleReportSubmit = async ({ reason, details }) => {
    if (!post) return;
    try {
      await api.post("/reports", {
        targetType: "post",
        targetId: post._id,
        reason,
        details,
      });
      toast.success("Report submitted. Thanks for the heads up.");
      setReportTarget(null);
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't submit report. Try again.",
      );
    }
  };

  return (
    <>
      {showDeleteModal && (
        <DeletePostModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {reportTarget && (
        <ReportModal
          targetLabel="this post"
          onConfirm={handleReportSubmit}
          onCancel={() => setReportTarget(null)}
        />
      )}

      {loadError && !loading && !post && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="bg-card border border-stroke rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <p className="text-base font-semibold text-ink mb-1">
              {loadError}
            </p>
            <p className="text-sm text-ink-muted mb-4">
              It may have been deleted, or you don't have permission to view
              it.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-base font-medium text-white bg-primary-600 hover:bg-primary-800 transition"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {!loading && post && (
        <PostDetailModal
          isOpen={isOpen}
          onClose={onClose}
          isOwner={isOwner}
          userId={post.user?._id}
          name={post.user?.name}
          username={post.user?.username}
          profilePic={post.user?.profilePic}
          time={new Date(post.createdAt).toLocaleString()}
          postText={post.text}
          privacy={post.privacy}
          postHasBeenEdited={post.edited}
          postEditedAt={post.editedAt}
          media={post.images || []}
          postVideo={post.video}
          commentCount={commentCount}
          onCommentCountChange={setCommentCount}
          postId={post._id}
          liked={post.isLiked}
          likeCount={post.likesCount}
          isLiking={isLiking}
          onLike={handleLike}
          bookmarked={post.isBookmarked}
          isBookmarking={isBookmarking}
          onBookmark={handleBookmark}
          reactionSummary={post.reactionSummary}
          myReaction={post.myReaction}
          onReact={handleReact}
          reposted={post.isReposted}
          repostCount={post.repostsCount}
          isReposting={isReposting}
          onRepost={handleRepost}
          onCopy={handleCopy}
          onEdit={() => {}}
          onDelete={() => setShowDeleteModal(true)}
          onReport={() => setReportTarget({ type: "post" })}
          editCooldownActive
          quoteOf={post.isQuotePost ? post.quoteOf : null}
          highlightCommentId={highlightCommentId}
          highlightParentId={highlightParentId}
        />
      )}
    </>
  );
};

export default PostByIdModal;
