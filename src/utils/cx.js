// Tiny className joiner: cx("a", cond && "b", undefined) -> "a b"
const cx = (...parts) => parts.filter(Boolean).join(" ");

export default cx;
