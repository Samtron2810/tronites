import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ChatModal from "../components/ChatModal";
import ChatSkeleton from "../components/ChatSkeleton";
import { FaComment } from "react-icons/fa";
import sfx from "../assets/sfx.mp3";

const buildConversationId = (a, b) =>
  [a.toString(), b.toString()].sort().join("_");

const Chat = () => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
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
  const [imagePreview, setImagePreview] = useState(null);
  const [messageDeletingId, setMessageDeletingId] = useState(null);
  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const scrollRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const conversationsObserverTarget = useRef(null);
  const hasScrolledToBottom = useRef(false);
  const isPrependingOlder = useRef(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/messages/conversations", {
        params: { page: 1, limit: 20 },
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
          setSelectedChat({
            otherUser,
            conversationId: buildConversationId(user._id, otherUser._id),
          });
          setMessages([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      const res = await api.get("/messages/requests");
      setRequests(res.data.requests);
    } catch (e) {
      console.error(e);
    } finally {
      setRequestsLoading(false);
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
      const convsRes = await api.get("/messages/conversations", {
        params: { page: 1, limit: 20 },
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
        lastMessage: message.text,
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

  const handleSendMessage = async () => {
    if (isSending || !selectedChat || (!messageText.trim() && !imagePreview))
      return;
    setIsSending(true);
    try {
      const formData = new FormData();
      if (messageText.trim()) formData.append("text", messageText.trim());
      if (imagePreview) {
        const blob = await (await fetch(imagePreview)).blob();
        formData.append("image", blob);
      }
      const res = await api.post(
        `/messages/${selectedChat.otherUser._id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setMessages((prev) => [...prev, res.data]);
      setMessageText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      updateConversationPreview(res.data, false);
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
      if (code === "REQUEST_PENDING" || code === "DECLINED" || code === "BLOCKED") {
        alert(e.response.data.message);
      } else {
        alert(`Error: ${e?.response?.data?.message || e.message}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDeleteMessage = async (messageId) => {
    if (messageDeletingId) return;
    setMessageDeletingId(messageId);
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (e) {
      console.error(e);
    } finally {
      setMessageDeletingId(null);
    }
  };

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
    fetchConversations();
    fetchRequests();
  }, []);

  useEffect(() => {
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
    if (conversationsObserverTarget.current)
      observer.observe(conversationsObserverTarget.current);
    return () => {
      if (conversationsObserverTarget.current)
        observer.unobserve(conversationsObserverTarget.current);
    };
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
    socket.on("receiveMessage", handleReceive);
    socket.on("messageDeleted", handleDeleted);
    const handleRequestAccepted = (data) => {
      // If we're currently viewing the thread that just got accepted,
      // refresh the gating state so the composer unlocks immediately.
      if (data.conversationId === selectedChat?.conversationId) {
        setRequestInfo({ status: "accepted", isInitiator: true });
      }
    };
    socket.on("messageRequestAccepted", handleRequestAccepted);
    socket.on("messagesRead", (data) => {
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
      socket.off("messagesRead");
      socket.off("messageRequestAccepted", handleRequestAccepted);
      if (selectedChat?.conversationId)
        socket.emit("leaveConversation", selectedChat.conversationId);
    };
  }, [socket, selectedChat, user._id]);

  useEffect(() => {
    if (!scrollRef.current) return;
    // Don't auto-scroll to bottom when older messages were just prepended
    // via loadOlderMessages — that has its own scroll-position restore.
    if (isPrependingOlder.current) return;
    scrollRef.current.scrollIntoView({
      behavior: hasScrolledToBottom.current ? "smooth" : "auto",
    });
    hasScrolledToBottom.current = true;
  }, [messages, selectedChat?.conversationId]);

  useEffect(() => {
    if (!selectedChat) hasScrolledToBottom.current = false;
  }, [selectedChat?.conversationId]);

  return (
    <MainLayout>
      <div className="bg-white border border-stroke rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stroke flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Messages</h2>
          <span className="text-xs text-ink-muted">
            {totalConversationsCount} chats
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stroke">
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === "messages"
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-3 text-sm font-medium transition relative ${
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
                <FaComment className="text-2xl mb-2 mx-auto" />
                <p className="text-sm text-ink-muted">
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
                            conv.otherUser.profilePic ||
                            "https://i.pravatar.cc/150"
                          }
                          alt={conv.otherUser.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100"
                        />
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${isOnline ? "bg-primary-400" : "bg-gray-300"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink truncate">
                            {conv.otherUser.name}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="shrink-0 min-w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center px-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-muted truncate">
                          {isPendingSent ? "Message request sent" : conv.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            {!loading && conversationsHasMore && conversations.length > 0 && (
              <div ref={conversationsObserverTarget} className="py-4 text-center">
                {isLoadingMoreConversations && (
                  <p className="text-xs text-ink-muted">Loading more chats...</p>
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
                <FaComment className="text-2xl mb-2 mx-auto" />
                <p className="text-sm text-ink-muted">No message requests.</p>
              </div>
            )}

            {!requestsLoading &&
              requests.map((req) => (
                <div key={req.conversationId} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.otherUser.profilePic || "https://i.pravatar.cc/150"}
                      alt={req.otherUser.name}
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {req.otherUser.name}
                      </p>
                      <p className="text-xs text-ink-muted truncate">
                        {req.message?.text || (req.message?.image ? "Sent a photo" : "")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      disabled={requestActionId === req.conversationId}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 transition"
                    >
                      {requestActionId === req.conversationId ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req)}
                      disabled={requestActionId === req.conversationId}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-ink-sub border border-stroke hover:bg-surface disabled:opacity-50 transition"
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
          handleDeleteMessage={handleDeleteMessage}
          messageDeletingId={messageDeletingId}
          messageText={messageText}
          setMessageText={setMessageText}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          isSending={isSending}
          fileInputRef={fileInputRef}
          scrollRef={scrollRef}
          messagesContainerRef={messagesContainerRef}
          onMessagesScroll={handleMessagesScroll}
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
        />
      )}
    </MainLayout>
  );
};

export default Chat;
