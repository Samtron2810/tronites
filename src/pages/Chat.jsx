import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useRefetchOnFocus } from "../hooks/useRefetchOnFocus";
import compressImage from "../utils/compressImage";
import {
  uploadVideoMessageToCloudinary,
  validateVideoFile,
} from "../services/videoUpload";
import { uploadToCloudinary } from "../services/cloudinary";
import {
  VoiceRecorder,
  uploadVoiceMessageToCloudinary,
  computeWaveform,
  isVoiceRecordingSupported,
  MAX_VOICE_DURATION_SECONDS,
} from "../services/voiceUpload";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/useSocket";
import ChatModal from "../components/ChatModal";
import ChatSkeleton from "../components/ChatSkeleton";
import { FaComment } from "react-icons/fa";
import sfx from "../assets/sfx.mp3";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import toast from "react-hot-toast";
import VerifiedBadge from "../components/VerifiedBadge";

const buildConversationId = (a, b) =>
  [a.toString(), b.toString()].sort().join("_");

// Undo window for message deletion — the single source of truth for how
// long a deleted message stays restorable. It stamps the deadline in
// handleDeleteMessage AND is passed to ChatModal (undoWindowMs) so the
// countdown display can clamp its first painted frame to the window length
// instead of flashing a stale-clock artifact.
const UNDO_WINDOW_MS = 5000;

// Inserts a message into the ascending-createdAt thread at its correct
// position. Needed because a background video send can complete AFTER
// later-sent texts/images; appending blindly would render it out of order
// until the next refetch.
const insertMessageSorted = (prev, msg) => {
  const t = msg?.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
  const idx = prev.findIndex((m) => new Date(m.createdAt).getTime() > t);
  if (idx === -1) return [...prev, msg];
  return [...prev.slice(0, idx), msg, ...prev.slice(idx)];
};

