import { useState, useRef, useEffect } from "react";
import {
  FaShareNodes,
  FaRegCopy,
  FaWhatsapp,
  FaXTwitter,
  FaLinkedin,
  FaEnvelope,
} from "react-icons/fa6";
import toast from "react-hot-toast";

// Same open/outside-click/dropdown-style pattern as CommentOptionsMenu /
// PostCard's options menu. On devices with the native OS share sheet
// (mostly mobile), skip the dropdown entirely and fire that instead —
// it's the more native, one-tap feel users expect there.
const ShareMenu = ({ url, title, text, className = "" }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");
  const canNativeShare =
    typeof navigator !== "undefined" && !!navigator.share;

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

  const handleCopy = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't copy link");
    }
  };

  const handleTrigger = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch (e) {
        // AbortError = user dismissed the sheet, not a failure
        if (e.name !== "AbortError") {
          console.error(e);
          toast.error("Couldn't open share sheet");
        }
      }
      return;
    }
    setOpen((v) => !v);
  };

  const shareLinks = [
    {
      label: "WhatsApp",
      icon: FaWhatsapp,
      href: `https://wa.me/?text=${encodeURIComponent(`${text ? text + " " : ""}${shareUrl}`)}`,
    },
    {
      label: "X",
      icon: FaXTwitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text || "")}`,
    },
    {
      label: "LinkedIn",
      icon: FaLinkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "Email",
      icon: FaEnvelope,
      href: `mailto:?subject=${encodeURIComponent(title || "")}&body=${encodeURIComponent(`${text ? text + "\n\n" : ""}${shareUrl}`)}`,
    },
  ];

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
        onClick={handleTrigger}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink bg-surface border border-stroke rounded-full transition"
        title="Share"
        aria-label="Share"
      >
        <FaShareNodes size={12} />
        Share
      </button>

      {open && !canNativeShare && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-1 w-44 bg-card rounded-lg shadow-lg border border-stroke z-40 py-1"
        >
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface transition text-left"
          >
            <FaRegCopy size={12} className="text-ink-muted" />
            Copy link
          </button>
          <div className="h-px bg-stroke my-1" />
          {shareLinks.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface transition text-left"
            >
              <Icon size={12} className="text-ink-muted" />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShareMenu;
