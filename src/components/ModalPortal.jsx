import { useEffect } from "react";
import { createPortal } from "react-dom";

// Renders every modal straight into <body>, so its `fixed inset-0`
// overlay is always measured against the real viewport — never against an
// ancestor that has a transform/filter/contain (which turns `fixed` into
// "relative to that ancestor" and leaves a gap under the modal). Also
// locks background scroll while any modal is mounted (ref-counted so
// stacked modals don't unlock each other).
let lockCount = 0;
let saved = null;

const lockScroll = () => {
  if (lockCount++ > 0) return;
  const { body, documentElement } = document;
  const scrollbar = window.innerWidth - documentElement.clientWidth;
  saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = "hidden";
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
};

const unlockScroll = () => {
  if (--lockCount > 0 || !saved) return;
  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
  saved = null;
};

const ModalPortal = ({ children }) => {
  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);

  // `text-ink` keeps the colour modals used to inherit from page wrappers.
  return createPortal(<div className="text-ink">{children}</div>, document.body);
};

export default ModalPortal;
