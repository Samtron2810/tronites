import { useState } from "react";
import { createPortal } from "react-dom";
import { FiX, FiInfo } from "react-icons/fi";
import {
  VERIFICATION_META,
  pickPrimaryVerification,
} from "../constants/verification";
import useBackButtonClose from "../hooks/useBackButtonClose";

// Scalloped seal, not a plain circle-with-check — a filled circle is
// trivially forged by dropping a similar glyph into a display name or
// bio. The notched-star outline is much harder to fake typographically
// and reads distinctly at 16px. Single inline <path>, no external asset,
// so it renders in the offline PWA shell and the badge-preview iframe
// without a network round trip.
const SealShape = ({ color, size }) => (
  <svg
    viewBox="0 0 22 22"
    width={size}
    height={size}
    className="shrink-0"
    aria-hidden="true"
  >
    <path
      fill={color}
      d="M11.0 0.6 L13.1 3.18 L16.2 1.99 L16.73 5.27 L20.01 5.8 L18.82 8.9 L21.4 11.0 L18.82 13.1 L20.01 16.2 L16.73 16.73 L16.2 20.01 L13.1 18.82 L11.0 21.4 L8.9 18.82 L5.8 20.01 L5.27 16.73 L1.99 16.2 L3.18 13.1 L0.6 11.0 L3.18 8.9 L1.99 5.8 L5.27 5.27 L5.8 1.99 L8.9 3.18 Z"
    />
    <path
      fill="none"
      stroke="white"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.7 11.3l2.9 2.9 5.7-6.1"
    />
  </svg>
);

const SIZES = { sm: 14, md: 16, lg: 20, xl: 28 };

// <VerifiedBadge type="business" entityName="Kabu Foods Ltd" verifiedAt={...} />
// or <VerifiedBadge verifications={user.verifications} /> to auto-pick the
// highest-authority badge from a full array (profile headers, cards).
const VerifiedBadge = ({
  type,
  entityName,
  verifiedAt,
  verifications,
  size = "md",
  className = "",
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  useBackButtonClose(sheetOpen, () => setSheetOpen(false));

  const resolved = type
    ? { type, entityName, verifiedAt }
    : pickPrimaryVerification(verifications);

  if (!resolved) return null;

  const meta = VERIFICATION_META[resolved.type];
  if (!meta) return null;

  const px = SIZES[size] || SIZES.md;
  const fullSet = verifications?.length ? verifications : [resolved];

  return (
    <>
      {/* span+role="button", not a real <button> — this badge is routinely
          nested inside other clickable rows/buttons (conversation list
          items, post headers), and a <button> can't legally contain a
          <button> per HTML spec (triggers React hydration warnings and
          unpredictable click targeting). Keyboard/AT semantics preserved
          via role + tabIndex + onKeyDown. */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setSheetOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setSheetOpen(true);
          }
        }}
        aria-label={meta.ariaLabel}
        className={`inline-flex items-center align-middle cursor-pointer ${className}`}
      >
        <SealShape color={meta.color} size={px} />
      </span>

      {/* Details sheet rendered through a portal to <body>: the trigger above is
          routinely placed inside <p> / <button> / <a> (conversation rows, post
          headers, cards) where the sheet's block-level layout (div, h2, button,
          p) is illegal HTML and produced validateDOMNesting/hydration warnings.
          Portaling also escapes truncating/overflowing ancestors and keeps the
          overlay pinned to the real viewport.
          Responsive: bottom sheet with side gutters on phones (px-4, w-full),
          centered dialog from sm up (sm:px-0, max-w-sm), capped max-h-[85vh]. */}
      {sheetOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 sm:items-center sm:px-0"
            onClick={() => setSheetOpen(false)}
          >
            <div
              className="bg-card rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto overscroll-contain break-words"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Verified badges"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-ink">
                  Verified badges
                </h2>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="p-1.5 rounded-full hover:bg-surface text-ink-muted"
                  aria-label="Close"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {fullSet.map((v) => {
                  const m = VERIFICATION_META[v.type];
                  if (!m) return null;
                  return (
                    <div key={v.type} className="flex gap-3">
                      <SealShape color={m.color} size={22} />
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-ink">
                          {m.label}
                        </p>
                        <p className="text-sm text-ink-sub mt-0.5">
                          {m.claim}
                          {v.entityName && (
                            <>
                              {" "}
                              Verified as{" "}
                              <span className="font-medium text-ink">
                                {v.entityName}
                              </span>
                              .
                            </>
                          )}
                        </p>
                        {v.verifiedAt && (
                          <p className="text-xs text-ink-muted mt-1">
                            Confirmed{" "}
                            {new Date(v.verifiedAt).toLocaleDateString(
                              undefined,
                              { year: "numeric", month: "long", day: "numeric" },
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <a
                href="/help"
                className="mt-5 flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <FiInfo size={14} />
                What do badges mean?
              </a>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default VerifiedBadge;
