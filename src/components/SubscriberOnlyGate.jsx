import { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import api from "../services/api";
import SubscribeModal from "./SubscribeModal";

// Module-level cache of creatorId → active-subscription state. A feed or
// profile page can render several subscriber-only posts from the same
// creator at once; without it each card would fire its own
// /subscribe/status request on mount.
const SUBSCRIBED_CACHE = new Map();

// Wraps any post content that has privacy="subscribers".
// If viewer is not subscribed the content is blurred with a subscribe CTA.
// If viewer IS subscribed (passed via prop) this component is a no-op passthrough.
//
// Post payloads don't carry membership state, so when a post is gated the
// component resolves the truth server-side once per creator via
// GET /creator-monetization/subscribe/status/:creatorId — this unlocks
// subscriber-only posts for paying subscribers (the old code hardcoded
// them as never-subscribed and blurred every one).
const SubscriberOnlyGate = ({ creator, isSubscribed, onTip, children }) => {
  const [showModal, setShowModal] = useState(false);
  const [localSubscribed, setLocalSubscribed] = useState(isSubscribed);

  useEffect(() => {
    // Already unlocked — owner, public post, or a resolved membership check.
    if (isSubscribed || localSubscribed) return;

    const creatorId = creator?._id;
    if (!creatorId) return;

    if (SUBSCRIBED_CACHE.has(creatorId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fast path from the module cache; the request below still owns the authoritative unlock.
      setLocalSubscribed(SUBSCRIBED_CACHE.get(creatorId));
      return;
    }

    let cancelled = false;
    api
      .get(`/creator-monetization/subscribe/status/${creatorId}`)
      .then((res) => {
        const subscribed = Boolean(res.data?.subscribed);
        SUBSCRIBED_CACHE.set(creatorId, subscribed);
        if (!cancelled) setLocalSubscribed(subscribed);
      })
      .catch(() => {
        // Keep the gate closed on failure — never unlock content the server
        // couldn't vouch for.
      });

    return () => {
      cancelled = true;
    };
  }, [creator?._id, isSubscribed, localSubscribed]);

  if (localSubscribed) return <>{children}</>;

  // Locked: the post content is intentionally NOT rendered — only redacted
  // placeholder bars — so nothing the server didn't unlock ever sits in the
  // DOM, blurred or otherwise.
  return (
    <>
      <div className="py-1">
        <p className="sr-only">
          Subscribers only. Subscribe to {creator?.name || "this creator"} to
          unlock this post.
        </p>
        <div aria-hidden="true" className="space-y-2.5">
          <div className="h-2.5 w-full rounded-sm bg-stroke" />
          <div className="h-2.5 w-[88%] rounded-sm bg-stroke" />
          <div className="h-2.5 w-[58%] rounded-sm bg-stroke" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-accent btn-sm"
          >
            <FaStar size={11} />
            Subscribe to read
          </button>
          {onTip && (
            <button
              type="button"
              onClick={onTip}
              className="font-mono text-xs text-ink-muted underline-offset-2 transition hover:text-ink hover:underline"
            >
              or send a tip
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <SubscribeModal
          creator={creator}
          onClose={() => setShowModal(false)}
          onAlreadySubscribed={() => setLocalSubscribed(true)}
        />
      )}
    </>
  );
};

export default SubscriberOnlyGate;