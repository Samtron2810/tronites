import { useEffect } from "react";

// Module-level registry: every video registered through this hook is
// mutually exclusive — starting one pauses all the others.
const registry = new Set();

const onAnyPlay = (e) => {
  const playing = e.target;
  registry.forEach((el) => {
    if (el !== playing && !el.paused) el.pause();
  });
};

export default function useExclusiveVideoPlayback(videoRef, src) {
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    registry.add(el);
    el.addEventListener("play", onAnyPlay);
    return () => {
      registry.delete(el);
      el.removeEventListener("play", onAnyPlay);
    };
  }, [videoRef, src]);
}
