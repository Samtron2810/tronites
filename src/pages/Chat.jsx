import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ChatModal from "../components/ChatModal";
import ChatSkeleton from "../components/ChatSkeleton";
import sfx from "../assets/sfx.mp3";

const buildConversationId = (a, b) =>
  [a.toString(), b.toString()].sort().join("_");

const Chat = () => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const audioRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [messageDeletingId, setMessageDeletingId] = useState(null);
  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const scrollRef = useRef(null);
  const hasScrolledToBottom = useRef(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/messages/conversations");
      setConversations(res.data);
      const urlUserId = searchParams.get("user");
      if (urlUserId) {
        const existing = res.data.find((c) => c.otherUser._id === urlUserId);
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

  const loadConversation = async (otherUser) => {
    try {
      setThreadLoading(true);
      // Server paginates thread history (most recent page, oldest-first)
      const res = await api.get(`/messages/${otherUser._id}`, {
        params: { page: 1, limit: 30 },
      });
      setMessages(res.data.messages);
      setSelectedChat({
        otherUser,
        conversationId: buildConversationId(user._id, otherUser._id),
      });
      const convsRes = await api.get("/messages/conversations");
      setConversations(convsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setThreadLoading(false);
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
    } catch (e) {
      alert(`Error: ${e?.response?.data?.message || e.message}`);
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

  useEffect(() => {
    audioRef.current = new Audio(sfx);
    audioRef.current.preload = "auto";
    audioRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReceive = (message) => {
      const inCurrent =
        selectedChat?.otherUser?._id === message.sender._id ||
        selectedChat?.otherUser?._id === message.receiver._id;
      if (inCurrent && message.sender._id !== user._id) {
        setMessages((prev) => [...prev, message]);
        try {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            void audioRef.current.play();
          }
        } catch (error) {
          // Ignore play failures due to browser autoplay restrictions.
        }
      }
      updateConversationPreview(message, message.receiver._id === user._id);
    };
    const handleDeleted = ({ messageId }) =>
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    socket.on("receiveMessage", handleReceive);
    socket.on("messageDeleted", handleDeleted);
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
      if (selectedChat?.conversationId)
        socket.emit("leaveConversation", selectedChat.conversationId);
    };
  }, [socket, selectedChat, user._id]);

  useEffect(() => {
    if (!scrollRef.current) return;
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
            {conversations.length} chats
          </span>
        </div>

        {/* Conversation list */}
        <div className="divide-y divide-stroke">
          {loading && <ChatSkeleton />}

          {!loading && conversations.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-2xl mb-2">💬</p>
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
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
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
        />
      )}
    </MainLayout>
  );
};

export default Chat;
