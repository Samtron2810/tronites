import { useState, useRef, useEffect } from "react";
import { FaEllipsisV, FaTrash, FaRegCopy } from "react-icons/fa";
import { FiFlag } from "react-icons/fi";
import toast from "react-hot-toast";

// Same open/outside-click/dropdown-style pattern as PostCard's own post
// options menu (FaEllipsisV trigger, absolute-positioned card).
//
// Owner sees Copy + Delete. Non-owner sees Copy + Report. No Edit —
// comment editing is out of scope (explicitly removed from the build
// plan); comments/replies are delete-and-repost only.
const CommentOptionsMenu = ({ isOwner, text, onReport, onDelete }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleCopy = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success("Comment copied");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't copy comment");
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="p-1 -m-1 text-ink-muted hover:text-ink transition rounded"
        title="Options"
        aria-label="Options"
      >
        <FaEllipsisV size={11} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-1 w-36 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1"
        >
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-sub hover:bg-surface transition"
          >
            <FaRegCopy size={11} />
            <span className="font-medium">Copy</span>
          </button>

          {isOwner ? (
            <button
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <FaTrash size={11} />
              <span className="font-medium">Delete</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setOpen(false);
                onReport();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-sub hover:bg-surface transition"
            >
              <FiFlag className="text-amber-500" size={11} />
              <span className="font-medium">Report</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentOptionsMenu;
