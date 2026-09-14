import { useState } from "react";
import { FaLock, FaStar } from "react-icons/fa";
import SubscribeModal from "./SubscribeModal";

// Wraps any post content that has privacy="subscribers".
// If viewer is not subscribed the content is blurred with a subscribe CTA.
// If viewer IS subscribed (passed via prop) this component is a no-op passthrough.
const SubscriberOnlyGate = ({ creator, isSubscribed, children }) => {
  const [showModal, setShowModal] = useState(false);
  const [localSubscribed, setLocalSubscribed] = useState(isSubscribed);

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
