import cx from "../../utils/cx";

// options: [{ value, label }]
const SegmentedControl = ({ options, value, onChange, label, className }) => (
  <div role="group" aria-label={label} className={cx("seg", className)}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        aria-pressed={value === opt.value}
        onClick={() => onChange?.(opt.value)}
        className="seg-item"
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;
