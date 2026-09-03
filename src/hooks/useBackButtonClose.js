import { useEffect, useRef } from "react";

// Module-level state shared by every useBackButtonClose instance:
//   - `activeStack` — hook instances that are currently active, in
//     activation order. Activation order is also history-push order (each
//     activation pushes exactly one entry), so the LAST element is always
//     the modal whose synthetic entry is the current top of history.
//   - `nextInstanceId` / `nextEntrySeq` — counters that give each instance
//     and each pushed entry a stable, unique identity.
const activeStack = [];
let nextInstanceId = 0;
let nextEntrySeq = 0;

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
// STACKED MODALS (one modal opened on top of another — e.g. ChatModal →
// ChatMediaViewer, or a quote's PostDetailModal → its embedded original's
// PostDetailModal): only the TOP-MOST modal closes on a back press; the one
// below it stays open until the NEXT Back press, exactly like native mobile
// navigation. Without this, every active modal's popstate listener would
// fire on a single back press and the whole stack would collapse at once.
// Two mechanisms make the top-most-only behavior work:
//
// 1. The popstate handler only acts when this instance is the top of
//    `activeStack` (the last activation — i.e. the modal that pushed the
//    current top history entry). Everyone below ignores the event and keeps
//    owning its entry, ready for the next Back press.
//
// 2. Each pushed entry carries a unique `seq`, and the instance remembers
//    the seq it pushed. `popstate` delivers the state of the entry the
//    browser landed ON (the one just below the entry the back press
//    consumed), so the handler can tell which entry actually got popped:
//      - landed on MY OWN entry → the popped entry was the one directly
//        ABOVE mine (a child modal that closed itself and consumed its own
//        entry, or a child's deferred consumption of it). My entry is still
//        in history, now the current top — stay open, keep owning it, and
//        close only when MY entry gets popped.
//      - otherwise → my own entry was the one consumed. Close, and mark it
//        consumed so the cleanup below doesn't pop a second time.
//
// Two further pieces make this robust against StrictMode's dev-only
// "setup → cleanup → setup" double-invocation on mount, which previously
// made the viewer close itself the instant it opened:
//
// 3. The cleanup's history.back() is DEFERRED by one macrotask. StrictMode
//    re-runs the effect synchronously right after that cleanup, and the
//    re-run cancels the pending back() and re-adopts the already-pushed
//    entry (no duplicate push). Without the deferral, the back() from the
//    first cycle would complete asynchronously and its popstate would land
//    on the second cycle's listener — which reads exactly like a user
//    back-press and closes the modal immediately.
//
// 4. `ownsEntryRef` records whether the current top entry is still ours to
//    consume. The popstate handler only closes when it is (going back
//    consumes the entry, so a popstate close must NOT trigger another
//    back() in the cleanup), and the cleanup only back()s when it is.
//
// `onClose` is read through a ref so the listener effect doesn't need to
// re-run (and re-push history entries) when the parent re-creates the
// callback on each render — only `isActive` toggling pushes/consumes.
const useBackButtonClose = (isActive, onClose) => {
  // Stable identity for this hook instance — the key used in `activeStack`.
  const instanceIdRef = useRef(null);
  // The `seq` this instance pushed onto history (null until the first push).
  const myEntrySeqRef = useRef(null);
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

    if (instanceIdRef.current === null) {
      instanceIdRef.current = ++nextInstanceId;
    }

    if (pendingBackRef.current) {
      // StrictMode remount: the entry we pushed last cycle is still the
      // current top one (its back() never ran) — cancel the deferred
      // consumption and keep owning it instead of pushing a duplicate.
      clearTimeout(pendingBackRef.current);
      pendingBackRef.current = null;
      ownsEntryRef.current = true;
      if (!activeStack.includes(instanceIdRef.current)) {
        activeStack.push(instanceIdRef.current);
      }
    } else {
      const seq = ++nextEntrySeq;
      window.history.pushState({ modalViewer: true, seq }, "");
      myEntrySeqRef.current = seq;
      ownsEntryRef.current = true;
      activeStack.push(instanceIdRef.current);
    }

    const handlePopState = (e) => {
      if (!ownsEntryRef.current) return;
      // Only the top-most open modal responds to a back press — lower
      // modals ignore it entirely and stay open (their own entries are
      // still in history, to be popped by the NEXT Back press).
      if (activeStack[activeStack.length - 1] !== instanceIdRef.current) {
        return;
      }
      // `e.state` (falling back to `history.state`) is the entry the
      // browser landed ON — the one directly below the entry the back
      // press consumed.
      const landed = e.state ?? window.history.state;
      const landedIsMyOwn =
        landed &&
        landed.modalViewer === true &&
        landed.seq === myEntrySeqRef.current;
      if (landedIsMyOwn) {
        // A child modal (or its deferred consumption of its own entry)
        // just popped the single synthetic entry directly ABOVE ours —
        // our entry is still in history and is now the current top. Stay
        // open, keep owning it, and close only when the next Back press
        // pops OUR entry.
        return;
      }
      // Our entry was the one popped — close, and mark it consumed so the
      // cleanup below doesn't pop a second time.
      ownsEntryRef.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      const i = activeStack.indexOf(instanceIdRef.current);
      if (i !== -1) activeStack.splice(i, 1);
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

