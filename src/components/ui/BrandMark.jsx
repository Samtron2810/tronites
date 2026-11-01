import cx from "../../utils/cx";

// Single source of truth for the logo. To change the logo, replace
// public/tronite-logo.png — every place that renders <BrandMark /> follows.
export const LOGO_SRC = "/tronite-logo.png";

// tone: "default" (ink text) | "light" (cream text, for dark backgrounds)
const BrandMark = ({ size = 32, wordmark = true, tone = "default", className }) => (
  <span className={cx("inline-flex items-center gap-2", className)}>
    <img
      src={LOGO_SRC}
      alt={wordmark ? "" : "Tronites"}
      width={size}
      height={size}
      className={cx(
        "shrink-0 object-contain",
        // The logo file has a white backdrop: multiply drops it on the cream
        // page; on dark surfaces it stays a clean rounded tile instead.
        tone === "light"
          ? "rounded-lg"
          : "mix-blend-multiply dark:mix-blend-normal dark:rounded-lg",
      )}
      style={{ height: size, width: "auto" }}
    />
    {wordmark && (
      <span
        className={cx(
          "font-display font-extrabold leading-none tracking-[-0.04em]",
          tone === "light" ? "text-[#f4eee1]" : "text-ink",
        )}
        style={{ fontSize: Math.round(size * 0.72) }}
      >
        tronites
      </span>
    )}
  </span>
);

export default BrandMark;
