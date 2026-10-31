import { useEffect } from "react";
import useBackButtonClose from "../../hooks/useBackButtonClose";
import ModalPortal from "../ModalPortal";
import cx from "../../utils/cx";

// Modal shell: portal + scroll lock (ModalPortal), back-button close,
// Esc / backdrop close, bottom sheet on phones, centred card from sm up.
// Mount it only while open, same as the existing modals:
//   {open && <Modal onClose={...}>...</Modal>}
// width: any CSS length for the desktop max-width (default 28rem).
const Modal = ({ onClose, width, labelledBy, className, children }) => {
  useBackButtonClose(true, onClose);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className="modal-overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={cx("modal-panel", className)}
          style={width ? { "--modal-w": width } : undefined}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  );
};

export default Modal;
