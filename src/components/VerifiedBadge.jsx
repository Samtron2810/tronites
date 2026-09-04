import { useState } from "react";
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
      d="M11 0l2.02 1.6 2.51-.63 1.28 2.24 2.51.63.36 2.57 2.01 1.6-1.24 2.26.99 2.42-2.1 1.44.02 2.58-2.55.4-1.13 2.32-2.5-.46L11 22l-1.98-1.63-2.5.46-1.13-2.32-2.55-.4.02-2.58-2.1-1.44.99-2.42-1.24-2.26 2.01-1.6.36-2.57 2.51-.63 1.28-2.24 2.51.63z"
    />
    <path
      fill="none"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.8 11.2l2.6 2.6 5.4-5.6"
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

      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="bg-card rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full sm:max-w-sm max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
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
        </div>
      )}
    </>
  );
};

export default VerifiedBadge;
