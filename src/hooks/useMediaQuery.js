import { useCallback, useSyncExternalStore } from "react";

// Subscribes to a CSS media query. Returns false during SSR / first server
// render so markup never depends on the viewport.
const useMediaQuery = (query) => {
  const subscribe = useCallback(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
};

export default useMediaQuery;
