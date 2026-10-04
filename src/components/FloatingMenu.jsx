import { useLayoutEffect, useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

// Portal-based dropdown. Renders into <body> with `position: fixed`, so no
// ancestor `overflow:hidden/auto`, transform or stacking context can clip it.
// Auto-flips above the trigger when there's no room below, clamps to the
// viewport, and re-positions on scroll/resize.
//
// Props:
//   anchorRef   ref of the trigger element (required)
//   open        boolean
//   onClose     optional; enables Escape + scroll-away-safe outside click
//   menuRef     optional ref forwarded to the floating element
//   align       "right" (default) | "left" — which trigger edge to align to
//   placement   "auto" (default) | "bottom" | "top"
//   matchWidth  menu width = trigger width
//   offset      gap in px between trigger and menu (default 6)
const MARGIN = 8;

const FloatingMenu = ({
  anchorRef,
  open,
  onClose,
  menuRef,
  align = "right",
  placement = "auto",
  matchWidth = false,
  offset = 6,
  className = "",
  children,
}) => {
  const innerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const setRefs = useCallback(
    (node) => {
      innerRef.current = node;
      if (menuRef) menuRef.current = node;
    },
    [menuRef],
  );

  const reposition = useCallback(() => {
    const anchor = anchorRef?.current;
    const menu = innerRef.current;
    if (!anchor || !menu) return;
    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mw = matchWidth ? a.width : menu.offsetWidth;
    const mh = menu.offsetHeight;

    let left = align === "left" ? a.left : a.right - mw;
    left = Math.max(MARGIN, Math.min(left, vw - mw - MARGIN));

    const below = vh - a.bottom - offset - MARGIN;
    const above = a.top - offset - MARGIN;
    const openUp =
      placement === "top" || (placement === "auto" && mh > below && above > below);
    const room = openUp ? above : below;

    let top = openUp ? a.top - offset - Math.min(mh, room) : a.bottom + offset;
    top = Math.max(MARGIN, top);

    setPos({
      left,
      top,
      width: matchWidth ? a.width : undefined,
      maxHeight: Math.max(120, room),
    });
  }, [anchorRef, align, placement, matchWidth, offset]);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition, children]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => reposition();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    const onDown = (e) => {
      if (innerRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={setRefs}
      role="menu"
      // Portaled React events still bubble to React ancestors (e.g. a
      // clickable PostCard) — stop that here.
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        zIndex: 1000,
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        width: pos?.width,
        maxHeight: pos?.maxHeight,
        overflowY: "auto",
        visibility: pos ? "visible" : "hidden",
      }}
      className={`text-ink bg-card border border-stroke shadow-lg ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
};

export default FloatingMenu;
