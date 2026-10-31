import cx from "../../utils/cx";

// Single source of truth for the logo. To change the logo, replace
// public/tronite-logo.png — every place that renders <BrandMark /> follows.
export const LOGO_SRC = "/tronite-logo.png";

const BrandMark = ({ size = 32, wordmark = true, className }) => (
  <span className={cx("inline-flex items-center gap-2", className)}>
    <img
      src={LOGO_SRC}
      alt={wordmark ? "" : "Tronites"}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ height: size, width: "auto" }}
    />
    {wordmark && (
      <span
        className="font-display font-extrabold leading-none tracking-[-0.04em] text-ink"
        style={{ fontSize: Math.round(size * 0.72) }}
      >
        tronites
      </span>
    )}
  </span>
);

export default BrandMark;
