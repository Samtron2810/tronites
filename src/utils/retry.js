// Retry helper for long-running background work (video upload + post create).
// Retries with exponential backoff + jitter until `maxElapsedMs` is spent.
// While the browser reports offline, the clock is paused and we wait for the
// `online` event, so a dead connection doesn't burn the retry budget —
// only time spent actually online (and failing) counts.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const waitForOnline = (maxWaitMs = 30 * 60 * 1000) =>
  new Promise((resolve) => {
    if (typeof navigator === "undefined" || navigator.onLine !== false) {
      return resolve(true);
    }
    const done = (ok) => {
      window.removeEventListener("online", onOnline);
      clearTimeout(timer);
      resolve(ok);
    };
    const onOnline = () => done(true);
    const timer = setTimeout(() => done(false), maxWaitMs);
    window.addEventListener("online", onOnline);
  });

// Transient = worth retrying: no response, timeout, 408/425/429, 5xx.
export const isTransientError = (err) => {
  if (err?.nonRetryable) return false;
  const status = err?.response?.status ?? err?.status;
  if (!status) return true; // network error / timeout / aborted request
  return status === 408 || status === 425 || status === 429 || status >= 500;
};

export const retryWithBackoff = async (
  fn,
  {
    maxElapsedMs = 30 * 60 * 1000,
    baseDelayMs = 1500,
    maxDelayMs = 30000,
    shouldRetry = isTransientError,
    onRetry,
    onWaitingForNetwork,
  } = {},
) => {
  let attempt = 0;
  let spent = 0;
  for (;;) {
    if (navigator.onLine === false) {
      onWaitingForNetwork?.();
      const back = await waitForOnline();
      if (!back) throw new Error("No internet connection for too long");
    }
    const startedAt = Date.now();
    try {
      return await fn(attempt);
    } catch (err) {
      spent += Date.now() - startedAt;
      attempt += 1;
      if (!shouldRetry(err) || spent >= maxElapsedMs) throw err;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.min(attempt, 6));
      const wait = delay / 2 + Math.random() * (delay / 2);
      onRetry?.(attempt, err);
      await sleep(wait);
      spent += wait;
    }
  }
};
