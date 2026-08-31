import { useEffect, useRef } from "react";

// Runs fetchFn on window focus, tab visibility, and bfcache pageshow —
// the three events that indicate "user is looking at this page again"
// without a full remount. Attaches once; guards against firing after
// unmount and against overlapping runs.
export const useRefetchOnFocus = (fetchFn) => {
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  useEffect(() => {
    let cancelled = false;
    let running = false;

    const run = () => {
      if (cancelled || running) return;
      running = true;
      Promise.resolve(fetchFnRef.current())
        .catch((e) => console.error("[useRefetchOnFocus] refetch failed", e))
        .finally(() => {
          running = false;
        });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    const onPageShow = (e) => {
      if (e.persisted) run();
    };

    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
};

export default useRefetchOnFocus;
