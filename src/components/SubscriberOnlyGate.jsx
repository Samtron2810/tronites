import { useEffect, useState } from "react";
import { FaLock, FaStar } from "react-icons/fa";
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
const SubscriberOnlyGate = ({ creator, isSubscribed, children }) => {
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

  return (
    <>
      <div className="relative rounded-xl overflow-hidden">
        {/* Blurred content preview */}
        <div className="pointer-events-none select-none" style={{ filter: "blur(12px)", maxHeight: 160, overflow: "hidden" }}>
          {children}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] px-6">
          <div className="bg-card/90 backdrop-blur-sm border border-stroke rounded-2xl px-5 py-4 text-center max-w-xs shadow-xl">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
              <FaLock size={15} className="text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-ink mb-1">Subscribers only</p>
            <p className="text-xs text-ink-muted mb-4 leading-relaxed">
              Subscribe to {creator?.name || "this creator"} to unlock this post.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition"
            >
              <FaStar size={10} />
              Subscribe
            </button>
          </div>
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