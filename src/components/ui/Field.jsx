import { forwardRef } from "react";
import cx from "../../utils/cx";

export const FieldLabel = ({ className, ...rest }) => (
  <label className={cx("mono-label mb-1.5 block", className)} {...rest} />
);

export const Input = forwardRef(function Input(
  { invalid = false, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx("field", className)}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea(
  { invalid = false, className, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx("field resize-y", className)}
      {...rest}
    />
  );
});
