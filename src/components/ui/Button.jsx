import { forwardRef } from "react";
import cx from "../../utils/cx";

// variant: primary | accent | ink | outline | danger | ghost
// size:    sm | md | lg
// Use `as={Link}` (or "a") for navigation; disabled state is conveyed with
// aria-disabled and pointer-events:none in that case.
const Button = forwardRef(function Button(
  {
    as: Tag = "button",
    variant = "primary",
    size = "md",
    block = false,
    loading = false,
    disabled = false,
    type,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const elementProps =
    Tag === "button"
      ? { type: type || "button", disabled: isDisabled }
      : { "aria-disabled": isDisabled || undefined };

  return (
    <Tag
      ref={ref}
      {...elementProps}
      aria-busy={loading || undefined}
      className={cx(
        "btn",
        variant !== "outline" && `btn-${variant}`,
        size !== "md" && `btn-${size}`,
        block && "btn-block",
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </Tag>
  );
});

export default Button;
