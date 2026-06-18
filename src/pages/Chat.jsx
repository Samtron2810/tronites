import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FaTrash, FaCheck, FaCheckDouble, FaImage } from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ChatModal from "../components/ChatModal";
import ChatSkeleton from "../components/ChatSkeleton";

const buildConversationId = (userA, userB) => {
  return [userA.toString(), userB.toString()].sort().join("_");
};

const Chat = () => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
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
        const existing = res.data.find(
          (conv) => conv.otherUser._id === urlUserId,
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
    } catch (error) {
      console.error("Fetch conversations failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (otherUser) => {
    try {
      setThreadLoading(true);
      const res = await api.get(`/messages/${otherUser._id}`);
      setMessages(res.data);
      setSelectedChat({
        otherUser,
        conversationId: buildConversationId(user._id, otherUser._id),
      });

      // Refetch conversations to update unread count
      const conversationsRes = await api.get("/messages/conversations");
      setConversations(conversationsRes.data);
    } catch (error) {
      console.error("Load conversation failed:", error);
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
      const existing = prev.find(
        (conv) => conv.conversationId === conversationId,
      );
      const preview = {
        conversationId,
        otherUser,
        lastMessage: message.text,
        lastMessageAt: message.createdAt,
        unreadCount: incrementUnread
          ? (existing?.unreadCount || 0) + 1
          : existing?.unreadCount || 0,
      };

      const filtered = prev.filter(
        (conv) => conv.conversationId !== conversationId,
      );
      return [preview, ...filtered];
    });
  };

  const handleSendMessage = async () => {
    if (isSending || !selectedChat || (!messageText.trim() && !imagePreview))
      return;

    setIsSending(true);
    try {
      // Use FormData for better file handling
      const formData = new FormData();
      if (messageText.trim()) formData.append("text", messageText.trim());
      if (imagePreview) {
        // Convert base64 to blob
        const response = await fetch(imagePreview);
        const blob = await response.blob();
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
    } catch (error) {
      console.error(
        "Send message failed:",
        error?.response?.data || error.message,
      );
      alert(
        `Error sending message: ${error?.response?.data?.message || error.message}`,
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (messageDeletingId) return;

    setMessageDeletingId(messageId);
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    } catch (error) {
      console.error("Delete message failed:", error);
    } finally {
      setMessageDeletingId(null);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      const incomingFromCurrent =
        selectedChat?.otherUser?._id === message.sender._id ||
        selectedChat?.otherUser?._id === message.receiver._id;

      if (incomingFromCurrent && message.sender._id !== user._id) {
        setMessages((prev) => [...prev, message]);
      }
      updateConversationPreview(message, message.receiver._id === user._id);
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messagesRead", (data) => {
      if (data.conversationId === selectedChat?.conversationId) {
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            read: msg.receiver._id === user._id ? msg.read : true,
          })),
        );
      }
    });

    if (selectedChat?.conversationId) {
      socket.emit("joinConversation", selectedChat.conversationId);
    }

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messagesRead");
      if (selectedChat?.conversationId) {
        socket.emit("leaveConversation", selectedChat.conversationId);
      }
    };
  }, [socket, selectedChat, user._id]);

  useEffect(() => {
    if (!scrollRef.current) return;

    const behavior = hasScrolledToBottom.current ? "smooth" : "auto";
    scrollRef.current.scrollIntoView({ behavior });
    hasScrolledToBottom.current = true;
  }, [messages, selectedChat?.conversationId]);

  useEffect(() => {
    if (!selectedChat) {
      hasScrolledToBottom.current = false;
    }
  }, [selectedChat?.conversationId]);

  const activeUser = selectedChat?.otherUser;
  const activeIsOnline = activeUser
    ? onlineUsers.includes(activeUser._id)
    : false;

  return (
    <MainLayout>
      <div className="grid gap-6">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h2 className="font-bold text-lg">Messages</h2>
            <span className="text-sm text-gray-500">
              {conversations.length} chats
            </span>
          </div>

          <div className="divide-y">
            {loading && <ChatSkeleton />}

            {!loading && conversations.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No conversations yet. Open a profile to start messaging.
              </div>
            )}

            {!loading &&
              conversations.map((conversation) => {
                const isSelected =
                  selectedChat?.conversationId === conversation.conversationId;
                const isOnline = onlineUsers.includes(
                  conversation.otherUser._id,
                );

                return (
                  <button
                    key={conversation.conversationId}
                    type="button"
                    onClick={() => loadConversation(conversation.otherUser)}
                    className={`w-full text-left px-5 py-4 transition ${
                      isSelected ? "bg-orange-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={
                            conversation.otherUser.profilePic ||
                            "https://i.pravatar.cc/150"
                          }
                          alt={conversation.otherUser.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <span
                          className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            isOnline ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-gray-900">
                            {conversation.otherUser.name}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-6 h-6 rounded-full bg-blue-500 text-white text-xs">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Modal-based conversation view */}
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
      </div>
    </MainLayout>
  );
};

export default Chat;
