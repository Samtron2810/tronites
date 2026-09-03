import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaTrash,
  FaPen,
  FaBookmark,
  FaRegBookmark,
  FaEllipsisV,
  FaVolumeUp,
  FaVolumeMute,
  FaRegCopy,
  FaRetweet,
  FaQuoteRight,
} from "react-icons/fa";
import { FiFlag, FiUsers, FiLock } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/useAuth";
import DeletePostModal from "./DeletePostModal";
import ReportModal from "./ReportModal";
import QuotePostModal from "./QuotePostModal";
import QuotedPostPreview from "./QuotedPostPreview";
import PostByIdModal from "./PostByIdModal";
import { useSocket } from "../context/useSocket";
import TextWithLinks from "./TextWithLinks";
import VerifiedBadge from "./VerifiedBadge";
import defaultAvatar from "../assets/defaultAvatar";
import LazyImage from "./LazyImage";
import PostDetailModal from "./PostDetailModal";
import CommentsPanel from "./CommentBox";
import ReactionPicker from "./ReactionPicker";
import ReactionSummaryBar from "./ReactionSummaryBar";
import { formatRemainingShort, cooldownRemainingMs } from "../utils/cooldown";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

// Same window as the backend's POST_EDIT_COOLDOWN_MS in postController.js
// — kept in sync manually since there's no shared config between the two
// codebases. Used only to decide whether to show "Edit post" in the menu;
// the backend is still the source of truth and the real enforcement.
const POST_EDIT_COOLDOWN_MS = 60 * 60 * 1000;

