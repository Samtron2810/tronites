import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import useMentionAutocomplete from "../hooks/useMentionAutocomplete";
import MentionSuggestions from "./MentionSuggestions";
import QuotedPostPreview from "./QuotedPostPreview";

// Trimmed-down composer compared to CreatePostModal — no image/video
// picker, no privacy selector. A quote is always as visible as the
// original it embeds, and the backend only allows quoting PUBLIC posts
// in the first place (see postVisibilityService.isRepostable), so
// there's no meaningful privacy choice to offer here — every quote is
// public by construction.
const QuotePostModal = ({ post, closeModal, onSubmit }) => {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);
  const mention = useMentionAutocomplete();

  const handleTextChange = (e) => {
    setText(e.target.value);
    mention.handleTextChange(e.target.value, e.target.selectionStart);
  };

  const handleSelectMention = (username) => {
    const { text: newText, cursorPos } = mention.applySuggestion(
      text,
      username,
    );
    setText(newText);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ text: text.trim() });
      closeModal();
    } catch {
      // onSubmit already toasts its own error — just keep the modal
      // open so the person doesn't lose their draft caption.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
          <h2 className="text-lg font-semibold text-ink">Quote post</h2>
          <button
            onClick={closeModal}
            className="text-ink-muted hover:text-ink transition p-1 rounded-lg hover:bg-surface"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={mention.closeSuggestions}
              maxLength={280}
              rows={3}
              autoFocus
              placeholder="Add a comment..."
              className="w-full border border-stroke rounded-xl p-4 text-base text-ink placeholder:text-ink-muted outline-none resize-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition"
            />
            {mention.showSuggestions && (
              <MentionSuggestions
                suggestions={mention.suggestions}
                onSelect={handleSelectMention}
                direction="down"
                maxHeightClass="max-h-24"
              />
            )}
          </div>
          <div className="flex justify-end">
            <span
              className={`text-sm ${text.length >= 260 ? "text-red-400" : "text-ink-muted"}`}
            >
              {text.length}/280
            </span>
          </div>

          <QuotedPostPreview post={post} />
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-stroke">
          <button
            onClick={closeModal}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-base font-medium text-ink-muted hover:text-ink hover:bg-surface transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuotePostModal;
