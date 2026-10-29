"use client";

import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Drop-in replacement for <select>: same props, same <option> children, works
// with react-hook-form's register(). Instead of the phone's big native picker
// it shows a styled dropdown (desktop) or a bottom sheet (phones).
// Under the hood a real (hidden) <select> keeps the value, so forms and
// onChange handlers behave exactly as before.

interface Opt {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
}

function textOf(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return "";
}

function collect(children: React.ReactNode, group: string | undefined, out: Opt[]): Opt[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string | number; disabled?: boolean; label?: string; children?: React.ReactNode };
    if (child.type === "option") {
      const label = textOf(props.children);
      out.push({ value: props.value !== undefined ? String(props.value) : label, label, disabled: Boolean(props.disabled), group });
    } else if (child.type === "optgroup") {
      collect(props.children, props.label, out);
    } else if (child.type === Fragment) {
      collect(props.children, group, out);
    }
  });
  return out;
}

const SIZING_TOKEN = /^((sm|md|lg|xl):)?(w-|min-w-|max-w-|flex-1$|flex-none$|grow|shrink|basis-|col-span-|self-)/;

const CustomSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function CustomSelect(
  { className = "", children, disabled, ...rest },
  ref
) {
  const hiddenRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [current, setCurrent] = useState("");
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);

  const options = useMemo(() => collect(children, undefined, []), [children]);
  useImperativeHandle(ref, () => hiddenRef.current as HTMLSelectElement);

  // Keep the visible label in sync with the real <select> after every render
  // (covers react-hook-form defaults/reset(), which set the DOM value directly).
  useEffect(() => {
    const el = hiddenRef.current;
    if (el && el.value !== current) setCurrent(el.value);
  });
  useEffect(() => {
    const el = hiddenRef.current;
    if (!el) return;
    const onChange = () => setCurrent(el.value);
    el.addEventListener("change", onChange);
    el.focus = () => triggerRef.current?.focus(); // validation errors focus the visible button
    return () => el.removeEventListener("change", onChange);
  }, []);

  const selected = options.find((o) => o.value === current) ?? options[0];
  const isPlaceholder = Boolean(selected) && selected.value === "";

  // Position of the desktop dropdown, computed from the trigger's current
  // on-screen rect. No fixed height cap: the menu gets ALL the space between
  // the trigger and the edge of the viewport. (The old code capped it at a
  // hard-coded 288px, so long option lists were cut in half no matter how
  // much empty screen was available.)
  const computePos = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const r = trigger.getBoundingClientRect();
    // Trigger scrolled completely out of view -> there is nothing sensible
    // to anchor the menu to.
    if (r.bottom < 0 || r.top > window.innerHeight) return null;
    const width = Math.max(r.width, 180);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const placeAbove = below < 220 && above > below;
    const available = placeAbove ? above : below;
    return {
      left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      width,
      ...(placeAbove
        ? { bottom: window.innerHeight - r.top + 4, maxHeight: Math.max(120, available) }
        : { top: r.bottom + 4, maxHeight: Math.max(120, available) }),
    };
  }, []);

  const openMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || disabled) return;
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    setSheet(mobile);
    if (!mobile) {
      const next = computePos();
      if (next) setPos(next);
    }
    setOpen(true);
  }, [disabled, computePos]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const choose = (value: string) => {
    const el = hiddenRef.current;
    if (el && el.value !== value) {
      el.value = value;
      el.dispatchEvent(new Event("change", { bubbles: true })); // lets React / react-hook-form see the change
    }
    setCurrent(value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    // BUG FIX (dropdown vanished on scroll): the old code closed the menu on
    // ANY captured scroll event -- including scrolling INSIDE the option
    // list itself, so the moment you tried to scroll the options, the whole
    // dropdown disappeared. Now:
    //  - scrolls that start inside the dropdown panel are ignored (that is
    //    the list doing its own scrolling, exactly as intended);
    //  - page / container scrolls and resizes REPOSITION the menu so it
    //    stays glued to its trigger instead of closing it;
    //  - the menu only closes if the trigger scrolls fully off-screen.
    let raf = 0;
    const reposition = () => {
      if (sheet) return;
      const next = computePos();
      if (next) setPos(next);
      else setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(reposition);
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(reposition);
    };
    if (!sheet) {
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onResize);
    }
    // focus the selected item for keyboard users
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.focus();
    active?.scrollIntoView({ block: "nearest" });
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [open, sheet, close, computePos]);

  const onListKey = (e: React.KeyboardEvent) => {
    const items: HTMLElement[] = Array.from(listRef.current?.querySelectorAll<HTMLElement>('button[role="option"]:not(:disabled)') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") (items[i + 1] ?? items[0])?.focus();
    else if (e.key === "ArrowUp") (items[i - 1] ?? items[items.length - 1])?.focus();
    else if (e.key === "Home") items[0]?.focus();
    else if (e.key === "End") items[items.length - 1]?.focus();
    else return;
    e.preventDefault();
  };

  const tokens = className.split(/\s+/).filter(Boolean);
  const sizing = tokens.filter((t) => SIZING_TOKEN.test(t));
  const wrapperClass = cn("relative", sizing.length > 0 ? "block" : "inline-block", sizing.join(" "));

  const list = (
    <div ref={listRef} role="listbox" onKeyDown={onListKey} className="flex flex-col">
      {options.map((o, idx) => (
        <div key={`${o.value}-${idx}`}>
          {o.group && o.group !== options[idx - 1]?.group && (
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{o.group}</p>
          )}
          <button
            type="button"
            role="option"
            aria-selected={o.value === selected?.value}
            disabled={o.disabled}
            onClick={() => choose(o.value)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] sm:py-2 sm:text-sm",
              "outline-none transition-colors focus:bg-slate-100 dark:focus:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40",
              o.value === selected?.value
                ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]",
              o.value === "" && "text-slate-400 dark:text-slate-500"
            )}
          >
            <span className="min-w-0 flex-1 truncate">{o.label || "\u00A0"}</span>
            {o.value === selected?.value && <Check size={16} className="shrink-0" />}
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className={wrapperClass}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={rest["aria-label"]}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openMenu();
          }
        }}
        className={cn(className, "flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60")}
      >
        <span className={cn("min-w-0 flex-1 truncate", isPlaceholder && "text-slate-400 dark:text-slate-500")}>{selected?.label || "\u00A0"}</span>
        <ChevronDown size={16} className="shrink-0 opacity-60" />
      </button>

      <select ref={hiddenRef} {...rest} disabled={disabled} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0">
        {children}
      </select>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[90]" onClick={(e) => { e.stopPropagation(); close(); }}>
            {sheet ? (
              <>
                <div className="absolute inset-0 bg-black/40" />
                <div
                  className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
                  {list}
                </div>
              </>
            ) : (
              <div
                ref={panelRef}
                className="absolute overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/[0.1] dark:bg-slate-900"
                style={pos ? { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight } : undefined}
                onClick={(e) => e.stopPropagation()}
              >
                {list}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  // multi-select / listbox variants keep the native control
  if (props.multiple || (props.size && props.size > 1)) return <select ref={ref} {...props} />;
  return <CustomSelect ref={ref} {...props} />;
});
