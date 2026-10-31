import cx from "../../utils/cx";

// variant: outline | amber | ink | green
const VARIANT = {
  outline: "",
  amber: "chip-amber",
  ink: "chip-ink",
  green: "chip-green",
};

const Chip = ({ as: Tag = "span", variant = "outline", className, ...rest }) => (
  <Tag className={cx("chip", VARIANT[variant], className)} {...rest} />
);

export default Chip;
