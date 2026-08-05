"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { INSTRUMENT_GROUPS } from "@/lib/instruments";
import { cn } from "@/lib/utils";

/**
 * Searchable instrument picker: focus shows every asset grouped; typing
 * filters by substring (case-insensitive) across all groups. Keyboard
 * (↑/↓/Enter/Esc) and mouse both work. Only known instruments are selectable.
 */
export function InstrumentSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INSTRUMENT_GROUPS.map((g) => ({
      label: g.label,
      options: q ? g.options.filter((o) => o.toLowerCase().includes(q)) : g.options,
    })).filter((g) => g.options.length > 0);
  }, [query]);

  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function select(opt: string) {
    onChange(opt);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (flat[active]) {
        e.preventDefault();
        select(flat[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-2" />
        <input
          ref={inputRef}
          value={open ? query : value}
          placeholder="Procurar ativo…"
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-solid)]/60 pl-9 pr-8 text-sm text-foreground",
            "placeholder:text-muted-2 outline-none transition-colors",
            "focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--ring)]",
          )}
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3 h-4 w-4 text-muted-2 transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card-solid)] p-1 shadow-xl">
          {flat.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted">Sem resultados.</p>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-2">
                {g.label}
              </p>
              {g.options.map((opt) => {
                const idx = flat.indexOf(opt);
                const isActive = idx === active;
                return (
                  <button
                    key={opt}
                    ref={isActive ? activeRef : undefined}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(opt);
                    }}
                    onMouseEnter={() => setActive(idx)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                      isActive
                        ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                        : "text-foreground hover:bg-[var(--card-hover)]",
                    )}
                  >
                    {opt}
                    {opt === value && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
