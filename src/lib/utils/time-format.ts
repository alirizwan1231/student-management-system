// The whole app shows times in 12-hour AM/PM form. Stored values stay
// 24-hour ("HH:MM") -- this only changes how they are displayed.
// "14:30" -> "2:30 PM", "09:05" -> "9:05 AM", "00:00" -> "12:00 AM".
export function formatTime12(value: string | null | undefined): string {
  if (!value) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return value;
  const h24 = Number(m[1]);
  if (Number.isNaN(h24)) return value;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m[2]} ${period}`;
}
