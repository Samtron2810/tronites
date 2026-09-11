// Scalloped seal, not a plain circle-with-check - a filled circle is
// trivially forged by dropping a similar glyph into a display name or
// bio. The notched-star outline is much harder to fake typographically
// and reads distinctly at 16px. Single inline <path>, no external asset,
// so it renders in the offline PWA shell and the badge-preview iframe
// without a network round trip. Shared by VerifiedBadge (inline badge +
// detail sheet) and the Tiers & benefits page.
const BadgeSeal = ({ color, size = 16, className = "" }) => (
  <svg
    viewBox="0 0 22 22"
    width={size}
    height={size}
    className={`shrink-0 ${className}`}
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

export default BadgeSeal;