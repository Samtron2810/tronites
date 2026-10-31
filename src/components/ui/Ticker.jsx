import cx from "../../utils/cx";

// Scrolling hashtag band. Items render twice so the -50% loop is seamless;
// the duplicate is hidden from assistive tech. Pauses on hover and stops
// entirely under prefers-reduced-motion.
const Group = ({ items, hidden }) => (
  <ul
    aria-hidden={hidden || undefined}
    className="flex shrink-0 items-center font-mono text-[13px] font-medium uppercase tracking-wide sm:text-sm"
  >
    {items.map((item, i) => (
      <li key={`${item}-${i}`} className="flex items-center whitespace-nowrap">
        <span className="px-4 py-2.5">{item}</span>
        <span aria-hidden="true">✱</span>
      </li>
    ))}
  </ul>
);

const Ticker = ({ items, duration = 40, className }) => {
  const list = (items || []).map((t) => (t.startsWith("#") ? t : `#${t}`));
  if (!list.length) return null;
  return (
    <div className={cx("ticker", className)}>
      <div
        className="ticker-track"
        style={{ "--ticker-duration": `${duration}s` }}
      >
        <Group items={list} />
        <Group items={list} hidden />
      </div>
    </div>
  );
};

export default Ticker;
