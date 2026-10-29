"use client";

// Fix 16 (audit L-4): replaces native <input type="time">, whose AM/PM
// segment often does not "stick" until it is focused and arrow-keyed --
// users saved wrong times or thought the form was broken. Three plain
// selects (Hour / Minute / AM-PM) behave identically on every browser and
// phone, and the stored value is a single 24-hour "HH:MM" string, exactly
// like the native input produced.
export function TimeSelect({
  value,
  onChange,
  className = "",
}: {
  value: string; // "HH:MM" 24h, may be ""
  onChange: (value: string) => void;
  className?: string;
}) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || "");
  const h24 = match ? Number(match[1]) : 9;
  const minute = match ? match[2] : "00";
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const emit = (h: number, m: string, p: string) => {
    let hour = h % 12;
    if (p === "PM") hour += 12;
    onChange(`${String(hour).padStart(2, "0")}:${m}`);
  };
  const selectClass = `${className} w-auto flex-1`.trim();
  return (
    <div className="flex gap-1.5">
      <select aria-label="Hour" className={selectClass} value={h12} onChange={(e) => emit(Number(e.target.value), minute, period)}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <select aria-label="Minute" className={selectClass} value={minute} onChange={(e) => emit(h12, e.target.value, period)}>
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select aria-label="AM or PM" className={selectClass} value={period} onChange={(e) => emit(h12, minute, e.target.value)}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
