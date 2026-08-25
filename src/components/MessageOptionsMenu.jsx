import { useState, useRef, useEffect } from "react";
import { FaEllipsisV, FaTrash } from "react-icons/fa";
import { FiFlag } from "react-icons/fi";

// Message-level options menu for the chat modal. Report and Delete were
// previously two bare icon buttons sitting beside every message bubble;
// both now live behind this dropdown so destructive/flagging actions
// aren't always exposed. Same open/outside-click/dropdown pattern as
// CommentOptionsMenu.
const MessageOptionsMenu = ({
  isMine,
  onDelete,
  onReport,
  anchor = "right",
}) => {
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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

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
          className={`absolute ${anchor === "left" ? "left-0" : "right-0"} mt-1 w-36 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1`}
        >
          {isMine ? (
            <button
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 transition"
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
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-ink-sub hover:bg-surface transition"
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

export default MessageOptionsMenu;