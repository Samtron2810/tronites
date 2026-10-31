import cx from "../../utils/cx";

const Toggle = ({ checked, onChange, disabled = false, label, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className={cx(
      "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-line transition-colors disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-primary-600" : "bg-sand",
      className,
    )}
  >
    <span
      aria-hidden="true"
      className={cx(
        "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-line bg-white transition-all",
        checked ? "left-[calc(100%-1.25rem-0.125rem)]" : "left-0.5",
      )}
    />
  </button>
);

export default Toggle;
