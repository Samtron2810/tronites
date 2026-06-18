import React from "react";
import {
  FaArrowLeft,
  FaTrash,
  FaCheck,
  FaCheckDouble,
  FaImage,
} from "react-icons/fa";

const ChatModal = ({
  isOpen,
  onClose,
  selectedChat,
  messages,
  threadLoading,
  user,
  onlineUsers,
  handleSendMessage,
  handleImageSelect,
  handleDeleteMessage,
  messageText,
  setMessageText,
  imagePreview,
  setImagePreview,
  isSending,
  fileInputRef,
  scrollRef,
}) => {
  if (!isOpen || !selectedChat) return null;

  const activeUser = selectedChat.otherUser;
  const activeIsOnline = activeUser
    ? onlineUsers.includes(activeUser._id)
    : false;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <FaArrowLeft />
          </button>
          <div className="flex-1">
            <div className="font-semibold">{activeUser?.name}</div>
            <div className="text-xs text-gray-500">
              {activeIsOnline ? "Online" : "Offline"}
            </div>
          </div>
          {activeUser && (
            <img
              src={activeUser.profilePic || "https://i.pravatar.cc/150"}
              alt={activeUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadLoading && (
            <div className="space-y-4 p-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 px-4">
                  <div className="w-9 h-9 rounded-full bg-gray-300 shrink-0"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!threadLoading && messages.length === 0 && (
            <div className="text-center text-gray-500">
              No messages yet. Say hi!
            </div>
          )}

          {messages.map((message) => {
            const isMine = message.sender._id === user._id;
            return (
              <div
                key={message._id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="flex flex-col max-w-[80%]">
                  {message.image && (
                    <img
                      src={message.image}
                      alt="message"
                      className={`rounded-2xl max-w-xs h-auto object-cover ${isMine ? "ml-auto" : ""}`}
                    />
                  )}
                  {message.text && (
                    <div
                      className={`w-fit px-4 py-3 rounded-2xl whitespace-pre-wrap ${isMine ? "bg-orange-500 text-white self-end" : "bg-gray-100 text-gray-900 self-start"}`}
                    >
                      {message.text}
                    </div>
                  )}
                  <div
                    className={`flex items-center mt-1 gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <p className="text-[11px] text-gray-500">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {isMine && (
                      <button
                        onClick={() => handleDeleteMessage(message._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash size={14} />
                      </button>
                    )}
                    {isMine && (
                      <span
                        className={`text-xs ${message.read ? "text-blue-500" : "text-gray-400"}`}
                        title={message.read ? "Read" : "Sent"}
                      >
                        {message.read ? (
                          <FaCheckDouble size={12} />
                        ) : (
                          <FaCheck size={12} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        <div className="border-t px-4 py-3">
          {imagePreview && (
            <div className="mb-3 relative">
              <img
                src={imagePreview}
                alt="preview"
                className="w-24 h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          )}

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
              className="flex-1 border rounded-2xl px-4 py-3 outline-none"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-orange-500 border-3 border-orange-500 hover:bg-orange-200 rounded-full p-3 text-xl transition"
              title="Attach image"
            >
              <FaImage />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={(!messageText.trim() && !imagePreview) || isSending}
              className={`px-5 py-3 rounded-2xl font-semibold text-white transition ${(!messageText.trim() && !imagePreview) || isSending ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}`}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
