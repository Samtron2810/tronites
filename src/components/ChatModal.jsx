import { Fragment, useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiImage,
  FiVideo,
  FiCheck,
  FiMic,
  FiX,
} from "react-icons/fi";
import ChatMediaViewer from "./ChatMediaViewer";
import VoiceNotePlayer from "./VoiceNotePlayer";
import ReportModal from "./ReportModal";
import MessageOptionsMenu from "./MessageOptionsMenu";
import TextWithLinks from "./TextWithLinks";
import ReactionPicker from "./ReactionPicker";
import ReactionSummaryBar from "./ReactionSummaryBar";
import { FaCheckDouble, FaChevronDown, FaPlay } from "react-icons/fa";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { dayKey, formatDayLabel, formatMessageTime } from "../utils/chatDate";
import useBackButtonClose from "../hooks/useBackButtonClose";

// 63 -> "1:03", 7 -> "0:07" — used only for the static video-thumbnail's
// duration badge; the full-screen viewer's native controls show timing
// during actual playback.
const formatChatDuration = (seconds) => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

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
  handleReactMessage,
  pendingDeletes,
  // Undo window length (ms) — Chat.jsx owns the delete grace period and
  // passes the same constant it stamps deadlines with, so this display can
  // clamp against it without duplicating the number.
  undoWindowMs = 5000,
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
  // Voice-note recording — mirrors the video-attach fields above but for
  // the mic flow. isRecordingVoice swaps the composer for a live-timer
  // recording bar; onStopRecording({ send }) is called by both the ✕
  // (discard) and ✓ (send) buttons.
  isRecordingVoice,
  recordingElapsed,
  maxVoiceDurationSeconds,
  onStartRecording,
  onStopRecording,
  // In-flight background voice-note sends — same one-bar-per-item pattern
  // as videoUploads.
  voiceUploads,
  scrollRef,
  messagesContainerRef,
  onMessagesScroll,
  // Fires when any media bubble's image/video finishes loading — Chat.jsx
  // re-anchors the thread to its bottom while the user is parked there,
  // since h-auto media grows the thread after it has been laid out.
  onMediaLoaded,
  // Floating "jump to latest" affordance — Chat.jsx owns the near-bottom
  // detection (see handleMessagesScroll) and just tells this component
  // whether to show the button and what badge count to render.
  showScrollToBottom,
  newMessagesBelowCount,
  onScrollToBottom,
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
  // Called on every composer keystroke instead of setMessageText directly
  // so Chat.jsx can piggyback the typing/stopTyping socket emits on the
  // same change event without this component knowing about sockets.
  onMessageTextChange,
  // True while the other participant has an active "typing" broadcast
  // for this open thread (server-pushed, auto-expires — see Chat.jsx).
  otherUserTyping,
}) => {
  // Mobile back button closes the conversation modal; UI closes consume
  // the pushed history entry so history stays balanced (see the hook).
  useBackButtonClose(isOpen, onClose);
  const [now, setNow] = useState(() => Date.now());
  // Message currently being reported via ReportModal (null when closed).
  // Only other users' bubbles expose the flag trigger.
  const [reportingMessage, setReportingMessage] = useState(null);
  // Which message's reaction picker is open (null when none) — only one
  // at a time, same convention as the options menu.
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  // Viewport coords {x, y} of the click/touch that opened the picker
  // currently shown — the picker renders 5px above THIS point (see
  // ReactionPicker's anchorPoint prop), not flush above the bubble.
  const [reactionAnchorPoint, setReactionAnchorPoint] = useState(null);
  // Bounding rect for the reaction picker's clamping — the modal panel
  // itself, not the viewport, since the panel is a centered max-w-2xl box
  // that's narrower than the screen on desktop. See ReactionPicker's
  // boundsRef prop.
  const panelRef = useRef(null);
  // Full-screen media viewer (ChatMediaViewer) — null when closed. Video
  // messages open it as { type: "video", video }, image messages as
  // { type: "image", images, index }, where index is the tapped grid cell
  // so the carousel starts on the exact image that was clicked.
  const [mediaViewer, setMediaViewer] = useState(null);
  // Long-press state: timer handle for the pending press, and a flag that
  // tells the following click/tap handler to no-op so a long-press
  // doesn't also register as a single tap once the finger/mouse lifts.
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  // Live pointer position during a hold — a finger/mouse can drift a few
  // px without the browser treating it as a "move" cancel, so the picker
  // anchors to where the press ends up, not just where it started.
  const longPressPointRef = useRef(null);
  // Start point of the current touch — compared against live position in
  // onTouchMove to tell a hold apart from a scroll. A genuine long-press
  // stays within a few px; a scroll moves well past that within the same
  // 450ms window, so we cancel the pending timer as soon as the finger
  // drifts too far instead of waiting for touchend/touchcancel (which
  // don't fire until the finger lifts, by which point a slow scroll would
  // have already triggered the picker).
  const longPressStartRef = useRef(null);
  const LONG_PRESS_MS = 450;
  const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Returns the on*Start/End/Cancel handlers for one bubble. Works for
  // both touch (onTouchStart/End/Cancel) and mouse (onMouseDown/Up/Leave)
  // so desktop users get the same affordance instead of being limited to
  // double-click. Fires reactionPickerFor after LONG_PRESS_MS of holding,
  // anchored to the current pointer position; any move/release/cancel
  // before that just cancels the timer.
  const longPressHandlers = (messageId) => ({
    onTouchStart: (e) => {
      const touch = e.touches[0];
      longPressPointRef.current = { x: touch.clientX, y: touch.clientY };
      longPressStartRef.current = { x: touch.clientX, y: touch.clientY };
      longPressFiredRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setReactionAnchorPoint(longPressPointRef.current);
        setReactionPickerFor(messageId);
        if (navigator.vibrate) navigator.vibrate(15);
      }, LONG_PRESS_MS);
    },
    onTouchMove: (e) => {
      const touch = e.touches[0];
      longPressPointRef.current = { x: touch.clientX, y: touch.clientY };
      const start = longPressStartRef.current;
      if (!start) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) {
        clearLongPressTimer();
      }
    },
    onTouchEnd: clearLongPressTimer,
    onTouchCancel: clearLongPressTimer,
    onMouseDown: (e) => {
      longPressPointRef.current = { x: e.clientX, y: e.clientY };
      longPressStartRef.current = { x: e.clientX, y: e.clientY };
      longPressFiredRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        setReactionAnchorPoint(longPressPointRef.current);
        setReactionPickerFor(messageId);
      }, LONG_PRESS_MS);
    },
    onMouseMove: (e) => {
      if (!longPressTimerRef.current) return;
      const start = longPressStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) {
        clearLongPressTimer();
      }
    },
    onMouseUp: clearLongPressTimer,
    onMouseLeave: clearLongPressTimer,
  });

  const hasPendingDeletes = Object.keys(pendingDeletes).length > 0;

  // Media bubbles (video thumbnails, image grid cells) open the full-screen
  // viewer on click — except when the click is the trailing event of a
  // fired long-press, which already opened the reaction picker and must
  // not ALSO open the viewer. Reactions on every bubble type are long-press
  // only; double-click/double-tap no longer triggers anything.
  const openMediaViewer = (payload) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    setMediaViewer(payload);
  };

  // The countdown clock: `now` only ticks while at least one delete is
  // pending (this interval stops otherwise), so when a NEW delete starts
  // it can be stale by minutes — ChatModal stays mounted (returning null)
  // after close, and the last tick froze whenever the previous countdown
  // ended. The first interval tick re-grounds it within 250ms; the
  // remainingSecs clamp below makes sure that first, pre-tick frame
  // already displays a sane number instead of a huge flash.
  useEffect(() => {
    if (!hasPendingDeletes) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [hasPendingDeletes]);

  useEffect(() => clearLongPressTimer, []);

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

      <div
        ref={panelRef}
        className="relative bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-hidden overflow-x-hidden flex flex-col border border-stroke"
      >
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
              src={
                resizedImageUrl(
                  activeUser?.profilePic,
                  IMAGE_SIZES.avatarSmall,
                ) || defaultAvatar
              }
              alt={activeUser?.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-100"
            />
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${activeIsOnline ? "bg-primary-400" : "bg-gray-300"}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-ink truncate">
              {activeUser?.name}
              {activeUser?.username && (
                <span className="ml-1 font-normal text-sm text-ink-muted">
                  @{activeUser.username}
                </span>
              )}
            </p>
            <p
              className={`text-sm transition-colors ${
                otherUserTyping
                  ? "text-primary-600 font-medium"
                  : activeIsOnline
                    ? "text-primary-600"
                    : "text-ink-muted"
              }`}
            >
              {otherUserTyping ? (
                <span className="inline-flex items-center gap-1">
                  typing
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-primary-600 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 rounded-full bg-primary-600 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 rounded-full bg-primary-600 animate-bounce" />
                  </span>
                </span>
              ) : activeIsOnline ? (
                "Online"
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={messagesContainerRef}
            onScroll={onMessagesScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-4 space-y-3 app-bg"
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
                <p className="text-3xl mb-2">👋</p>
                <p className="text-base text-ink-muted">
                  No messages yet. Say hi!
                </p>
              </div>
            )}

            {messages.map((message, idx) => {
              const isMine = message.sender._id === user._id;
              // Date context: a centered chip above the first message and
              // again whenever the local calendar day changes between
              // consecutive messages, so time-only stamps stay unambiguous.
              const curKey = dayKey(message.createdAt);
              const prevKey =
                idx > 0 ? dayKey(messages[idx - 1].createdAt) : "";
              const showDayDivider =
                (idx === 0 && curKey !== "") ||
                (curKey !== "" && prevKey !== "" && curKey !== prevKey);
              const isPendingDelete = !!pendingDeletes[message._id];
              const isDeleting = deletingIds.includes(message._id);
              const showDeletedPlaceholder = isPendingDelete || isDeleting;
              // Remaining undo seconds. The upper clamp exists because
              // `now` can be up to a few hundred ms — or, on a modal that
              // has been open a while, minutes — behind real time when a
              // delete first appears. Remaining can never legitimately
              // exceed the undo window, so clamping to it turns what used
              // to flash as "(stale clock gap + 5s)" into the correct
              // starting number until the interval's first tick lands.
              const remainingSecs = isPendingDelete
                ? Math.max(
                    0,
                    Math.min(
                      Math.ceil(undoWindowMs / 1000),
                      Math.ceil((pendingDeletes[message._id] - now) / 1000),
                    ),
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
                          className={`px-4 py-2.5 rounded-2xl text-base border ${
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
                          {message.voice?.url && (
                            <div className="relative flex flex-col">
                              <div
                                {...longPressHandlers(message._id)}
                                className={`select-none flex ${
                                  isMine ? "justify-end" : "justify-start"
                                }`}
                              >
                                <VoiceNotePlayer
                                  voice={message.voice}
                                  isMine={isMine}
                                />
                              </div>
                            </div>
                          )}
                          {message.video?.url && (
                            <div className="relative">
                              <div
                                onClick={() =>
                                  openMediaViewer({
                                    type: "video",
                                    video: message.video,
                                  })
                                }
                                {...longPressHandlers(message._id)}
                                className={`cursor-pointer select-none w-[90%] min-w-18 max-w-45 ${
                                  isMine ? "ml-auto" : ""
                                }`}
                              >
                                {/* Static thumbnail — the conversation never
                                plays video inline (no controls, no sound);
                                tapping opens the full-screen viewer. */}
                                <div className="relative rounded-xl overflow-hidden bg-black border border-stroke">
                                  {message.video.thumbnailUrl ? (
                                    <img
                                      src={resizedImageUrl(
                                        message.video.thumbnailUrl,
                                        IMAGE_SIZES.chatThumbnail,
                                      )}
                                      alt="video message"
                                      draggable={false}
                                      onLoad={onMediaLoaded}
                                      className="w-full h-auto object-cover"
                                    />
                                  ) : (
                                    <video
                                      src={`${message.video.url}#t=0.1`}
                                      preload="metadata"
                                      muted
                                      playsInline
                                      onLoadedData={onMediaLoaded}
                                      className="w-full h-auto object-cover pointer-events-none"
                                    />
                                  )}
                                  {/* Play badge + duration make it obvious this
                                  is a video and not a plain image. */}
                                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center">
                                      <FaPlay size={12} className="ml-0.5" />
                                    </span>
                                  </span>
                                  {typeof message.video.durationSeconds ===
                                    "number" && (
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md pointer-events-none">
                                      {formatChatDuration(
                                        message.video.durationSeconds,
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {(() => {
                            const images = message.images?.length
                              ? message.images
                              : message.image
                                ? [message.image]
                                : [];
                            if (images.length === 0) return null;
                            return (
                              <div className="relative">
                                <div
                                  {...longPressHandlers(message._id)}
                                  className={`grid grid-cols-2 gap-1 rounded-xl overflow-hidden cursor-pointer select-none w-[90%] min-w-18 max-w-45 ${isMine ? "ml-auto" : ""}`}
                                >
                                  {images.map((src, idx) => (
                                    <img
                                      key={idx}
                                      src={resizedImageUrl(
                                        src,
                                        IMAGE_SIZES.chatThumbnail,
                                      )}
                                      alt={`message ${idx + 1}`}
                                      draggable={false}
                                      onLoad={onMediaLoaded}
                                      onClick={() =>
                                        openMediaViewer({
                                          type: "image",
                                          images,
                                          index: idx,
                                        })
                                      }
                                      className={`w-full h-auto object-cover border-2 border-stroke ${
                                        images.length === 1
                                          ? "col-span-2"
                                          : images.length === 3 && idx === 0
                                            ? "col-span-2"
                                            : ""
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                          {message.text && (
                            <div className="relative">
                              <div
                                {...longPressHandlers(message._id)}
                                className={`px-4 py-2.5 rounded-2xl text-base whitespace-pre-wrap select-none ${
                                  isMine
                                    ? "bg-primary-600 text-white self-end rounded-br-sm"
                                    : "bg-card text-ink self-start rounded-bl-sm border border-stroke"
                                }`}
                              >
                                <TextWithLinks
                                  text={message.text}
                                  linkClassName={
                                    isMine
                                      ? "underline text-white/90 hover:text-white font-medium"
                                      : "text-primary-600 font-medium hover:underline"
                                  }
                                />
                              </div>
                            </div>
                          )}
                          {/* Single picker per message, regardless of how
                          many media/text blocks it has — previously each
                          block rendered its own ReactionPicker, so a
                          text+image (or text+video) message mounted two
                          `fixed`, identically-positioned pickers stacked on
                          top of each other. Whichever mounted later (text,
                          since it renders after media in this list) ate
                          the tap; a click landing on the OTHER instance's
                          emoji registered as "outside click" for the top
                          instance's own ref check and closed the picker in
                          the same tick, silently swallowing the reaction. */}
                          <ReactionPicker
                            open={reactionPickerFor === message._id}
                            align={isMine ? "right" : "left"}
                            anchorPoint={reactionAnchorPoint}
                            boundsRef={panelRef}
                            onSelect={(emoji) => {
                              setReactionPickerFor(null);
                              handleReactMessage(message._id, emoji);
                            }}
                            onClose={() => setReactionPickerFor(null)}
                          />
                          {message.reactionSummary &&
                            Object.keys(message.reactionSummary).length > 0 && (
                              <div
                                className={isMine ? "self-end" : "self-start"}
                              >
                                <ReactionSummaryBar
                                  summary={message.reactionSummary}
                                  myReaction={message.myReaction}
                                  onToggle={(emoji) =>
                                    handleReactMessage(message._id, emoji)
                                  }
                                />
                              </div>
                            )}
                          <div
                            className={`flex items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <p
                              className="text-[10px] text-ink-muted"
                              title={new Date(
                                message.createdAt,
                              ).toLocaleString()}
                            >
                              {formatMessageTime(message.createdAt)}
                            </p>
                            {!isMine && (
                              <MessageOptionsMenu
                                isMine={false}
                                anchor="left"
                                onReport={() => setReportingMessage(message)}
                              />
                            )}
                            {isMine && (
                              <>
                                <MessageOptionsMenu
                                  isMine
                                  anchor="right"
                                  onDelete={() =>
                                    handleDeleteMessage(message._id)
                                  }
                                />
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
            {otherUserTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm bg-card border border-stroke self-start">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" />
                  </span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {showScrollToBottom && (
            <button
              type="button"
              onClick={onScrollToBottom}
              aria-label="Scroll to latest messages"
              className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-card border border-stroke shadow-lg rounded-full pl-3 pr-3.5 py-2 text-sm font-medium text-ink hover:bg-surface transition z-30"
            >
              <FaChevronDown size={12} className="text-primary-600" />
              {newMessagesBelowCount > 0 && (
                <span className="min-w-4.5 px-1 h-4.5 flex items-center justify-center rounded-full bg-primary-600 text-white text-[11px] leading-none">
                  {newMessagesBelowCount > 99 ? "99+" : newMessagesBelowCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-stroke px-4 py-3 bg-card">
          {requestInfo?.status === "pending" && !requestInfo.isInitiator && (
            <div>
              <p className="text-sm text-ink-muted mb-2 text-center">
                {activeUser?.name} sent you a message request
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onAcceptRequest}
                  disabled={requestActionPending}
                  className="flex-1 py-2.5 rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 transition"
                >
                  {requestActionPending ? "..." : "Accept"}
                </button>
                <button
                  onClick={onDeclineRequest}
                  disabled={requestActionPending}
                  className="flex-1 py-2.5 rounded-xl text-base font-semibold text-ink-sub border border-stroke hover:bg-surface disabled:opacity-50 transition"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {requestInfo?.status === "pending" && requestInfo.isInitiator && (
            <p className="text-sm text-ink-muted text-center py-2">
              Message request sent — waiting for {activeUser?.name} to accept.
            </p>
          )}

          {(requestInfo?.status === "declined" ||
            requestInfo?.status === "blocked") && (
            <p className="text-sm text-ink-muted text-center py-2">
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
                  <div className="flex items-center justify-between text-sm text-ink-muted mb-1">
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
              {voiceUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="mb-3 rounded-xl border border-stroke bg-surface px-3 py-2"
                >
                  <div className="flex items-center justify-between text-sm text-ink-muted mb-1">
                    <span>Sending voice note…</span>
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
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm"
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
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                {isRecordingVoice ? (
                  <div className="flex-1 flex items-center gap-3 border border-stroke rounded-xl px-4 py-2.5 bg-surface">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-base text-ink font-medium tabular-nums">
                      {Math.floor(recordingElapsed / 60)}:
                      {String(Math.floor(recordingElapsed % 60)).padStart(
                        2,
                        "0",
                      )}
                    </span>
                    <span className="text-sm text-ink-muted">
                      / {Math.floor(maxVoiceDurationSeconds / 60)}:
                      {String(maxVoiceDurationSeconds % 60).padStart(2, "0")}
                    </span>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => onStopRecording({ send: false })}
                      aria-label="Cancel recording"
                      className="p-1.5 rounded-full text-ink-muted hover:text-red-500 hover:bg-red-50 transition"
                    >
                      <FiX size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onStopRecording({ send: true })}
                      aria-label="Send voice note"
                      className="p-1.5 rounded-full bg-primary-600 text-white hover:bg-primary-800 transition"
                    >
                      <FiCheck size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={messageText}
                      onChange={(e) =>
                        onMessageTextChange
                          ? onMessageTextChange(e.target.value)
                          : setMessageText(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Write a message..."
                      className="flex-1 border border-stroke rounded-xl px-4 py-2.5 text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
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
                    {/* Mic only shows when the composer is otherwise empty —
                        same mutual-exclusion spirit as image/video: a voice
                        note is its own message, not an attachment tacked
                        onto typed text. */}
                    {!messageText.trim() &&
                    imagePreviews.length === 0 &&
                    !videoFile ? (
                      <button
                        type="button"
                        onClick={onStartRecording}
                        className="p-2.5 rounded-xl border border-stroke text-ink-muted hover:text-primary-600 hover:border-primary-400 transition"
                        title="Record voice note"
                      >
                        <FiMic size={16} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={
                          (!messageText.trim() &&
                            imagePreviews.length === 0 &&
                            !videoFile) ||
                          isSending
                        }
                        className="px-4 py-2.5 rounded-xl text-base font-semibold text-white bg-primary-600 hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {isSending ? "..." : "Send"}
                      </button>
                    )}
                  </>
                )}
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

        {mediaViewer && (
          <ChatMediaViewer
            type={mediaViewer.type}
            video={mediaViewer.video}
            images={mediaViewer.images}
            initialIndex={mediaViewer.index}
            onClose={() => setMediaViewer(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ChatModal;
