import api from "./api";

// Converts the VAPID public key (base64url string from the backend) into
// the Uint8Array shape pushManager.subscribe() requires. Standard
// web-push helper — the browser API has no built-in base64url decoder.
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const getPushPermission = () =>
  isPushSupported() ? Notification.permission : "unsupported";

// Returns the existing browser subscription for this device, if any,
// without prompting — used on app load to reconcile local permission
// state with what the backend has on file.
export const getExistingSubscription = async () => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

// Full opt-in flow: request Notification permission (if not already
// granted/denied), subscribe via pushManager, and register the
// subscription with the backend. Call this from a user gesture (a
// toggle in Settings, or the "enable notifications" prompt after a
// value moment) — browsers require the permission prompt itself to be
// gesture-triggered.
export const enablePush = async () => {
  if (!isPushSupported()) {
    throw new Error("Push notifications aren't supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { permission, subscribed: false };
  }

  const { data } = await api.get("/push/vapid-key");
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }

  const json = subscription.toJSON();
  await api.post("/push/subscribe", {
    endpoint: json.endpoint,
    keys: json.keys,
  });

  return { permission, subscribed: true };
};

// Opt-out: unsubscribes the browser and tells the backend to drop the
// subscription. Safe to call even if no subscription exists locally.
export const disablePush = async () => {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.delete("/push/subscribe", { data: { endpoint } });
};

export const getPushPrefs = async () => {
  const { data } = await api.get("/push/prefs");
  return data.pushPrefs;
};

export const updatePushPrefs = async (pushPrefs) => {
  const { data } = await api.put("/push/prefs", { pushPrefs });
  return data.pushPrefs;
};

export default {
  isPushSupported,
  getPushPermission,
  getExistingSubscription,
  enablePush,
  disablePush,
  getPushPrefs,
  updatePushPrefs,
};
