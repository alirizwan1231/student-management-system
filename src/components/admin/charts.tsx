// Dependency-free SVG charts for the admin analytics page.
import { cn } from "@/lib/utils/cn";

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}
function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const W = 640, H = 220, L = 34, R = 8, T = 10, B = 26;

function Axes({ labels, max }: { labels: string[]; max: number }) {
  const plotH = H - T - B;
  const step = Math.ceil(labels.length / 8);
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = T + (plotH * i) / 4;
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y} y2={y} className="stroke-slate-200 dark:stroke-white/[0.08]" strokeWidth="1" />
            <text x={L - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[10px]">{Math.round(max - (max * i) / 4)}</text>
          </g>
        );
      })}
      {labels.map((l, i) =>
        i % step === 0 ? (
          <text key={l} x={L + ((W - L - R) * (i + 0.5)) / labels.length} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">{shortDate(l)}</text>
        ) : null
      )}
    </>
  );
}

export function BarChart({ labels, values, color = "#3366ff", unit = "" }: { labels: string[]; values: number[]; color?: string; unit?: string }) {
  const max = niceMax(Math.max(...values, 1));
  const plotW = W - L - R, plotH = H - T - B;
  const slot = plotW / values.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      <Axes labels={labels} max={max} />
      {values.map((v, i) => {
        const h = (v / max) * plotH;
        return (
          <rect key={labels[i]} x={L + slot * i + slot * 0.15} y={T + plotH - h} width={slot * 0.7} height={Math.max(h, v > 0 ? 2 : 0)} rx="2" fill={color}>
            <title>{`${shortDate(labels[i])}: ${v}${unit}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function LineChart({ labels, series }: { labels: string[]; series: { name: string; color: string; values: number[] }[] }) {
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 1));
  const plotW = W - L - R, plotH = H - T - B;
  const x = (i: number) => L + (plotW * (i + 0.5)) / labels.length;
  const y = (v: number) => T + plotH - (v / max) * plotH;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        <Axes labels={labels} max={max} />
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={s.color}>
                <title>{`${s.name} - ${shortDate(labels[i])}: ${v}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data, colors }: { data: { label: string; value: number }[]; colors: string[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = 44, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90" role="img">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="16" className="stroke-slate-100 dark:stroke-white/[0.06]" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = <circle key={d.label} cx="60" cy="60" r={r} fill="none" strokeWidth="16" stroke={colors[i % colors.length]} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" transform="rotate(90 60 60)" className="fill-slate-900 text-[18px] font-bold dark:fill-white">{total}</text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
              {d.label}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ data, color = "#3366ff" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-slate-300">{d.label}</span>
            <span className="font-bold text-slate-900 dark:text-white">{d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div className={cn("h-full rounded-full")} style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
