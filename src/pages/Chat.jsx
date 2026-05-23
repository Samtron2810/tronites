import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scrollRef = useRef(null);

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
    if (!selectedChat || !messageText.trim()) return;

    try {
      const text = messageText.trim();
      const res = await api.post(`/messages/${selectedChat.otherUser._id}`, {
        text,
      });
      setMessages((prev) => [...prev, res.data]);
      setMessageText("");
      updateConversationPreview(res.data, false);
    } catch (error) {
      console.error("Send message failed:", error);
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

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [socket, selectedChat, user._id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const activeUser = selectedChat?.otherUser;
  const activeIsOnline = activeUser
    ? onlineUsers.includes(activeUser._id)
    : false;

  return (
    <MainLayout>
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h2 className="font-bold text-lg">Messages</h2>
            <span className="text-sm text-gray-500">
              {conversations.length} chats
            </span>
          </div>

          <div className="divide-y">
            {loading && (
              <div className="p-6 text-center text-gray-500">
                Loading chats...
              </div>
            )}

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

        <div className="bg-white rounded-2xl shadow-md flex flex-col overflow-hidden">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">
                {activeUser ? activeUser.name : "Select a chat"}
              </p>
              {activeUser && (
                <p className="text-sm text-gray-500">
                  {activeIsOnline ? "Online" : "Offline"}
                </p>
              )}
            </div>
            {activeUser && (
              <img
                src={activeUser.profilePic || "https://i.pravatar.cc/150"}
                alt={activeUser.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {threadLoading && (
              <div className="text-center text-gray-500">
                Loading conversation...
              </div>
            )}

            {!threadLoading && !activeUser && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <p className="text-lg font-semibold">
                  No conversation selected
                </p>
                <p className="text-sm mt-2">
                  Pick a chat from the left or open a profile to start
                  messaging.
                </p>
              </div>
            )}

            {!threadLoading && activeUser && (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isMine = message.sender._id === user._id;
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-4 ${
                          isMine
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.text}</p>
                        <p className="text-[11px] mt-2 text-right text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {activeUser && (
            <div className="border-t px-6 py-4">
              <div className="flex items-center gap-3">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Write a message..."
                  className="flex-1 border rounded-2xl px-4 py-3 outline-none focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-2xl font-semibold"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Chat;
