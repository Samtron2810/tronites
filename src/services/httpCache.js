// In-memory GET cache backing api.getCached(). No persistence by design
// (see caching-spec.md §1) — a hard reload must always refetch; back/
// forward nav is covered entirely by this module-level Map surviving
// component unmount/remount.

const store = new Map(); // key -> { value, expiresAt }
const pending = new Map(); // key -> Promise (in-flight dedupe)

const stableStringify = (obj) => {
  if (obj === undefined || obj === null) return "";
  const sortKeys = (val) => {
    if (Array.isArray(val)) return val.map(sortKeys);
    if (val && typeof val === "object") {
      return Object.keys(val)
        .filter((k) => val[k] !== undefined && val[k] !== null)
        .sort()
        .reduce((acc, k) => {
          acc[k] = sortKeys(val[k]);
          return acc;
        }, {});
    }
    return val;
  };
  return JSON.stringify(sortKeys(obj));
};

export const buildKey = (method, url, params) =>
  `${method} ${url} ${stableStringify(params)}`;

export const get = (key) => store.get(key);

export const set = (key, value, ttlMs) => {
  const expiresAt = ttlMs === Infinity ? Infinity : Date.now() + ttlMs;
  store.set(key, { value, expiresAt });
};

export const hasFresh = (key) => {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
};

export const invalidatePrefix = (prefix) => {
  const target = `GET ${prefix}`;
  for (const key of store.keys()) {
    if (key.startsWith(target)) store.delete(key);
  }
};

export const invalidateKey = (key) => {
  store.delete(key);
};

export const clearAll = () => {
  store.clear();
  pending.clear();
};

export const getPending = (key) => pending.get(key);

export const setPending = (key, promise) => {
  pending.set(key, promise);
  promise.finally(() => {
    if (pending.get(key) === promise) pending.delete(key);
  });
};

export default {
  buildKey,
  get,
  set,
  hasFresh,
  invalidatePrefix,
  invalidateKey,
  clearAll,
  getPending,
  setPending,
};
