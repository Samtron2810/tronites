import api from "../services/api";

// Cross-surface post sync. The same post can be mounted in several places at
// once (a feed card, a pinned card, PostByIdModal opened from a notification),
// each with its own local copy of the fields the owner can change. After a
// successful owner action the acting surface calls emitPostPatch; every other
// surface showing that post applies the patch via subscribePostPatch.
const EVENT = "tronites:post-patch";

export const emitPostPatch = (postId, patch) => {
  if (!postId) return;
  const id = String(postId);
  // Drop the client HTTP cache for this post so reopening it (PostByIdModal
  // uses getCached) can't serve the pre-change copy.
  api.invalidate(`/posts/${id}`);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { postId: id, patch } }));
};

export const subscribePostPatch = (postId, onPatch) => {
  if (!postId) return () => {};
  const id = String(postId);
  const handler = (e) => {
    if (e.detail?.postId === id) onPatch(e.detail.patch || {});
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
};
