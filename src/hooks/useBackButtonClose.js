import { useEffect, useRef } from "react";

// Lets a modal be dismissed with the browser/OS back button (Android back
// gesture, browser Back) instead of leaving the page.
//
// How it works: when `isActive` turns true it pushes one synthetic history
// entry, so the popstate fired by a "go back" is interpreted as "close the
// modal" (calls `onClose`) rather than "navigate away". When the modal is
// closed through its own UI instead (X button, Escape, backdrop click) the
// effect cleanup pops that synthetic entry back off so history stays
// balanced — otherwise one entry would accumulate per open/close cycle and
// the first Back press after that would appear to do nothing. The
// `pushedRef` flag keeps the two close paths from popping twice.
//
// `onClose` is read through a ref so the effect doesn't need to re-run (and
// re-push history entries) when the parent re-creates the callback on each
// render — only `isActive` toggling pushes/consumes entries.
const useBackButtonClose = (isActive, onClose) => {
  const pushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep the latest callback without re-running (and re-pushing history
  // entries for) the listener effect below on every parent render. Updating
  // a ref belongs in an effect, never during render.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isActive) return;

    const handlePopState = () => {
      // Going back consumed our synthetic entry — just close, and mark the
      // entry as consumed so the cleanup below doesn't pop a second time.
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.history.pushState({ modalOpen: true }, "");
    pushedRef.current = true;
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedRef.current) {
        // Closed through the UI, not by going back — consume the entry we
        // pushed. The popstate this triggers lands after our listener is
        // removed, so it can't re-close anything.
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [isActive]);
};

export default useBackButtonClose;
