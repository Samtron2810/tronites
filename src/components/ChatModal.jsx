import { FiArrowLeft, FiTrash2, FiImage, FiCheck } from "react-icons/fi";
import { FaCheckDouble } from "react-icons/fa";

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
  messageDeletingId,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden overflow-x-hidden flex flex-col border border-stroke">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stroke">
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface transition disabled:opacity-40"
          >
            <FiArrowLeft size={16} />
          </button>
          <div className="relative shrink-0">
            <img
              src={activeUser?.profilePic || "https://i.pravatar.cc/150"}
              alt={activeUser?.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-100"
            />
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${activeIsOnline ? "bg-primary-400" : "bg-gray-300"}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink truncate">
              {activeUser?.name}
            </p>
            <p
              className={`text-xs ${activeIsOnline ? "text-primary-600" : "text-ink-muted"}`}
            >
              {activeIsOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-4 space-y-3 bg-surface">
          {threadLoading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`h-9 rounded-2xl ${i % 2 === 0 ? "bg-primary-200 w-40" : "bg-gray-200 w-52"}`}
                  />
                </div>
              ))}
            </div>
          )}

          {!threadLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center">
              <p className="text-2xl mb-2">👋</p>
              <p className="text-sm text-ink-muted">No messages yet. Say hi!</p>
            </div>
          )}

          {messages.map((message) => {
            const isMine = message.sender._id === user._id;
            return (
              <div
                key={message._id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex flex-col max-w-[75%] min-w-0 wrap-break-word gap-1`}
                >
                  {message.image && (
                    <img
                      src={message.image}
                      alt="message"
                      className={`rounded-xl max-w-full h-auto object-cover ${isMine ? "ml-auto" : ""}`}
                    />
                  )}
                  {message.text && (
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                        isMine
                          ? "bg-primary-600 text-white self-end rounded-br-sm"
                          : "bg-white text-ink self-start rounded-bl-sm border border-stroke"
                      }`}
                    >
                      {message.text}
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <p className="text-[10px] text-ink-muted">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {isMine && (
                      <>
                        <button
                          onClick={() => handleDeleteMessage(message._id)}
                          disabled={messageDeletingId === message._id}
                          className="text-ink-muted hover:text-red-500 transition disabled:opacity-40"
                        >
                          <FiTrash2 size={11} />
                        </button>
                        <span
                          className={
                            message.read ? "text-primary-400" : "text-ink-muted"
                          }
                        >
                          {message.read ? (
                            <FaCheckDouble size={11} />
                          ) : (
                            <FiCheck size={11} />
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t border-stroke px-4 py-3 bg-white">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img
                src={imagePreview}
                alt="preview"
                className="w-20 h-20 object-cover rounded-xl"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
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
              className="flex-1 border border-stroke rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="p-2.5 rounded-xl border border-stroke text-ink-muted hover:text-primary-600 hover:border-primary-400 transition disabled:opacity-40"
              title="Attach image"
            >
              <FiImage size={16} />
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
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
