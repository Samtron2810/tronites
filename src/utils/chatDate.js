// Date helpers for the chat thread UI — intentionally dependency-free.
// Native Intl + local-time comparisons cover everything the thread needs,
// and local days are used throughout so "Today"/"Yesterday" always match
// what the user's own clock says, regardless of UTC offsets.

const toDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Stable identifier for a local calendar day, e.g. "2026-08-24".
// Calendar-day equality (not 24-hour windows) is what chat dividers want:
// 11:58 PM yesterday and 12:01 AM today are minutes apart but different days.
export const dayKey = (value) => {
  const d = toDate(value);
  if (!d) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${dayOfMonth}`;
};

export const isSameDay = (a, b) => {
  const keyA = dayKey(a);
  return keyA !== "" && keyA === dayKey(b);
};

// Label for a message day: "Today" / "Yesterday" where possible, otherwise
// a short locale date — the year is only included once it differs from the
// current year ("Aug 22" vs. "Aug 22, 2024").
export const formatDayLabel = (value) => {
  const d = toDate(value);
  if (!d) return "";

  const key = dayKey(d);
  if (key === dayKey(new Date())) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday)) return "Yesterday";

  const isCurrentYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(
    undefined,
    isCurrentYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  ).format(d);
};

// Per-message stamp — the same compact clock format the thread already used.
export const formatMessageTime = (value) => {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
