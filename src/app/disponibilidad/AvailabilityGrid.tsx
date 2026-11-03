"use client";

import { useMemo, useState, useTransition } from "react";
import { DAY_NAMES, HOURS, formatDay, slotKey, weekDays } from "@/lib/weeks";
import { saveAvailability } from "./actions";

type Props = {
  weekStart: string;
  canEdit: boolean;
  /** Franjas de mi pareja guardadas. */
  mine: string[];
  /** Para cada franja, nombres de las otras parejas que pueden. */
  others: Record<string, string[]>;
  submitted: boolean;
};

export default function AvailabilityGrid({ weekStart, canEdit, mine, others, submitted }: Props) {
  const days = weekDays(weekStart);
  const [selected, setSelected] = useState(() => new Set(mine));
  const [focus, setFocus] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    if (selected.size !== mine.length) return true;
    return mine.some((k) => !selected.has(k));
  }, [selected, mine]);

  function toggle(key: string) {
    setFocus(key);
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setMessage(null);
  }

  function save(slots: Set<string>) {
    startTransition(async () => {
      const payload = [...slots].map((k) => {
        const [day, hour] = k.split("|");
        return { day, hour: Number(hour) };
      });
      const res = await saveAvailability(weekStart, payload);
      if (res.error) setMessage({ ok: false, text: res.error });
      else {
        setSelected(new Set(slots));
        setMessage({
          ok: true,
          text: slots.size ? "Disponibilidad guardada." : "Guardado: esta semana no podéis jugar.",
        });
      }
    });
  }

  const focusNames = focus ? (others[focus] ?? []) : [];
  const [focusDay, focusHour] = focus ? focus.split("|") : [];

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0.5 text-center text-xs">
          <thead>
            <tr>
              <th className="w-10" />
              {days.map((d, i) => (
                <th key={d} className="font-medium">
                  {DAY_NAMES[i]}
                  <br />
                  <span className="opacity-60">{formatDay(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h) => (
              <tr key={h}>
                <td className="pr-1 text-right opacity-60">{h}:00</td>
                {days.map((d) => {
                  const key = slotKey(d, h);
                  const on = selected.has(key);
                  const n = others[key]?.length ?? 0;
                  const match = on && n > 0;
                  return (
                    <td key={key} className="p-0">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-pressed={on}
                        aria-label={`${d} ${h}:00, ${n} parejas más`}
                        className={[
                          "h-8 w-full rounded",
                          match
                            ? "bg-emerald-600 font-bold text-white"
                            : on
                              ? "bg-emerald-300 text-emerald-950"
                              : n > 0
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                                : "bg-gray-100 dark:bg-gray-800",
                          focus === key ? "ring-2 ring-sky-500" : "",
                        ].join(" ")}
                      >
                        {n > 0 ? n : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span><span className="inline-block h-3 w-3 rounded bg-emerald-600 align-middle" /> Puedes y hay rival</span>
        <span><span className="inline-block h-3 w-3 rounded bg-emerald-300 align-middle" /> Puedes, sin rival aún</span>
        <span><span className="inline-block h-3 w-3 rounded bg-amber-100 align-middle" /> Otras parejas pueden</span>
        <span>El número es cuántas otras parejas pueden.</span>
      </div>

      <div className="mt-3 min-h-12 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
        {focus ? (
          <>
            <b>
              {formatDay(focusDay)} a las {focusHour}:00:
            </b>{" "}
            {focusNames.length ? focusNames.join(", ") : "ninguna otra pareja puede todavía."}
          </>
        ) : (
          <span className="opacity-70">
            {canEdit
              ? "Toca las horas a las que podéis empezar a jugar."
              : "Toca una franja para ver qué parejas pueden."}
          </span>
        )}
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => save(selected)}
            disabled={pending || (!dirty && submitted)}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar disponibilidad"}
          </button>
          <button
            onClick={() => save(new Set())}
            disabled={pending}
            className="text-sm underline disabled:opacity-50"
          >
            No podemos jugar esta semana
          </button>
          {message && (
            <span className={message.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
              {message.text}
            </span>
          )}
          {!message && dirty && <span className="text-sm text-amber-700">Cambios sin guardar</span>}
        </div>
      )}
    </div>
  );
}
