import { useEffect, useRef } from "react";

// Lets a modal be dismissed with the browser/OS back button (Android back
// gesture, browser Back) instead of leaving the page.
//
// How it works: when `isActive` turns true it pushes one synthetic history
// entry, so the popstate fired by a "go back" is interpreted as "close the
// modal" (calls `onClose`) rather than "navigate away". When the modal is
// closed through its own UI instead (X button, Escape, backdrop click) the
// effect cleanup consumes that synthetic entry via history.back() so
// history stays balanced — otherwise one entry would accumulate per
// open/close cycle and the first Back press after that would appear to do
// nothing.
//
// Two pieces make this robust against StrictMode's dev-only
// "setup → cleanup → setup" double-invocation on mount, which previously
// made the viewer close itself the instant it opened:
//
// 1. The cleanup's history.back() is DEFERRED by one macrotask. StrictMode
//    re-runs the effect synchronously right after that cleanup, and the
//    re-run cancels the pending back() and re-adopts the already-pushed
//    entry (no duplicate push). Without the deferral, the back() from the
//    first cycle would complete asynchronously and its popstate would land
//    on the second cycle's listener — which reads exactly like a user
//    back-press and closes the modal immediately.
//
// 2. `ownsEntryRef` records whether the current top entry is still ours to
//    consume. The popstate handler only closes when it is (going back
//    consumes the entry, so a popstate close must NOT trigger another
//    back() in the cleanup), and the cleanup only back()s when it is.
//
// `onClose` is read through a ref so the listener effect doesn't need to
// re-run (and re-push history entries) when the parent re-creates the
// callback on each render — only `isActive` toggling pushes/consumes.
const useBackButtonClose = (isActive, onClose) => {
  // Whether the current top history entry is one we pushed and haven't
  // consumed yet. Survives StrictMode's remount so bookkeeping isn't reset
  // mid-cycle.
  const ownsEntryRef = useRef(false);
  // Timeout handle for a deferred history.back() that hasn't run yet — lets
  // an immediate effect re-run cancel it and re-adopt the entry.
  const pendingBackRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep the latest callback without re-running (and re-pushing history
  // entries for) the listener effect below on every parent render. Updating
  // a ref belongs in an effect, never during render.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isActive) return;

    if (pendingBackRef.current) {
      // StrictMode remount: the entry we pushed last cycle is still the
      // current top one (its back() never ran) — cancel the deferred
      // consumption and keep owning it instead of pushing a duplicate.
      clearTimeout(pendingBackRef.current);
      pendingBackRef.current = null;
      ownsEntryRef.current = true;
    } else {
      window.history.pushState({ modalViewer: true }, "");
      ownsEntryRef.current = true;
    }

    const handlePopState = () => {
      if (!ownsEntryRef.current) return;
      // Going back consumed our synthetic entry — close, and mark it
      // consumed so the cleanup below doesn't pop a second time.
      ownsEntryRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (ownsEntryRef.current) {
        // Closed through the UI, not by going back — consume the entry we
        // pushed. Deferred one macrotask so a StrictMode remount of this
        // same effect (which always follows this cleanup synchronously)
        // can cancel it and re-adopt the entry; on a real unmount the
        // timeout simply fires. Either way the popstate it triggers lands
        // after our listener is gone, so it can't re-close anything.
        ownsEntryRef.current = false;
        pendingBackRef.current = setTimeout(() => {
          pendingBackRef.current = null;
          window.history.back();
        }, 0);
      }
    };
  }, [isActive]);
};

export default useBackButtonClose;