const Chat = () => {
  const { user } = useAuth();
  const { socket, onlineUsers, refreshUnreadCount } = useSocket();
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const lastSoundPlayedAtRef = useRef(0);
  const [conversations, setConversations] = useState([]);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [conversationsHasMore, setConversationsHasMore] = useState(false);
  const [totalConversationsCount, setTotalConversationsCount] = useState(0);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] =
    useState(false);
  const [activeTab, setActiveTab] = useState("messages"); // "messages" | "requests"
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestActionId, setRequestActionId] = useState(null); // conversationId being accepted/declined
  const [requestInfo, setRequestInfo] = useState(null); // gating state for the open thread
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]);
  // Video attachment for the current draft (mutually exclusive with images).
  // `videoFile` is the raw File (uploaded via uploadVideoMessageToCloudinary),
  // `videoPreviewUrl` is a local object URL for the picker thumbnail.
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  // In-flight BACKGROUND video sends. Each entry is a video whose Send the
  // user already pressed — the composer was freed at that moment, so text/
  // image sends continue working while these finish. One progress bar is
  // rendered per entry.
  const [videoUploads, setVideoUploads] = useState([]);
  // Voice-note recording state. `isRecordingVoice` drives the composer's
  // recording UI (waveform-free live timer + stop/cancel); the actual
  // MediaRecorder instance lives in voiceRecorderRef so it survives
  // re-renders without becoming state itself.
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const voiceRecorderRef = useRef(null);
  // In-flight BACKGROUND voice-note sends — same one-progress-bar-per-item
  // pattern as videoUploads, since recording is instant but the upload
  // afterward is not.
  const [voiceUploads, setVoiceUploads] = useState([]);
  const voiceSendIdRef = useRef(0);
  const [pendingDeletes, setPendingDeletes] = useState({}); // messageId -> expiresAt (ms)
  const [deletingIds, setDeletingIds] = useState([]); // ids whose API delete is in flight
  const pendingDeletesRef = useRef({});
  const deletingIdsRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  // Whether the OTHER participant in the open thread is currently typing.
  // Server-pushed only — this client never infers its own typing state
  // from this, see isTypingRef/typingTimeoutRef below for that side.
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const otherUserTypingTimeoutRef = useRef(null);
  // Local "am I currently broadcasting typing" flag — lets handleMessageTextChange
  // emit "typing" only on the leading edge (first keystroke after idle)
  // instead of on every keystroke, and emit "stopTyping" once, not per key.
  const isTypingRef = useRef(false);
  const stopTypingTimeoutRef = useRef(null);
  const TYPING_IDLE_MS = 2500; // no keystroke for this long -> stopTyping
  const TYPING_STALE_MS = 4000; // no "typing" event from peer -> assume stopped (dropped stopTyping)
  // Tracks which conversation is currently open, updated on every render
  // where selectedChat changes. Used by the async video-send path to
  // detect a mid-upload thread switch (the closure's selectedChat is stale
  // by the time the upload resolves).
  const activeChatIdRef = useRef(null);
  // Monotonic id source for background video-send entries (used as React
  // keys). A ref, not Date.now(), so no impure call happens in render scope.
  const videoSendIdRef = useRef(0);
  const [searchParams] = useSearchParams();
  const scrollRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const conversationsObserverTarget = useRef(null);
  const hasScrolledToBottom = useRef(false);
  const isPrependingOlder = useRef(false);
  // Tracks whether the user is currently scrolled near the bottom of the
  // thread — drives whether new messages/reactions auto-scroll (near
  // bottom) or just increment the "jump to latest" badge (reading older
  // messages further up). Kept in a ref for the message-effect's
  // decision (avoids stale closures) and mirrored to state to drive the
  // floating button's visibility/badge without extra re-renders elsewhere.
  const isNearBottomRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesBelowCount, setNewMessagesBelowCount] = useState(0);
  const prevMessageCountRef = useRef(0);
  const NEAR_BOTTOM_PX = 120;

  // Keep activeChatIdRef in sync with the currently-open thread so the
  // async video-send path can detect a mid-upload conversation switch.
  // Also cancels any in-progress voice recording — switching threads (or
  // navigating away) while the mic is open would otherwise leave a live
  // getUserMedia stream running against the thread you just left.
  useEffect(() => {
    activeChatIdRef.current = selectedChat?.conversationId || null;
    return () => {
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.cancel();
        voiceRecorderRef.current = null;
        setIsRecordingVoice(false);
        setRecordingElapsed(0);
      }
    };
  }, [selectedChat]);

  // fetchConversations — the `silent` flag controls whether this shows
  // the skeleton or not, matching the pattern used in Home.jsx's
  // fetchPosts. silent=true is used by useRefetchOnFocus so a cache-TTL
  // revalidation or window-focus refetch doesn't blank an already-loaded
  // conversation list back to ChatSkeleton.
  const fetchConversations = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.getCached("/messages/conversations", {
        params: { page: 1, limit: 20 },
        ttlMs: 30_000,
        revalidate: true,
      });
      setConversations(res.data.conversations);
      setConversationsPage(1);
      setConversationsHasMore(res.data.hasMore);
      setTotalConversationsCount(res.data.totalConversations);
      const urlUserId = searchParams.get("user");
      if (urlUserId) {
        const existing = res.data.conversations.find(
          (c) => c.otherUser._id === urlUserId,
        );
        if (existing) {
          loadConversation(existing.otherUser);
          return;
        }
        const profileRes = await api.get(`/users/profile/${urlUserId}`);
        const otherUser = profileRes.data.user;
        if (otherUser) {
          // Use loadConversation so existing message history is fetched
          // from the server. The conversation may exist on a page beyond
          // page 1 (not in the cached list) — calling setSelectedChat
          // directly would open an empty thread even when prior messages
          // exist. loadConversation fetches the thread, sets requestInfo,
          // and refreshes the conversations list from the server.
          loadConversation(otherUser);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMoreConversations = async () => {
    if (isLoadingMoreConversations || !conversationsHasMore) return;
    try {
      setIsLoadingMoreConversations(true);
      const nextPage = conversationsPage + 1;
      const res = await api.get("/messages/conversations", {
        params: { page: nextPage, limit: 20 },
      });
      setConversations((prev) => [...prev, ...res.data.conversations]);
      setConversationsPage(nextPage);
      setConversationsHasMore(res.data.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMoreConversations(false);
    }
  };

  // silent=true skips the skeleton — see fetchConversations above.
  const fetchRequests = async ({ silent = false } = {}) => {
    try {
      if (!silent) setRequestsLoading(true);
      const res = await api.getCached("/messages/requests", {
        ttlMs: 30_000,
        revalidate: true,
      });
      setRequests(res.data.requests);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setRequestsLoading(false);
    }
  };

  const handleAcceptRequest = async (req) => {
    if (requestActionId) return;
    setRequestActionId(req.conversationId);
    try {
      await api.put(`/messages/requests/${req.otherUser._id}`, {
        action: "accept",
      });
      setRequests((prev) =>
        prev.filter((r) => r.conversationId !== req.conversationId),
      );
      api.invalidate("/messages/conversations");
      // Open the now-accepted thread directly.
      setActiveTab("messages");
      loadConversation(req.otherUser);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Couldn't accept request.");
    } finally {
      setRequestActionId(null);
    }
  };

  const handleDeclineRequest = async (req) => {
    if (requestActionId) return;
    setRequestActionId(req.conversationId);
    try {
      await api.put(`/messages/requests/${req.otherUser._id}`, {
        action: "decline",
      });
      setRequests((prev) =>
        prev.filter((r) => r.conversationId !== req.conversationId),
      );
      api.invalidate("/messages/conversations");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Couldn't decline request.");
    } finally {
      setRequestActionId(null);
    }
  };

  const loadConversation = async (otherUser) => {
    try {
      setThreadLoading(true);
      // Server paginates thread history (most recent page, oldest-first)
      // and marks the thread's messages as read as a side effect of
      // this GET.
      const res = await api.get(`/messages/${otherUser._id}`, {
        params: { page: 1, limit: 30 },
      });
      setMessages(res.data.messages);
      setMessagesPage(1);
      setMessagesHasMore(res.data.hasMore);
      setRequestInfo(res.data.requestInfo || null);
      setSelectedChat({
        otherUser,
        conversationId: buildConversationId(user._id, otherUser._id),
      });
      // Refresh just the first page (for updated unread counts/order),
      // then merge with whatever's already loaded via "load more" so we
      // don't lose conversations further down the list.
      const convsRes = await api.getCached("/messages/conversations", {
        params: { page: 1, limit: 20 },
        ttlMs: 10_000,
        revalidate: true,
      });
      setConversations((prev) => {
        const freshIds = new Set(
          convsRes.data.conversations.map((c) => c.conversationId),
        );
        const rest = prev.filter((c) => !freshIds.has(c.conversationId));
        return [...convsRes.data.conversations, ...rest];
      });
      setConversationsPage(1);
      setConversationsHasMore(convsRes.data.hasMore);
      setTotalConversationsCount(convsRes.data.totalConversations);
      // Tell the navbar badge directly that this thread was just read,
      // rather than waiting on a "messagesRead" socket event to round
      // -trip back. That event is emitted by the server as a side
      // effect of the GET above, but this client doesn't join the
      // conversation's socket room until the *next* effect run (after
      // selectedChat updates) — so it reliably missed its own read
      // event and the badge only ever caught up on a full page reload.
      refreshUnreadCount();
    } catch (e) {
      console.error(e);
    } finally {
      setThreadLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (isLoadingOlderMessages || !messagesHasMore || !selectedChat) return;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    isPrependingOlder.current = true;
    try {
      setIsLoadingOlderMessages(true);
      const nextPage = messagesPage + 1;
      const res = await api.get(`/messages/${selectedChat.otherUser._id}`, {
        params: { page: nextPage, limit: 30 },
      });
      setMessages((prev) => [...res.data.messages, ...prev]);
      setMessagesPage(nextPage);
      setMessagesHasMore(res.data.hasMore);
      // Restore scroll position so prepending older messages doesn't
      // jump the view — wait a tick for the DOM to grow first.
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
        isPrependingOlder.current = false;
      });
    } catch (e) {
      console.error(e);
      isPrependingOlder.current = false;
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (
      container.scrollTop < 60 &&
      messagesHasMore &&
      !isLoadingOlderMessages
    ) {
      loadOlderMessages();
    }
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
    if (nearBottom) setNewMessagesBelowCount(0);
  };

  // Scrolls the messages container itself to its bottom edge. Scoped to the
  // container on purpose: scrollIntoView on the bottom anchor would also
  // scroll every other scrollable ancestor, including the page behind the
  // fixed-position chat modal. behavior omitted = instant jump.
  const scrollMessagesToBottom = useCallback((behavior) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (behavior) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Manual "jump to latest" — used by the floating button. Always scrolls
  // (unlike the passive effect below, which only auto-scrolls when
  // already near the bottom) since this is an explicit user action.
  const scrollToBottom = (behavior = "smooth") => {
    scrollMessagesToBottom(behavior);
    setNewMessagesBelowCount(0);
    setShowScrollToBottom(false);
    isNearBottomRef.current = true;
  };

  // Chat media (image-grid images, video stills) loads asynchronously with
  // h-auto heights, so the thread keeps growing AFTER it has been laid out
  // and scrolled to the bottom. Re-anchor on each load — but only while the
  // user is still parked at the bottom (isNearBottomRef goes false the
  // moment they scroll up to read), which is the "don't yank my reading
  // position" rule the message effect below also follows.
  const handleChatMediaLoaded = () => {
    if (!isNearBottomRef.current) return;
    scrollMessagesToBottom();
  };

  const updateConversationPreview = (message, incrementUnread = false) => {
    const otherUser =
      message.sender._id === user._id ? message.receiver : message.sender;
    const conversationId =
      message.conversationId ||
      buildConversationId(message.sender._id, message.receiver._id);
    setConversations((prev) => {
      const existing = prev.find((c) => c.conversationId === conversationId);
      const preview = {
        conversationId,
        otherUser,
        lastMessage: message.text
          ? message.text
          : message.video?.url
            ? "🎬 Video"
            : message.voice?.url
              ? "🎤 Voice message"
              : message.images?.length || message.image
                ? "📷 Photo(s)"
                : "",
        lastMessageFromMe: message.sender._id === user._id,
        lastMessageAt: message.createdAt,
        unreadCount: incrementUnread
          ? (existing?.unreadCount || 0) + 1
          : existing?.unreadCount || 0,
      };
      return [
        preview,
        ...prev.filter((c) => c.conversationId !== conversationId),
      ];
    });
  };

  // Broadcasts "typing" on the leading edge, resets a trailing idle timer
  // on every keystroke, and emits "stopTyping" once the user pauses for
  // TYPING_IDLE_MS. Called from the composer's onChange, not from
  // setMessageText directly, since programmatic clears (send, chat switch)
  // shouldn't re-trigger typing.
  const emitTyping = useCallback(() => {
    if (
      !socket ||
      !selectedChat?.conversationId ||
      !selectedChat?.otherUser?._id
    )
      return;
    const payload = {
      conversationId: selectedChat.conversationId,
      recipientId: selectedChat.otherUser._id,
    };
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", payload);
    }
    clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("stopTyping", payload);
    }, TYPING_IDLE_MS);
  }, [socket, selectedChat]);

  // Fires stopTyping immediately (send, blur-away, chat switch) instead of
  // waiting out the idle timer — keeps the peer's indicator from lingering
  // after the message actually goes out.
  const emitStopTypingNow = useCallback(() => {
    clearTimeout(stopTypingTimeoutRef.current);
    if (!isTypingRef.current) return;
    isTypingRef.current = false;
    if (
      socket &&
      selectedChat?.conversationId &&
      selectedChat?.otherUser?._id
    ) {
      socket.emit("stopTyping", {
        conversationId: selectedChat.conversationId,
        recipientId: selectedChat.otherUser._id,
      });
    }
  }, [socket, selectedChat]);

  const handleMessageTextChange = (value) => {
    setMessageText(value);
    if (value.trim()) emitTyping();
    else emitStopTypingNow();
  };

  const handleSendMessage = async () => {
    // `isSending` only covers the fast text/image POST. A video upload in
    // flight does NOT lock the composer — it runs in the background so
    // text/images can be sent while it finishes.
    if (isSending || !selectedChat) return;
    if (!messageText.trim() && imagePreviews.length === 0 && !videoFile) return;
    emitStopTypingNow();
    // Sending always means "I want to see this go out" — force the
    // near-bottom flag so the message-tracking effect follows it down
    // even if the composer was somehow used while scrolled up reading
    // history (e.g. via keyboard shortcut).
    isNearBottomRef.current = true;

    // Video draft? Snapshot everything needed, free the composer
    // immediately, then run upload + create-message in the background.
    if (videoFile) {
      const item = {
        id: `vid-${++videoSendIdRef.current}`,
        file: videoFile,
        name: videoFile.name,
        chatId: selectedChat.conversationId,
        receiverId: selectedChat.otherUser._id,
        caption: messageText.trim(),
        progress: 0,
        // Captured at send time so the background task applies the same
        // request-gating behavior sendMessage does.
        markPendingRequest: requestInfo?.status !== "accepted",
      };
      clearVideoDraft();
      setMessageText("");
      setVideoUploads((prev) => [...prev, item]);
      void startVideoSend(item);
      return;
    }

    setIsSending(true);
    try {
      let imageUrls = [];

      if (imagePreviews.length > 0) {
        // 1. Get a single signature for all images in this batch.
        const sigRes = await api.post("/messages/signature/image");
        const signatureData = sigRes.data;

        // 2. Compress locally, then upload each directly to Cloudinary.
        imageUrls = await Promise.all(
          imagePreviews.map(async (preview) => {
            const blob = await (await fetch(preview)).blob();
            const file = new File([blob], "chat-image", {
              type: blob.type || "image/jpeg",
            });
            const compressed = await compressImage(file, {
              maxWidth: 1280,
              quality: 0.7,
              skipBelowBytes: 300 * 1024,
            });
            const result = await uploadToCloudinary({ file: compressed, signatureData });
            return result.secure_url;
          }),
        );
      }

      // 3. Create the message with URLs — pure JSON, no multipart.
      const res = await api.post(`/messages/${selectedChat.otherUser._id}`, {
        text: messageText.trim() || undefined,
        images: imageUrls,
      });
      setMessages((prev) => insertMessageSorted(prev, res.data));
      setMessageText("");
      // Revoke object URLs before clearing to free browser memory.
      setImagePreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      updateConversationPreview(res.data, false);
      api.invalidate("/messages/conversations");
      // A pending request just got its first (and only) message sent —
      // reflect that in local gating state without waiting for a refetch.
      if (requestInfo?.status !== "accepted") {
        setRequestInfo((prev) =>
          prev?.status === "pending"
            ? prev
            : { status: "pending", isInitiator: true },
        );
      }
    } catch (e) {
      const code = e?.response?.data?.code;
      if (
        code === "REQUEST_PENDING" ||
        code === "DECLINED" ||
        code === "BLOCKED"
      ) {
        alert(e.response.data.message);
      } else {
        alert(`Error: ${e?.response?.data?.message || e.message}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Background worker for one queued video send: uploads to Cloudinary
  // with per-item progress, creates the message, appends locally if the
  // user is still viewing the same thread, then removes itself from the
  // pending-uploads list on completion OR failure. Runs independently of
  // the composer — text/image sends don't wait on it.
  const startVideoSend = async (item) => {
    try {
      const video = await uploadVideoMessageToCloudinary({
        file: item.file,
        onProgress: (pct) =>
          setVideoUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u)),
          ),
      });

      const res = await api.post(`/messages/${item.receiverId}/video`, {
        text: item.caption,
        video,
      });

      // If the user switched threads while the upload was in flight,
      // don't append this message to a different thread (the socket
      // event still reaches the recipient either way). Insert sorted by
      // createdAt so messages sent while this was uploading stay ordered.
      if (item.chatId === activeChatIdRef.current) {
        setMessages((prev) => insertMessageSorted(prev, res.data));
      }
      updateConversationPreview(res.data, false);
      api.invalidate("/messages/conversations");
      if (item.markPendingRequest) {
        setRequestInfo((prev) =>
          prev?.status === "pending"
            ? prev
            : { status: "pending", isInitiator: true },
        );
      }
    } catch (e) {
      alert(
        `Couldn't send your video: ${e?.response?.data?.message || e.message}`,
      );
    } finally {
      setVideoUploads((prev) => prev.filter((u) => u.id !== item.id));
    }
  };

  // Clears the video draft and revokes its object URL. Extracted so both
  // the remove button, image-select (mutual exclusion), and post-send
  // cleanup share one implementation. Does NOT touch in-flight background
  // video sends — those live in `videoUploads`.
  const clearVideoDraft = useCallback(() => {
    setVideoFile(null);
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (videoInputRef.current) videoInputRef.current.value = "";
  }, []);

  const handleVideoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const invalid = validateVideoFile(file);
    if (invalid) {
      alert(invalid);
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }
    // Videos and images are mutually exclusive in a message — picking a
    // video drops any staged images.
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setVideoFile(file);
    setVideoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    // Reset input so re-selecting the same file re-triggers onChange.
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleRemoveVideo = () => clearVideoDraft();

  // Background worker for one queued voice-note send — mirrors
  // startVideoSend exactly: upload with progress, create the message,
  // append locally only if still on the same thread, self-remove from the
  // pending list on completion or failure.
  const startVoiceSend = async (item) => {
    try {
      const voice = await uploadVoiceMessageToCloudinary({
        blob: item.blob,
        onProgress: (pct) =>
          setVoiceUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u)),
          ),
      });
      voice.waveform = item.waveform;
      voice.durationSeconds = voice.durationSeconds || item.durationSeconds;

      const res = await api.post(`/messages/${item.receiverId}/voice`, {
        voice,
      });

      if (item.chatId === activeChatIdRef.current) {
        setMessages((prev) => insertMessageSorted(prev, res.data));
      }
      updateConversationPreview(res.data, false);
      api.invalidate("/messages/conversations");
      if (item.markPendingRequest) {
        setRequestInfo((prev) =>
          prev?.status === "pending"
            ? prev
            : { status: "pending", isInitiator: true },
        );
      }
    } catch (e) {
      alert(
        `Couldn't send your voice note: ${e?.response?.data?.message || e.message}`,
      );
    } finally {
      setVoiceUploads((prev) => prev.filter((u) => u.id !== item.id));
    }
  };

  // Mic button press: request the microphone and start recording. Silently
  // no-ops with an alert if the browser lacks MediaRecorder/getUserMedia
  // support (older Safari/embedded webviews) rather than showing a broken
  // control.
  const handleStartRecording = async () => {
    if (!selectedChat || isRecordingVoice) return;
    if (!isVoiceRecordingSupported()) {
      alert("Voice notes aren't supported in this browser.");
      return;
    }
    const recorder = new VoiceRecorder({
      onTick: (elapsed) => setRecordingElapsed(elapsed),
      // Auto-stop and send at the cap so a forgotten-open mic doesn't
      // record indefinitely — same UX as WhatsApp's hard stop.
      onMaxDuration: () => handleStopRecording({ send: true }),
    });
    try {
      await recorder.start();
      voiceRecorderRef.current = recorder;
      setRecordingElapsed(0);
      setIsRecordingVoice(true);
    } catch {
      alert("Microphone access was denied or is unavailable.");
    }
  };

  // Stops the active recording. `send: false` (the ✕ button) discards it;
  // `send: true` (the ✓ button, or hitting the max duration) uploads it as
  // a background send, same free-the-composer-immediately pattern as
  // video sends.
  const handleStopRecording = async ({ send }) => {
    const recorder = voiceRecorderRef.current;
    if (!recorder) return;
    setIsRecordingVoice(false);
    voiceRecorderRef.current = null;

    if (!send) {
      recorder.cancel();
      setRecordingElapsed(0);
      return;
    }

    try {
      const { blob, durationSeconds } = await recorder.stop();
      setRecordingElapsed(0);
      // Discard anything below half a second — almost certainly an
      // accidental tap, not an intended note.
      if (durationSeconds < 0.5) return;
      const waveform = await computeWaveform(blob);
      const item = {
        id: `voice-${++voiceSendIdRef.current}`,
        blob,
        durationSeconds,
        waveform,
        chatId: selectedChat.conversationId,
        receiverId: selectedChat.otherUser._id,
        progress: 0,
        markPendingRequest: requestInfo?.status !== "accepted",
      };
      setVoiceUploads((prev) => [...prev, item]);
      void startVoiceSend(item);
    } catch {
      setRecordingElapsed(0);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    // Choosing images drops any staged video (mutually exclusive).
    clearVideoDraft();
    // Cap at 4 total images per message.
    const remaining = 4 - imagePreviews.length;
    const toAdd = files.slice(0, remaining);
    if (toAdd.length === 0) return;
    // Use object URLs instead of base64 (readAsDataURL) — much lighter on
    // memory (no 33% size inflation) and revocable. The send path already
    // calls fetch(preview).blob() which works on both data: and blob: URLs.
    const objectUrls = toAdd.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...objectUrls].slice(0, 4));
    // Reset input so re-selecting the same file(s) re-triggers onChange.
    e.target.value = "";
  };

  const handleRemoveImage = (index) => {
    setImagePreviews((prev) => {
      // Revoke the object URL being removed to free browser memory.
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Double-tap / reaction-bar select on a message bubble. Same set/
  // switch/clear semantics as PostCard's handleReact — optimistic
  // update, reconciled with the server response.
  const handleReactMessage = async (messageId, emoji) => {
    const target = messages.find((m) => m._id === messageId);
    const prevMine = target?.myReaction || null;
    const prevSummary = target?.reactionSummary || {};
    const nextMine = prevMine === emoji ? null : emoji;

    const optimisticSummary = { ...prevSummary };
    if (prevMine) {
      optimisticSummary[prevMine] = Math.max(
        0,
        (optimisticSummary[prevMine] || 1) - 1,
      );
    }
    if (nextMine) {
      optimisticSummary[nextMine] = (optimisticSummary[nextMine] || 0) + 1;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId
          ? { ...m, myReaction: nextMine, reactionSummary: optimisticSummary }
          : m,
      ),
    );

    try {
      const res = await api.put(`/messages/${messageId}/react`, {
        emoji: nextMine,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                myReaction: res.data.myReaction,
                reactionSummary: res.data.summary,
              }
            : m,
        ),
      );
    } catch (e) {
      console.error(e);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, myReaction: prevMine, reactionSummary: prevSummary }
            : m,
        ),
      );
      toast.error("Couldn't update reaction. Try again.");
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (
      pendingDeletesRef.current[messageId] ||
      deletingIdsRef.current.has(messageId)
    )
      return;
    pendingDeletesRef.current = {
      ...pendingDeletesRef.current,
      [messageId]: Date.now() + UNDO_WINDOW_MS,
    };
    setPendingDeletes(pendingDeletesRef.current);
  };

  const handleUndoDelete = (messageId) => {
    if (!pendingDeletesRef.current[messageId]) return;
    const next = { ...pendingDeletesRef.current };
    delete next[messageId];
    pendingDeletesRef.current = next;
    setPendingDeletes(next);
  };

  // Reports another user's message. Lives here (not in ChatModal) so every
  // mutation stays owned by this page, matching handleSendMessage /
  // performDelete. Resolves to true only on success so ChatModal knows to
  // close its ReportModal. The backend rejects reporting your own message,
  // and ChatModal only shows the flag trigger on received messages anyway.
  const handleReportMessage = async ({ message, reason, details }) => {
    try {
      await api.post("/reports", {
        targetType: "message",
        targetId: message._id,
        reason,
        details,
      });
      toast.success("Report submitted. Thanks for the heads up.");
      return true;
    } catch (e) {
      console.error(e);
      toast.error(
        e.response?.data?.message || "Couldn't submit report. Try again.",
      );
      return false;
    }
  };

  const performDelete = useCallback(async (messageId) => {
    if (deletingIdsRef.current.has(messageId)) return;
    deletingIdsRef.current.add(messageId);
    setDeletingIds((prev) => [...prev, messageId]);
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete the message — it's been restored.");
    } finally {
      deletingIdsRef.current.delete(messageId);
      setDeletingIds((prev) => prev.filter((id) => id !== messageId));
    }
  }, []);

  // 5-second grace period: every 250ms, commit the real API delete for
  // any pending message whose countdown has fully elapsed. Undo (before
  // expiry) simply removes the entry from pendingDeletesRef, so the
  // message never left state and instantly reappears.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const expired = Object.entries(pendingDeletesRef.current)
        .filter(([, expiresAt]) => expiresAt <= now)
        .map(([id]) => id);
      if (expired.length === 0) return;
      const next = { ...pendingDeletesRef.current };
      expired.forEach((id) => delete next[id]);
      pendingDeletesRef.current = next;
      setPendingDeletes(next);
      expired.forEach((id) => performDelete(id));
    }, 250);
    return () => clearInterval(interval);
  }, [performDelete]);

  // --- Notification sound setup ---
  // Chrome (and Firefox/Safari to varying degrees) block audio.play()
  // until the page has received a real user gesture (click, tap, or
  // keypress). The old code called play() directly inside the socket
  // handler, which isn't a user gesture, so Chrome silently rejected it.
  // Edge is more lenient about this, which is why it "worked" there.
  //
  // Fix: play a muted, volume-0 primer on the first user gesture. This
  // satisfies the browser's gesture requirement and marks the element as
  // allowed to autoplay for the rest of the session — no Web Audio API
  // or AudioContext needed for a simple one-shot ping.
  useEffect(() => {
    audioRef.current = new Audio(sfx);
    audioRef.current.preload = "auto";
    audioRef.current.volume = 0.35;

    const unlockAudio = () => {
      if (audioUnlockedRef.current || !audioRef.current) return;
      const el = audioRef.current;
      const originalVolume = el.volume;
      el.volume = 0;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = originalVolume;
          audioUnlockedRef.current = true;
        })
        .catch(() => {
          // Still blocked (e.g. no gesture registered yet) — restore
          // volume and try again on the next gesture.
          el.volume = originalVolume;
        });
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const playMessageSound = () => {
    if (!audioRef.current) return;
    // Guard against the same sound firing twice within a short window
    // (e.g. StrictMode's dev-only double-effect mount, or a stray
    // duplicate socket event) — only allow one play per ~400ms.
    const now = Date.now();
    if (now - lastSoundPlayedAtRef.current < 400) return;
    lastSoundPlayedAtRef.current = now;

    audioRef.current.currentTime = 0;
    // play() returns a Promise that rejects if the browser blocks it —
    // must be handled or Chrome logs an "unhandled promise rejection"
    // and the old `void` didn't actually catch anything.
    audioRef.current.play().catch((err) => {
      // Expected before the first user gesture unlocks audio; safe to
      // ignore otherwise (e.g. tab not focused).
      console.debug("Message sound blocked:", err?.message || err);
    });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    fetchConversations();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRefetchOnFocus(() => {
    fetchConversations({ silent: true });
    fetchRequests({ silent: true });
  });

  useEffect(() => {
    const target = conversationsObserverTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          conversationsHasMore &&
          !isLoadingMoreConversations &&
          !loading
        ) {
          fetchMoreConversations();
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conversationsPage,
    conversationsHasMore,
    isLoadingMoreConversations,
    loading,
  ]);

  useEffect(() => {
    if (!socket) return;
    const handleReceive = (message) => {
      const inCurrent =
        selectedChat?.otherUser?._id === message.sender._id ||
        selectedChat?.otherUser?._id === message.receiver._id;
      if (inCurrent && message.sender._id !== user._id) {
        setMessages((prev) => [...prev, message]);
        playMessageSound();
      }
      updateConversationPreview(message, message.receiver._id === user._id);
    };
    const handleDeleted = ({ messageId }) =>
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    const handleReactionUpdate = ({
      messageId,
      summary,
      emoji,
      userId: fromUserId,
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                reactionSummary: summary,
                // This event only ever comes from the OTHER participant
                // (see messageController.reactToMessage's emitToUser
                // target) — this viewer's own reaction is already set
                // optimistically by handleMessageReact below, so never
                // overwrite myReaction from here.
                _lastReactionFrom: fromUserId,
                _lastReactionEmoji: emoji,
              }
            : m,
        ),
      );
    };
    socket.on("receiveMessage", handleReceive);
    socket.on("messageDeleted", handleDeleted);
    socket.on("messageReactionUpdate", handleReactionUpdate);
    const handleRequestAccepted = (data) => {
      // If we're currently viewing the thread that just got accepted,
      // refresh the gating state so the composer unlocks immediately.
      if (data.conversationId === selectedChat?.conversationId) {
        setRequestInfo({ status: "accepted", isInitiator: true });
      }
    };
    socket.on("messageRequestAccepted", handleRequestAccepted);
    const handleTyping = ({ conversationId, userId: fromUserId }) => {
      if (
        conversationId !== selectedChat?.conversationId ||
        fromUserId !== selectedChat?.otherUser?._id
      )
        return;
      setOtherUserTyping(true);
      // Server "stopTyping" can be dropped (tab close, network blip) —
      // age the indicator out on its own so it never sticks forever.
      clearTimeout(otherUserTypingTimeoutRef.current);
      otherUserTypingTimeoutRef.current = setTimeout(
        () => setOtherUserTyping(false),
        TYPING_STALE_MS,
      );
    };
    const handleStopTyping = ({ conversationId, userId: fromUserId }) => {
      if (
        conversationId !== selectedChat?.conversationId ||
        fromUserId !== selectedChat?.otherUser?._id
      )
        return;
      clearTimeout(otherUserTypingTimeoutRef.current);
      setOtherUserTyping(false);
    };
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("messagesRead", (data) => {
      // Always update the conversation list to clear unread count
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === data.conversationId
            ? { ...c, unreadCount: 0 }
            : c,
        ),
      );
      // Also update current message thread if viewing it
      if (data.conversationId === selectedChat?.conversationId) {
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            read: m.receiver._id === user._id ? m.read : true,
          })),
        );
      }
    });
    if (selectedChat?.conversationId)
      socket.emit("joinConversation", selectedChat.conversationId);
    return () => {
      socket.off("receiveMessage", handleReceive);
      socket.off("messageDeleted", handleDeleted);
      socket.off("messageReactionUpdate", handleReactionUpdate);
      socket.off("messagesRead");
      socket.off("messageRequestAccepted", handleRequestAccepted);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      clearTimeout(otherUserTypingTimeoutRef.current);
      setOtherUserTyping(false);
      // Inline stopTyping emit (not emitStopTypingNow) so this cleanup
      // doesn't need that callback in its dep array — it fires on every
      // selectedChat change already, which is exactly when we want it.
      clearTimeout(stopTypingTimeoutRef.current);
      if (
        isTypingRef.current &&
        selectedChat?.conversationId &&
        selectedChat?.otherUser?._id
      ) {
        isTypingRef.current = false;
        socket.emit("stopTyping", {
          conversationId: selectedChat.conversationId,
          recipientId: selectedChat.otherUser._id,
        });
      }
      if (selectedChat?.conversationId)
        socket.emit("leaveConversation", selectedChat.conversationId);
    };
    // selectedChat/updateConversationPreview intentionally omitted: this
    // effect manages the socket subscription lifecycle (join/leave room),
    // which should only re-run on socket/user identity change — not on
    // every selectedChat update, which the handlers already read fresh
    // via closure re-creation each render anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, selectedChat, user._id]);

  const prevConversationIdRef = useRef(null);

  useEffect(() => {
    // The messages container only exists while the chat modal is open.
    if (!messagesContainerRef.current) return;
    // Don't auto-scroll to bottom when older messages were just prepended
    // via loadOlderMessages — that has its own scroll-position restore.
    if (isPrependingOlder.current) return;

    const conversationId = selectedChat?.conversationId || null;
    const switchedThread = conversationId !== prevConversationIdRef.current;
    if (switchedThread) {
      // Reset per-thread scroll bookkeeping inline (not a separate
      // effect) so this always resolves before the fresh-thread check
      // below runs in the same pass — avoids an effect-ordering race
      // where a stale hasScrolledToBottom from the previous thread
      // could leak into this one's first render.
      prevConversationIdRef.current = conversationId;
      hasScrolledToBottom.current = false;
      prevMessageCountRef.current = 0;
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      setNewMessagesBelowCount(0);
    }

    // While threadLoading is true the modal renders its skeleton — the real
    // messages aren't in the DOM yet. Scrolling (or consuming the
    // fresh-thread jump) here would be wasted on the skeleton, and this
    // effect wouldn't re-run for the real render since `messages` and the
    // conversationId don't change again. So wait for threadLoading to flip
    // false (it's in the deps below), THEN do the jump. This is what used
    // to leave the modal parked at the top of the thread on open.
    if (threadLoading) return;

    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;
    prevMessageCountRef.current = currentCount;
    // A brand-new thread (conversation switch) or the very first load
    // always jumps to bottom outright — there's no "reading position"
    // to preserve yet.
    const isFreshThread = !hasScrolledToBottom.current;

    if (isFreshThread) {
      // Instant jump — a smooth animation over a long thread on open
      // reads as a glitch.
      scrollMessagesToBottom();
      hasScrolledToBottom.current = true;
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      setNewMessagesBelowCount(0);
      return;
    }

    // messages array also changes on reaction updates (same length, a
    // bubble's reactionSummary mutated) and on read-receipt updates —
    // neither should ever force-scroll regardless of position, only a
    // genuine new message (array grew) is scroll-worthy at all.
    const isNewMessage = currentCount > prevCount;
    if (!isNewMessage) return;

    // Recompute from the DOM rather than trusting isNearBottomRef alone:
    // the ref is only updated on scroll events, and layout shifts (e.g. a
    // chat image finishing loading above the viewport) can move the user
    // away from the bottom without one firing. This is the "never yank a
    // reader" guard.
    const container = messagesContainerRef.current;
    const distanceFromBottom = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : 0;

    if (distanceFromBottom < NEAR_BOTTOM_PX) {
      // Already at/near the bottom — follow the conversation down, the
      // behavior every chat app users expect while actively watching.
      scrollMessagesToBottom("smooth");
    } else {
      // Reading older messages further up — never yank the view. Surface
      // the arrival via the floating "jump to latest" badge instead.
      setNewMessagesBelowCount((c) => c + (currentCount - prevCount));
      setShowScrollToBottom(true);
    }
  }, [
    messages,
    threadLoading,
    selectedChat?.conversationId,
    scrollMessagesToBottom,
  ]);

  return (
    <MainLayout>
      <div className="bg-card border border-stroke rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stroke flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Messages</h2>
          <span className="text-sm text-ink-muted">
            {totalConversationsCount} chats
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stroke">
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-3 text-base font-medium transition ${
              activeTab === "messages"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-3 text-base font-medium transition relative ${
              activeTab === "requests"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Requests
            {requests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] font-bold px-1">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Conversation list */}
        {activeTab === "messages" && (
          <div className="divide-y divide-stroke">
            {loading && <ChatSkeleton />}

            {!loading && conversations.length === 0 && (
              <div className="py-16 text-center">
                <FaComment className="text-3xl mb-2 mx-auto" />
                <p className="text-base text-ink-muted">
                  No conversations yet. Open a profile to start messaging.
                </p>
              </div>
            )}

            {!loading &&
              conversations.map((conv) => {
                const isSelected =
                  selectedChat?.conversationId === conv.conversationId;
                const isOnline = onlineUsers.includes(conv.otherUser._id);
                const isPendingSent = conv.requestStatus === "pending";
                return (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() => loadConversation(conv.otherUser)}
                    className={`w-full text-left px-5 py-4 transition ${isSelected ? "bg-primary-50" : "hover:bg-surface"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={
                            resizedImageUrl(
                              conv.otherUser.profilePic,
                              IMAGE_SIZES.avatarSmall,
                            ) || defaultAvatar
                          }
                          alt={conv.otherUser.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100"
                        />
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${isOnline ? "bg-primary-600" : "bg-gray-300"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-base font-semibold text-ink truncate">
                            {conv.otherUser.name}
                            <VerifiedBadge
                              verifications={conv.otherUser.verifications}
                              size="sm"
                              className="ml-1"
                            />
                            {conv.otherUser.username && (
                              <span className="ml-1 font-normal text-sm text-ink-muted">
                                @{conv.otherUser.username}
                              </span>
                            )}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 min-w-5 h-5 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center px-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-ink-muted truncate">
                          {isPendingSent
                            ? "Message request sent"
                            : conv.lastMessageFromMe
                              ? `You: ${conv.lastMessage}`
                              : conv.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            {!loading && conversationsHasMore && conversations.length > 0 && (
              <div
                ref={conversationsObserverTarget}
                className="py-4 text-center"
              >
                {isLoadingMoreConversations && (
                  <p className="text-sm text-ink-muted">
                    Loading more chats...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Requests list */}
        {activeTab === "requests" && (
          <div className="divide-y divide-stroke">
            {requestsLoading && <ChatSkeleton />}

            {!requestsLoading && requests.length === 0 && (
              <div className="py-16 text-center">
                <FaComment className="text-3xl mb-2 mx-auto" />
                <p className="text-base text-ink-muted">No message requests.</p>
              </div>
            )}

            {!requestsLoading &&
              requests.map((req) => (
                <div key={req.conversationId} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        resizedImageUrl(
                          req.otherUser.profilePic,
                          IMAGE_SIZES.avatarSmall,
                        ) || defaultAvatar
                      }
                      alt={req.otherUser.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-ink truncate">
                        {req.otherUser.name}
                        <VerifiedBadge
                          verifications={req.otherUser.verifications}
                          size="sm"
                          className="ml-1"
                        />
                        {req.otherUser.username && (
                          <span className="ml-1 font-normal text-sm text-ink-muted">
                            @{req.otherUser.username}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-ink-muted truncate">
                        {req.message?.text ||
                          (req.message?.video?.url
                            ? "🎬 Sent a video"
                            : req.message?.images?.length
                              ? "Sent photos"
                              : req.message?.image
                                ? "Sent a photo"
                                : "")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      disabled={requestActionId === req.conversationId}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 transition"
                    >
                      {requestActionId === req.conversationId
                        ? "..."
                        : "Accept"}
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req)}
                      disabled={requestActionId === req.conversationId}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-ink-sub border border-stroke hover:bg-surface disabled:opacity-50 transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {selectedChat && (
        <ChatModal
          isOpen={!!selectedChat}
          onClose={() => setSelectedChat(null)}
          selectedChat={selectedChat}
          messages={messages}
          threadLoading={threadLoading}
          user={user}
          onlineUsers={onlineUsers}
          handleSendMessage={handleSendMessage}
          handleImageSelect={handleImageSelect}
          handleRemoveImage={handleRemoveImage}
          handleVideoSelect={handleVideoSelect}
          handleRemoveVideo={handleRemoveVideo}
          handleDeleteMessage={handleDeleteMessage}
          handleUndoDelete={handleUndoDelete}
          handleReactMessage={handleReactMessage}
          pendingDeletes={pendingDeletes}
          undoWindowMs={UNDO_WINDOW_MS}
          deletingIds={deletingIds}
          messageText={messageText}
          setMessageText={setMessageText}
          imagePreviews={imagePreviews}
          setImagePreviews={setImagePreviews}
          isSending={isSending}
          fileInputRef={fileInputRef}
          videoInputRef={videoInputRef}
          videoFile={videoFile}
          videoPreviewUrl={videoPreviewUrl}
          videoUploads={videoUploads}
          isRecordingVoice={isRecordingVoice}
          recordingElapsed={recordingElapsed}
          maxVoiceDurationSeconds={MAX_VOICE_DURATION_SECONDS}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          voiceUploads={voiceUploads}
          scrollRef={scrollRef}
          messagesContainerRef={messagesContainerRef}
          onMessagesScroll={handleMessagesScroll}
          onMediaLoaded={handleChatMediaLoaded}
          showScrollToBottom={showScrollToBottom}
          newMessagesBelowCount={newMessagesBelowCount}
          onScrollToBottom={() => scrollToBottom("smooth")}
          isLoadingOlderMessages={isLoadingOlderMessages}
          messagesHasMore={messagesHasMore}
          requestInfo={requestInfo}
          onAcceptRequest={() =>
            handleAcceptRequest({
              conversationId: selectedChat.conversationId,
              otherUser: selectedChat.otherUser,
            })
          }
          onDeclineRequest={() =>
            handleDeclineRequest({
              conversationId: selectedChat.conversationId,
              otherUser: selectedChat.otherUser,
            })
          }
          requestActionPending={requestActionId === selectedChat.conversationId}
          handleReportMessage={handleReportMessage}
          onMessageTextChange={handleMessageTextChange}
          otherUserTyping={otherUserTyping}
        />
      )}
    </MainLayout>
  );
};

export default Chat;