const PostCard = ({
  postId,
  userId,
  name,
  username,
  profilePic,
  // Author's verification badges (post.user.verifications from the
  // backend DTO) — passed through untouched, VerifiedBadge picks the
  // highest-authority one to show inline. Undefined is fine (renders
  // nothing).
  verifications,
  time,
  privacy,
  text,
  images,
  video,
  likes,
  commentsCount,
  reposts,
  isLiked,
  isBookmarked,
  isReposted,
  reactionSummary,
  myReaction,
  // Set only when this card is rendered because someone the viewer
  // follows reposted it (plain repost, not a quote) — { _id, name,
  // username } of the reposter. Drives the "🔁 X reposted" header.
  repostedBy,
  // Set only when this card IS a quote item — postId is the quote's
  // OWN Post id (quotes are real, independently-authored posts now,
  // see backend models/Post.js's quoteOf), so every action below
  // (like/comment/bookmark/repost) already targets the quote itself
  // with zero special-casing. `quoteOf` is the embedded original
  // post — a separate Post with its own independent state, opened in
  // its own detail view via the "open original" modal below, never
  // mutated by actions taken on this card.
  isQuotePost,
  quoteOf,
  edited,
  editedAt,
  onDelete,
  onUnbookmark,
  // Set only on cards rendered from the For You tab — "followed" |
  // "fof" | "trending" | "exploration" | undefined. Drives the small
  // "why am I seeing this" badge below the author line; omitted
  // entirely (undefined) on Following/Explore/profile renders, and
  // "followed" renders no badge since that needs no explanation.
  forYouSource,
  // True only for the very first post rendered on initial page load
  // (e.g. index 0 of the Home feed) -- skips the lazy-load observer
  // entirely so the one image that's already in the viewport on first
  // paint doesn't wait an extra round trip before it even starts
  // fetching. False (default) for every other post.
  priority = false,
}) => {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?._id === userId;

  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [commentCount, setCommentCount] = useState(commentsCount);
  const [reposted, setReposted] = useState(isReposted);
  const [repostCount, setRepostCount] = useState(reposts);
  const [isReposting, setIsReposting] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  // 1.2 — emoji reactions. `myReactionState` is this viewer's own emoji
  // (or null); `reactionSummaryState` is the grouped counts. Separate
  // from `liked`/`likeCount` above — a like and a reaction are
  // independent actions on the same post (mirrors Facebook: the heart
  // is a real reaction inside the same set, not a distinct mechanic
  // hidden behind it).
  const [myReactionState, setMyReactionState] = useState(myReaction || null);
  const [reactionSummaryState, setReactionSummaryState] = useState(
    reactionSummary || {},
  );
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  // Briefly flags which emoji pill just changed (own action or live
  // socket update) so ReactionSummaryBar can pop it — cleared after the
  // CSS animation window.
  const [justUpdatedEmoji, setJustUpdatedEmoji] = useState(null);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const hoverIntentTimer = useRef(null);
  // Track the prop values last synced into state, so a real prop change
  // (parent refetch/pagination) resets local state without a useEffect.
  // Optimistic local mutations (from liking/commenting) aren't affected
  // since they don't touch these `synced*` refs.
  const [syncedIsLiked, setSyncedIsLiked] = useState(isLiked);
  const [syncedLikes, setSyncedLikes] = useState(likes);
  const [syncedCommentsCount, setSyncedCommentsCount] = useState(commentsCount);
  const [syncedIsBookmarked, setSyncedIsBookmarked] = useState(isBookmarked);
  const [syncedIsReposted, setSyncedIsReposted] = useState(isReposted);
  const [syncedReposts, setSyncedReposts] = useState(reposts);
  const [syncedMyReaction, setSyncedMyReaction] = useState(myReaction || null);
  // Stores the RAW prop (not `|| {}`): comparing a missing/undefined prop
  // against a normalized `{}` never converges, which caused an infinite
  // render-phase update loop ("Too many re-renders") on surfaces whose API
  // omits reactionSummary (e.g. the profile endpoint). Normalization to {}
  // happens only when writing to the display state in the sync block below.
  const [syncedReactionSummary, setSyncedReactionSummary] =
    useState(reactionSummary);
  if (isLiked !== syncedIsLiked) {
    setSyncedIsLiked(isLiked);
    setLiked(isLiked);
  }
  if (likes !== syncedLikes) {
    setSyncedLikes(likes);
    setLikeCount(likes);
  }
  if (commentsCount !== syncedCommentsCount) {
    setSyncedCommentsCount(commentsCount);
    setCommentCount(commentsCount);
  }
  if (isBookmarked !== syncedIsBookmarked) {
    setSyncedIsBookmarked(isBookmarked);
    setBookmarked(isBookmarked);
  }
  if (isReposted !== syncedIsReposted) {
    setSyncedIsReposted(isReposted);
    setReposted(isReposted);
  }
  if (reposts !== syncedReposts) {
    setSyncedReposts(reposts);
    setRepostCount(reposts);
  }
  if ((myReaction || null) !== syncedMyReaction) {
    setSyncedMyReaction(myReaction || null);
    setMyReactionState(myReaction || null);
  }
  if (reactionSummary !== syncedReactionSummary) {
    // Sync the RAW prop so this comparison can become false (undefined ===
    // undefined); normalize to {} only for the display state.
    setSyncedReactionSummary(reactionSummary);
    setReactionSummaryState(reactionSummary || {});
  }
  const [showComments, setShowComments] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Post-level report only now — comment/reply reporting lives inside
  // CommentsPanel, which has its own ReportModal instance.
  const [reportTarget, setReportTarget] = useState(null); // null | { type: "post" }
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  // Separate small dropdown for the repost button (Repost vs Quote) —
  // distinct from the "..." options menu above, since it's opened by a
  // different trigger in the action bar, not the header ellipsis.
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  const repostMenuRef = useRef(null);
  const repostTriggerRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [postText, setPostText] = useState(text);
  const [postHasBeenEdited, setPostHasBeenEdited] = useState(edited);
  const [postEditedAt, setPostEditedAt] = useState(editedAt);
  // Same derive-during-render sync pattern as liked/likeCount above — a
  // real prop change (parent refetch) should update the displayed text;
  // an in-flight local edit shouldn't be clobbered by it either, since
  // isEditing gates the textarea vs. the rendered text separately.
  const [syncedText, setSyncedText] = useState(text);
  if (text !== syncedText) {
    setSyncedText(text);
    setPostText(text);
    setEditText(text);
    setPostHasBeenEdited(edited);
    setPostEditedAt(editedAt);
  }
  const [isLiking, setIsLiking] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [postVideo, setPostVideo] = useState(video);
  const videoRef = useRef(null);
  const [syncedVideoStatus, setSyncedVideoStatus] = useState(video?.status);
  // Mute state for the post video's overlay button — mirrors the element's
  // muted property so the icon stays in sync.
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  if (video?.status !== syncedVideoStatus) {
    setSyncedVideoStatus(video?.status);
    setPostVideo(video);
  }
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // "Open original" — opens the embedded post's OWN detail view (by
  // id, via PostByIdModal) when the person clicks the embed, either
  // from this card directly or from inside this card's own detail
  // modal. Independent of isDetailOpen so both can theoretically be
  // open in sequence without state collisions.
  const [openOriginalId, setOpenOriginalId] = useState(null);
  const { socket } = useSocket();

  const media = images || [];

  // Mirrors Profile.jsx's user-report submit — same endpoint, same payload
  // shape, same toasts, closes the modal only on success. Post-only now;
  // comment/reply reports are handled inside CommentsPanel.
  const handleReportSubmit = async ({ reason, details }) => {
    if (!reportTarget) return;
    try {
      await api.post("/reports", {
        targetType: "post",
        targetId: postId,
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

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await api.put(`/posts/like/${postId}`);
      setLikeCount(res.data.likes);
      setLiked(res.data.liked);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update like. Try again.");
    } finally {
      setIsLiking(false);
    }
  };

  // Sets/switches/clears this viewer's reaction. Same emoji tapped
  // again clears it (handled server-side — see reactToPost) so the
  // client just always sends the tapped emoji.
  const handleReact = async (emoji) => {
    if (isReacting) return;
    setReactionPickerOpen(false);
    setIsReacting(true);
    // Optimistic update — flip immediately, reconcile with the server
    // response (and roll back on failure).
    const prevSummary = reactionSummaryState;
    const prevMine = myReactionState;
    const optimisticSummary = { ...prevSummary };
    if (prevMine) {
      optimisticSummary[prevMine] = Math.max(
        0,
        (optimisticSummary[prevMine] || 1) - 1,
      );
    }
    const nextMine = prevMine === emoji ? null : emoji;
    if (nextMine) {
      optimisticSummary[nextMine] = (optimisticSummary[nextMine] || 0) + 1;
    }
    setMyReactionState(nextMine);
    setReactionSummaryState(optimisticSummary);
    setJustUpdatedEmoji(emoji);

    try {
      const res = await api.put(`/posts/react/${postId}`, {
        emoji: prevMine === emoji ? null : emoji,
      });
      setMyReactionState(res.data.myReaction);
      setReactionSummaryState(res.data.summary);
    } catch (e) {
      console.error(e);
      setMyReactionState(prevMine);
      setReactionSummaryState(prevSummary);
      toast.error("Couldn't update reaction. Try again.");
    } finally {
      setIsReacting(false);
      setTimeout(() => setJustUpdatedEmoji(null), 300);
    }
  };

  // Long-press (touch) opens the reaction picker instead of firing the
  // like tap; a quick tap still likes as before. Mouse users get the
  // same picker via onMouseEnter's hover-intent delay below, so desktop
  // never needs the press-and-hold gesture at all.
  const handleLikeTouchStart = () => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setReactionPickerOpen(true);
    }, 400);
  };
  const handleLikeTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };
  const handleLikeClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    handleLike();
  };

  const handleLikeMouseEnter = () => {
    hoverIntentTimer.current = setTimeout(() => {
      setReactionPickerOpen(true);
    }, 500);
  };
  const handleLikeMouseLeave = () => {
    clearTimeout(hoverIntentTimer.current);
  };

  const handleBookmark = async () => {
    if (isBookmarking) return;
    setIsBookmarking(true);
    try {
      const res = await api.put(`/posts/bookmark/${postId}`);
      setBookmarked(res.data.bookmarked);
      if (!res.data.bookmarked && onUnbookmark) onUnbookmark();
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update saved posts. Try again.");
    } finally {
      setIsBookmarking(false);
    }
  };

  // Toggle a plain repost. Quotes go through handleQuoteSubmit instead
  // (a separate POST, not this toggle) since undoing a quote isn't a
  // meaningful "un-quote" action the same way un-reposting is — you'd
  // delete the quote post itself, which isn't in scope here yet.
  const handleRepost = async () => {
    if (isReposting) return;
    setRepostMenuOpen(false);
    setIsReposting(true);
    try {
      const res = await api.put(`/posts/repost/${postId}`);
      setReposted(res.data.reposted);
      setRepostCount(res.data.reposts);
      toast.success(res.data.reposted ? "Reposted" : "Repost undone");
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't update repost. Try again.",
      );
    } finally {
      setIsReposting(false);
    }
  };

  const handleQuoteSubmit = async ({ text: quoteText }) => {
    try {
      await api.post(`/posts/quote/${postId}`, { text: quoteText });
      setRepostCount((c) => c + 1);
      toast.success("Quote posted!");
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't post your quote. Try again.",
      );
      throw e; // keeps QuotePostModal open on failure
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/posts/${postId}`);
      setShowDeleteModal(false);
      api.invalidateMany([
        "/posts/for-you",
        "/posts/feed",
        "/posts/trending",
        "/posts/hashtag/",
        "/posts/bookmarks",
        "/users/profile/",
        "/posts/search",
      ]);
      if (onDelete) onDelete(postId);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete post. Try again.");
    }
  };

  const handleEditCancel = () => {
    setEditText(postText);
    setIsEditing(false);
  };

  const handleCopyPost = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(postText || "");
      toast.success("Post text copied");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't copy post");
    }
  };

  const handleEditSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed && media.length === 0) {
      toast.error("Post must contain text or image");
      return;
    }
    if (trimmed === postText.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      setIsSavingEdit(true);
      const res = await api.put(`/posts/${postId}`, { text: trimmed });
      setPostText(res.data.text);
      setEditText(res.data.text);
      setPostHasBeenEdited(true);
      setPostEditedAt(res.data.editedAt);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      // Safety net for a stale client (e.g. two tabs open) — the menu
      // already hides "Edit post" during cooldown (see editCooldownActive
      // below), so this path shouldn't normally be reachable.
      if (e.response?.status === 429) {
        const { nextAllowedAt } = e.response.data;
        const remaining = formatRemainingShort(nextAllowedAt);
        toast.error(
          remaining
            ? `You can edit again in ${remaining}`
            : "You can only edit a post once every hour",
        );
        return;
      }
      toast.error(
        e.response?.data?.message || "Couldn't save changes. Try again.",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Close the post menu when clicking outside it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [menuOpen]);

  // Close the repost menu when clicking outside it — same pattern as
  // the options menu above, separate ref/state since they're
  // independent dropdowns.
  useEffect(() => {
    const handleClickOutsideRepost = (event) => {
      if (
        repostMenuRef.current &&
        !repostMenuRef.current.contains(event.target) &&
        repostTriggerRef.current &&
        !repostTriggerRef.current.contains(event.target)
      ) {
        setRepostMenuOpen(false);
      }
    };

    if (repostMenuOpen) {
      document.addEventListener("mousedown", handleClickOutsideRepost);
      return () => {
        document.removeEventListener("mousedown", handleClickOutsideRepost);
      };
    }
  }, [repostMenuOpen]);

  // Post-level socket events only — comment-scoped events (newComment,
  // commentDeleted, commentLikeUpdate) are subscribed inside
  // CommentsPanel, which owns that state now. newComment/commentDeleted
  // are still listened to here too, but only for the running count —
  // it needs to render in the action bar even when comments aren't
  // expanded / the panel hasn't mounted yet.
  useEffect(() => {
    if (!socket || !postId) return;
    socket.emit("joinPost", postId);
    const handleLikeUpdate = (data) => {
      if (data.postId !== postId) return;
      setLikeCount(data.likesCount);
      if (data.userId === currentUser?._id?.toString()) {
        setLiked(data.liked);
      }
    };
    const handleReactionUpdate = (data) => {
      if (data.postId !== postId) return;
      setReactionSummaryState(data.summary);
      if (data.userId === currentUser?._id?.toString()) {
        setMyReactionState(data.emoji);
      } else if (data.emoji) {
        setJustUpdatedEmoji(data.emoji);
        setTimeout(() => setJustUpdatedEmoji(null), 300);
      }
    };
    const handleRepostUpdate = (data) => {
      if (data.postId !== postId) return;
      setRepostCount(data.repostsCount);
      if (data.userId === currentUser?._id?.toString()) {
        setReposted(data.reposted);
      }
    };
    const handleCommentCountEvent = (data) => {
      if (data.postId !== postId) return;
      setCommentCount(data.commentCount);
    };
    const handlePostUpdated = (data) => {
      if (data.postId !== postId) return;
      // Don't clobber this viewer's own in-progress edit with the
      // server echo of the save that's already in flight — handleEditSave
      // applies its own response directly.
      if (isEditing) return;
      setPostText(data.text);
      setEditText(data.text);
      setPostHasBeenEdited(data.edited);
      setPostEditedAt(data.editedAt);
    };
    socket.on("likeUpdate", handleLikeUpdate);
    socket.on("reactionUpdate", handleReactionUpdate);
    socket.on("repostUpdate", handleRepostUpdate);
    socket.on("newComment", handleCommentCountEvent);
    socket.on("commentDeleted", handleCommentCountEvent);
    socket.on("postUpdated", handlePostUpdated);
    return () => {
      socket.emit("leavePost", postId);
      socket.off("likeUpdate", handleLikeUpdate);
      socket.off("reactionUpdate", handleReactionUpdate);
      socket.off("repostUpdate", handleRepostUpdate);
      socket.off("newComment", handleCommentCountEvent);
      socket.off("commentDeleted", handleCommentCountEvent);
      socket.off("postUpdated", handlePostUpdated);
    };
  }, [socket, postId, currentUser?._id, isEditing]);

  // Auto-pause the video when it's scrolled out of view — an off-screen
  // playing video would otherwise keep blaring audio indefinitely. Only
  // pauses; never auto-plays (playback still requires an explicit user
  // action while the post is on screen).
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !postVideo?.url) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !videoEl.paused) {
            videoEl.pause();
          }
        }
      },
      // Pauses once less than a quarter of the video is visible.
      { threshold: 0.25 },
    );
    observer.observe(videoEl);
    return () => observer.disconnect();
  }, [postVideo?.url]);

  // Mute/unmute toggle for the post video overlay. Drives the element's
  // muted property imperatively and mirrors it into state for the icon.
  const handleToggleVideoMute = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.muted = !videoEl.muted;
    setIsVideoMuted(videoEl.muted);
  };

  // Client-side mirror of the backend's 1-hour edit cooldown — used only
  // to decide whether "Edit post" appears in the menu at all, so the
  // menu never offers an action guaranteed to 429. Recomputed on every
  // render (cheap, no need for its own effect/interval).
  const editCooldownActive = Boolean(
    postEditedAt && cooldownRemainingMs(postEditedAt, POST_EDIT_COOLDOWN_MS),
  );

  // Click target for opening the detail modal: the media area, or the
  // post body outside interactive controls. Interactive elements inside
  // (buttons, links, the options menu) call stopPropagation so they
  // don't also trigger the modal open.
  const openDetail = (index) => {
    if (isEditing) return;
    if (typeof index === "number") setActiveSlide(index);
    setIsDetailOpen(true);
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

      {showQuoteModal && (
        <QuotePostModal
          post={{
            _id: postId,
            user: { _id: userId, name, username, profilePic },
            text: postText,
            images: media,
            video: postVideo,
          }}
          closeModal={() => setShowQuoteModal(false)}
          onSubmit={handleQuoteSubmit}
        />
      )}

      <PostDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        isOwner={isOwner}
        userId={userId}
        name={name}
        username={username}
        profilePic={profilePic}
        time={time}
        postText={postText}
        postHasBeenEdited={postHasBeenEdited}
        postEditedAt={postEditedAt}
        media={media}
        initialSlide={activeSlide}
        postVideo={postVideo}
        commentCount={commentCount}
        onCommentCountChange={setCommentCount}
        postId={postId}
        liked={liked}
        likeCount={likeCount}
        isLiking={isLiking}
        onLike={handleLike}
        bookmarked={bookmarked}
        isBookmarking={isBookmarking}
        onBookmark={handleBookmark}
        reactionSummary={reactionSummaryState}
        myReaction={myReactionState}
        onReact={handleReact}
        reposted={reposted}
        repostCount={repostCount}
        isReposting={isReposting}
        onRepost={handleRepost}
        onCopy={handleCopyPost}
        onEdit={() => {
          // No modal-native edit UI — close the modal and drop into the
          // same inline textarea PostCard already has, rather than
          // building a second edit form.
          setIsDetailOpen(false);
          setIsEditing(true);
        }}
        onDelete={() => {
          setIsDetailOpen(false);
          setShowDeleteModal(true);
        }}
        onReport={() => {
          setIsDetailOpen(false);
          setReportTarget({ type: "post" });
        }}
        editCooldownActive={editCooldownActive}
        quoteOf={isQuotePost ? quoteOf : null}
        onOpenOriginal={(id) => setOpenOriginalId(id)}
      />

      {/* The embedded original's own detail view — opened by id,
          fully independent of this card's/quote's own state. See
          PostByIdModal's comment for why this isn't just PostCard
          reused. */}
      <PostByIdModal
        postId={openOriginalId}
        isOpen={Boolean(openOriginalId)}
        onClose={() => setOpenOriginalId(null)}
      />

      <div className="bg-card border border-stroke rounded-2xl p-5 transition hover:shadow-sm">
        {/* "Reposted by X" header — only for plain reposts surfaced
            into a follower's feed (repostedBy is null for the
            reposter's own original post and for quotes, which get
            their own text below instead). */}
        {repostedBy && (
          <Link
            to={`/profile/${repostedBy._id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition mb-3 -mt-1"
          >
            <FaRetweet size={13} className="text-primary-600 shrink-0" />
            <span>
              <span className="font-medium">
                {repostedBy._id === currentUser?._id ? "You" : repostedBy.name}
              </span>{" "}
              reposted
            </span>
          </Link>
        )}

        {/* For You provenance badge — only shown for sources that
            actually need explaining. "followed" is silent (that's the
            expected/default case); "exploration" and "fof"/"trending"
            get a one-line reason so the ranked tab never feels
            arbitrary. Never shown outside the For You tab. */}
        {!repostedBy && forYouSource && forYouSource !== "followed" && (
          <div className="flex items-center gap-1.5 text-[11.5px] text-ink-muted mb-3 -mt-1">
            <HiOutlineSparkles
              size={12}
              className="text-primary-500 shrink-0"
            />
            <span>
              {forYouSource === "fof" && "From someone you might know"}
              {forYouSource === "trending" && "Trending right now"}
              {forYouSource === "exploration" && "New voice worth a look"}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={
                resizedImageUrl(profilePic, IMAGE_SIZES.avatarSmall) ||
                defaultAvatar
              }
              alt="user"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-100"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <Link
                  to={`/profile/${userId}`}
                  className="text-base font-semibold text-ink hover:text-primary-600 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  {name}
                </Link>
                <VerifiedBadge verifications={verifications} size="sm" />
                {username && (
                  <span className="text-sm text-ink-muted">@{username}</span>
                )}
                {/* show "You" if isowned */}
                {isOwner && (
                  <span
                    className="flex items-center gap-1 text-[11px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full"
                    title="This is your post"
                  >
                    {" "}
                    You{" "}
                  </span>
                )}
                {isQuotePost && (
                  <span
                    className="flex items-center gap-1 text-[11px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full"
                    title="This post quotes another post"
                  >
                    <FaQuoteRight size={9} />
                    Quote
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1 text-sm text-ink-muted">
                {time}
                {privacy === "followers" && (
                  <FiUsers
                    size={11}
                    className="shrink-0"
                    title="Visible to your followers"
                    aria-label="Visible to your followers"
                  />
                )}
                {privacy === "only-me" && (
                  <FiLock
                    size={11}
                    className="shrink-0"
                    title="Only visible to you"
                    aria-label="Only visible to you"
                  />
                )}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              ref={triggerRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className="text-ink-muted hover:text-ink transition p-1.5 rounded-lg hover:bg-surface"
              title="Post options"
              aria-label="Post options"
            >
              <FaEllipsisV size={14} />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-44 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1"
              >
                <button
                  onClick={handleCopyPost}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink-sub hover:bg-surface transition"
                >
                  <FaRegCopy size={13} />
                  <span className="font-medium">Copy text</span>
                </button>

                {isOwner ? (
                  <>
                    {/* "Edit post" is hidden entirely during the 1-hour
                        cooldown, computed client-side, rather than shown
                        and left to fail on submit. */}
                    {!isEditing && !editCooldownActive && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink hover:bg-primary-50 transition"
                      >
                        <FaPen className="text-primary-600" size={13} />
                        <span className="font-medium">Edit post</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowDeleteModal(true);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-red-600 hover:bg-red-50 transition"
                    >
                      <FaTrash size={13} />
                      <span className="font-medium">Delete post</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setReportTarget({ type: "post" });
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink-sub hover:bg-surface transition"
                  >
                    <FiFlag className="text-amber-500" size={13} />
                    <span className="font-medium">Report post</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Text */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              maxLength={280}
              rows={3}
              autoFocus
              className="w-full text-base text-ink-sub leading-relaxed border border-primary-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-200 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-ink-muted">
                {editText.length}/280
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCancel();
                  }}
                  disabled={isSavingEdit}
                  className="text-sm font-medium text-ink-muted hover:text-ink px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSave();
                  }}
                  disabled={isSavingEdit}
                  className="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  {isSavingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p
            onClick={openDetail}
            className="text-ink-sub text-base leading-relaxed cursor-pointer whitespace-pre-line"
          >
            <TextWithLinks text={postText} />
            {postHasBeenEdited && (
              <span
                className="text-[11px] text-ink-muted ml-1.5 align-middle"
                title={
                  postEditedAt
                    ? new Date(postEditedAt).toLocaleString()
                    : undefined
                }
              >
                (edited)
              </span>
            )}
          </p>
        )}

        {/* Embedded original — quote cards only. Clicking it opens the
            ORIGINAL post's own detail view (a separate post, with its
            own like/comment/bookmark/repost state) — stopPropagation
            keeps this from also triggering the quote's own detail
            modal via the text paragraph's onClick above it. */}
        {isQuotePost && (
          <div
            className="mt-3 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setOpenOriginalId(quoteOf?._id);
            }}
          >
            <QuotedPostPreview post={quoteOf} />
          </div>
        )}

        {/* Video */}
        {!isQuotePost && postVideo?.status === "processing" && (
          <div className="mt-4 rounded-xl overflow-hidden bg-surface aspect-video flex flex-col items-center justify-center gap-2 text-ink-muted">
            <div className="h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Processing video...</span>
          </div>
        )}
        {!isQuotePost && postVideo?.status === "failed" && (
          <div className="mt-4 rounded-xl overflow-hidden bg-surface aspect-video flex flex-col items-center justify-center gap-1 text-ink-muted">
            <span className="text-sm">Video processing failed.</span>
          </div>
        )}
        {!isQuotePost && postVideo?.status === "ready" && postVideo.url && (
          <div className="mt-4 relative rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={`${postVideo.url}#t=0.1`}
              poster={postVideo.thumbnailUrl || undefined}
              controls
              playsInline
              preload="metadata"
              disablePictureInPicture
              controlsList="nodownload nofullscreen noplaybackrate"
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-96 object-contain"
            />
            {/* Mute/unmute overlay — sits top-right, clear of the bottom
                native-controls bar. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVideoMute();
              }}
              aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
              title={isVideoMuted ? "Unmute" : "Mute"}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
            >
              {isVideoMuted ? (
                <FaVolumeMute size={16} />
              ) : (
                <FaVolumeUp size={16} />
              )}
            </button>
          </div>
        )}

        {/* Single image: unchanged inline view, natural aspect ratio,
            click opens the detail modal on the same (only) slide.
            Multiple images: fixed-height grid (2/3/4-up, chat-style) so
            a 4-image post takes up the same card footprint as a
            1-image post — each cell uses object-contain so nothing is
            stretched or cropped-distorted, just letterboxed on a
            neutral cell background. Clicking a cell opens the detail
            modal seeked to that image's index; the modal itself keeps
            its own carousel/arrows/dots untouched. */}
        {!isQuotePost && media.length === 1 && (
          <div
            className="mt-4 relative rounded-xl overflow-hidden bg-surface cursor-pointer"
            onClick={() => openDetail(0)}
          >
            <LazyImage
              src={resizedImageUrl(media[0], IMAGE_SIZES.feedImage)}
              alt="post-1"
              className="max-h-96 object-contain"
              priority={priority}
            />
          </div>
        )}

        {!isQuotePost && media.length > 1 && (
          <div
            className={`mt-4 grid gap-0.5 rounded-xl overflow-hidden h-80 ${
              media.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
            }`}
          >
            {media.slice(0, 4).map((img, i) => {
              const isFirstOfThree = media.length === 3 && i === 0;
              const extraCount = media.length - 4;
              const isLastVisibleOfFour = media.length > 4 && i === 3;

              return (
                <div
                  key={i}
                  className={`relative bg-surface cursor-pointer ${
                    isFirstOfThree ? "row-span-2" : ""
                  }`}
                  onClick={() => openDetail(i)}
                >
                  <LazyImage
                    src={resizedImageUrl(img, IMAGE_SIZES.feedImage)}
                    alt={`post-${i + 1}`}
                    className="h-full object-contain"
                    style={{ height: "100%" }}
                    priority={priority && i === 0}
                  />
                  {isLastVisibleOfFour && extraCount > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                      <span className="text-white text-2xl font-semibold">
                        +{extraCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reaction summary — sits above the action bar, same info
            tier as the like count today. Hidden entirely when no one
            has reacted yet (no empty state clutter). */}
        <ReactionSummaryBar
          summary={reactionSummaryState}
          myReaction={myReactionState}
          onToggle={handleReact}
          justUpdated={justUpdatedEmoji}
        />

        {/* Actions */}
        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-stroke">
          <div className="relative">
            <button
              onClick={handleLikeClick}
              onTouchStart={handleLikeTouchStart}
              onTouchEnd={handleLikeTouchEnd}
              onTouchCancel={handleLikeTouchEnd}
              onMouseEnter={handleLikeMouseEnter}
              onMouseLeave={handleLikeMouseLeave}
              disabled={isLiking}
              className={`flex items-center gap-1.5 text-base transition ${
                isLiking
                  ? "opacity-50 cursor-not-allowed"
                  : liked
                    ? "text-red-500"
                    : "text-ink-muted hover:text-red-500"
              }`}
            >
              {liked ? <FaHeart size={15} /> : <FaRegHeart size={15} />}
              <span>{likeCount}</span>
            </button>
            <ReactionPicker
              open={reactionPickerOpen}
              onSelect={handleReact}
              onClose={() => setReactionPickerOpen(false)}
            />
          </div>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-base text-ink-muted hover:text-primary-600 transition"
          >
            <FaRegComment size={15} />
            <span>{commentCount}</span>
          </button>

          {/* Repost is available on every card, including a quote's own
              card — reposting a quote reposts the quote itself (see
              backend models/Repost.js), never the original it embeds.
              Quoting a quote is not allowed (one level of embedding
              only) — the "Quote" option is omitted from the dropdown
              only when this card IS a quote, never just because it's
              the viewer's own post (createQuotePost's block/mute check
              explicitly exempts self, so self-quoting is allowed). */}
          <div className="relative">
            <button
              ref={repostTriggerRef}
              onClick={(e) => {
                e.stopPropagation();
                if (isQuotePost) {
                  // A quote card never offers Quote at all (one level
                  // of embedding only) — skip the dropdown and just
                  // toggle plain repost.
                  handleRepost();
                } else {
                  setRepostMenuOpen((o) => !o);
                }
              }}
              disabled={isReposting}
              title={reposted ? "Undo repost" : "Repost"}
              className={`flex items-center gap-1.5 text-base transition ${
                isReposting
                  ? "opacity-50 cursor-not-allowed"
                  : reposted
                    ? "text-green-600"
                    : "text-ink-muted hover:text-green-600"
              }`}
            >
              <FaRetweet size={15} />
              <span>{repostCount}</span>
            </button>

            {repostMenuOpen && (
              <div
                ref={repostMenuRef}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 bottom-full mb-2 w-40 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1"
              >
                <button
                  onClick={handleRepost}
                  disabled={isReposting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink hover:bg-surface transition disabled:opacity-50"
                >
                  <FaRetweet
                    className={reposted ? "text-green-600" : "text-ink-muted"}
                    size={13}
                  />
                  <span className="font-medium">
                    {reposted ? "Undo repost" : "Repost"}
                  </span>
                </button>
                {!isQuotePost && (
                  <button
                    onClick={() => {
                      setRepostMenuOpen(false);
                      setShowQuoteModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-base text-ink hover:bg-surface transition"
                  >
                    <FaQuoteRight className="text-ink-muted" size={13} />
                    <span className="font-medium">Quote</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleBookmark}
            disabled={isBookmarking}
            title={bookmarked ? "Remove from saved" : "Save post"}
            className={`ml-auto flex items-center text-base transition ${
              isBookmarking
                ? "opacity-50 cursor-not-allowed"
                : bookmarked
                  ? "text-primary-600"
                  : "text-ink-muted hover:text-primary-600"
            }`}
          >
            {bookmarked ? (
              <FaBookmark size={15} />
            ) : (
              <FaRegBookmark size={15} />
            )}
          </button>
        </div>

        {/* Inline comments — same CommentsPanel that also renders inside
            PostDetailModal. Only mounted (and only fetches) once
            expanded here. */}
        {showComments && (
          <div className="mt-4">
            <CommentsPanel
              postId={postId}
              initialCommentCount={commentCount}
              onCommentCountChange={setCommentCount}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default PostCard;
