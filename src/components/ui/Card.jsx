import cx from "../../utils/cx";

// variant: plain | pop (hard shadow) | amber | ink | sand | dashed
const VARIANT = {
  plain: "",
  pop: "card-pop",
  amber: "card-amber card-pop",
  ink: "card-ink",
  sand: "card-sand",
  dashed: "card-dashed",
};

const Card = ({ as: Tag = "div", variant = "plain", className, ...rest }) => (
  <Tag className={cx("card", VARIANT[variant], className)} {...rest} />
);

export default Card;
