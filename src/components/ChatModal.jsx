import { Fragment, useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiTrash2,
  FiImage,
  FiVideo,
  FiCheck,
  FiFlag,
} from "react-icons/fi";
import ChatVideoMessage from "./ChatVideoMessage";
import ReportModal from "./ReportModal";
import { FaCheckDouble } from "react-icons/fa";
import defaultAvatar from "../assets/defaultAvatar";
import {
  dayKey,
  formatDayLabel,
  formatMessageTime,
} from "../utils/chatDate";

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
  handleRemoveImage,
  handleVideoSelect,
  handleRemoveVideo,
  handleDeleteMessage,
  handleUndoDelete,
  pendingDeletes,
  deletingIds,
  messageText,
  setMessageText,
  imagePreviews,
  isSending,
  fileInputRef,
  videoInputRef,
  videoFile,
  videoPreviewUrl,
  // In-flight background video sends (one progress bar each). Their
  // presence does NOT lock the composer — text/image sending continues.
  videoUploads,
  scrollRef,
  messagesContainerRef,
  onMessagesScroll,
  isLoadingOlderMessages,
  messagesHasMore,
  requestInfo,
  onAcceptRequest,
  onDeclineRequest,
  requestActionPending,
  // Submits a message report ({ message, reason, details }) and resolves
  // to true only when it succeeded — owned by Chat.jsx like every other
  // mutation; this component just collects the UI input.
  handleReportMessage,
}) => {
  const [now, setNow] = useState(() => Date.now());
  // Message currently being reported via ReportModal (null when closed).
  // Only other users' bubbles expose the flag trigger.
  const [reportingMessage, setReportingMessage] = useState(null);
  const hasPendingDeletes = Object.keys(pendingDeletes).length > 0;

  useEffect(() => {
    if (!hasPendingDeletes) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [hasPendingDeletes]);

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

      <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden overflow-x-hidden flex flex-col border border-stroke">
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
              src={activeUser?.profilePic || defaultAvatar}
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
              {activeUser?.username && (
                <span className="ml-1 font-normal text-xs text-ink-muted">
                  @{activeUser.username}
                </span>
              )}
            </p>
            <p
              className={`text-xs ${activeIsOnline ? "text-primary-600" : "text-ink-muted"}`}
            >
              {activeIsOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={onMessagesScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-4 space-y-3 bg-surface"
        >
          {isLoadingOlderMessages && (
            <p className="text-center text-[11px] text-ink-muted py-1">
              Loading older messages...
            </p>
          )}
          {!threadLoading &&
            !isLoadingOlderMessages &&
            !messagesHasMore &&
            messages.length > 0 && (
              <p className="text-center text-[11px] text-ink-muted py-1">
                Start of conversation
              </p>
            )}
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

          {messages.map((message, idx) => {
            const isMine = message.sender._id === user._id;
            // Date context: a centered chip above the first message and
            // again whenever the local calendar day changes between
            // consecutive messages, so time-only stamps stay unambiguous.
            const curKey = dayKey(message.createdAt);
            const prevKey = idx > 0 ? dayKey(messages[idx - 1].createdAt) : "";
            const showDayDivider =
              (idx === 0 && curKey !== "") ||
              (curKey !== "" && prevKey !== "" && curKey !== prevKey);
            const isPendingDelete = !!pendingDeletes[message._id];
            const isDeleting = deletingIds.includes(message._id);
            const showDeletedPlaceholder = isPendingDelete || isDeleting;
            const remainingSecs = isPendingDelete
              ? Math.max(
                  0,
                  Math.ceil((pendingDeletes[message._id] - now) / 1000),
                )
              : 0;
            return (
              <Fragment key={message._id}>
                {showDayDivider && (
                  <div className="flex justify-center py-1">
                    <span className="text-[10px] font-medium text-ink-muted bg-surface border border-stroke rounded-full px-3 py-0.5">
                      {formatDayLabel(message.createdAt)}
                    </span>
                  </div>
                )}
              <div
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex flex-col max-w-[75%] min-w-0 wrap-break-word gap-1`}
                >
                  {showDeletedPlaceholder ? (
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm border ${
                        isMine
                          ? "bg-surface text-ink-sub self-end rounded-br-sm border-stroke"
                          : "bg-card text-ink-muted self-start rounded-bl-sm border-stroke"
                      }`}
                    >
                      {isDeleting ? (
                        <span className="flex items-center gap-2">
                          Deleting…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Message deleted ({remainingSecs}s)
                          <button
                            onClick={() => handleUndoDelete(message._id)}
                            className="text-primary-600 hover:text-primary-800 font-semibold transition"
                          >
                            Undo
                          </button>
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      {message.video?.url && (
                        <ChatVideoMessage
                          url={message.video.url}
                          poster={message.video.thumbnailUrl}
                          alignmentClass={isMine ? "ml-auto self-end" : "self-start"}
                        />
                      )}
                      {(() => {
                        const images = message.images?.length
                          ? message.images
                          : message.image
                            ? [message.image]
                            : [];
                        if (images.length === 0) return null;
                        return (
                          <div
                            className={`grid grid-cols-2 gap-1 rounded-xl overflow-hidden ${isMine ? "ml-auto" : ""}`}
                          >
                            {images.map((src, idx) => (
                              <img
                                key={idx}
                                src={src}
                                alt={`message ${idx + 1}`}
                                className={`w-full h-auto object-cover ${
                                  images.length === 1
                                    ? "col-span-2"
                                    : images.length === 3 && idx === 0
                                      ? "col-span-2"
                                      : ""
                                }`}
                              />
                            ))}
                          </div>
                        );
                      })()}
                      {message.text && (
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                            isMine
                              ? "bg-primary-600 text-white self-end rounded-br-sm"
                              : "bg-card text-ink self-start rounded-bl-sm border border-stroke"
                          }`}
                        >
                          {message.text}
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <p
                          className="text-[10px] text-ink-muted"
                          title={new Date(message.createdAt).toLocaleString()}
                        >
                          {formatMessageTime(message.createdAt)}
                        </p>
                        {!isMine && (
                          <button
                            onClick={() => setReportingMessage(message)}
                            title="Report message"
                            aria-label="Report message"
                            className="text-ink-muted hover:text-red-500 transition"
                          >
                            <FiFlag size={11} />
                          </button>
                        )}
                        {isMine && (
                          <>
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              disabled={isDeleting}
                              className="text-ink-muted hover:text-red-500 transition disabled:opacity-40"
                            >
                              <FiTrash2 size={11} />
                            </button>
                            <span
                              className={
                                message.read
                                  ? "text-primary-400"
                                  : "text-ink-muted"
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
                    </>
                  )}
                </div>
              </div>
              </Fragment>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="border-t border-stroke px-4 py-3 bg-card">
          {requestInfo?.status === "pending" && !requestInfo.isInitiator && (
            <div>
              <p className="text-xs text-ink-muted mb-2 text-center">
                {activeUser?.name} sent you a message request
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onAcceptRequest}
                  disabled={requestActionPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 transition"
                >
                  {requestActionPending ? "..." : "Accept"}
                </button>
                <button
                  onClick={onDeclineRequest}
                  disabled={requestActionPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink-sub border border-stroke hover:bg-surface disabled:opacity-50 transition"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {requestInfo?.status === "pending" && requestInfo.isInitiator && (
            <p className="text-xs text-ink-muted text-center py-2">
              Message request sent — waiting for {activeUser?.name} to accept.
            </p>
          )}

          {(requestInfo?.status === "declined" ||
            requestInfo?.status === "blocked") && (
            <p className="text-xs text-ink-muted text-center py-2">
              You can't message this user.
            </p>
          )}

          {(!requestInfo || requestInfo.status === "accepted") && (
            <>
              {videoUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="mb-3 rounded-xl border border-stroke bg-surface px-3 py-2"
                >
                  <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
                    <span className="truncate max-w-[70%]">
                      Uploading {upload.name}…
                    </span>
                    <span>{Math.min(upload.progress, 99)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-primary-600 transition-all"
                      style={{
                        width: `${Math.min(upload.progress, 99)}%`,
                      }}
                    />
                  </div>
                  {upload.progress >= 100 && (
                    <p className="text-[11px] text-ink-muted mt-1">
                      Processing video…
                    </p>
                  )}
                </div>
              ))}
              {videoPreviewUrl && (
                <div className="mb-3 relative max-w-55">
                  <video
                    src={videoPreviewUrl}
                    controls={false}
                    playsInline
                    muted
                    preload="metadata"
                    className="w-full h-28 object-cover rounded-xl bg-black"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                  {videoFile && (
                    <p className="text-[10px] text-ink-muted mt-0.5 truncate">
                      {videoFile.name}
                    </p>
                  )}
                </div>
              )}
              {imagePreviews.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={preview}
                        alt={`preview ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-xl"
                      />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
                  disabled={!!videoFile}
                  className="p-2.5 rounded-xl border border-stroke text-ink-muted hover:text-primary-600 hover:border-primary-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Attach image"
                >
                  <FiImage size={16} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={!!videoFile || imagePreviews.length > 0}
                  className="p-2.5 rounded-xl border border-stroke text-ink-muted hover:text-primary-600 hover:border-primary-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Attach video"
                >
                  <FiVideo size={16} />
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={
                    (!messageText.trim() &&
                      imagePreviews.length === 0 &&
                      !videoFile) ||
                    isSending
                  }
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isSending ? "..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>

        {reportingMessage && (
          <ReportModal
            targetLabel="this message"
            onConfirm={async ({ reason, details }) => {
              const ok = await handleReportMessage({
                message: reportingMessage,
                reason,
                details,
              });
              // Close only on success, like Profile.jsx does — a failed
              // submit keeps the modal open with the chosen reason intact.
              if (ok) setReportingMessage(null);
            }}
            onCancel={() => setReportingMessage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ChatModal;
