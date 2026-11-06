"use client";

import { useState } from "react";
import { SETS, gameField, gamesMatchResult, parseGames, readGames, setsWon } from "@/lib/score";

type Option = { value: string; a: number; b: number; score: string; text: string };

/**
 * Resultado en sets (2-0, 2-1...) y, opcionalmente, los juegos de cada set en
 * casillas de 2 filas (una por pareja) x 3 columnas (un set cada una).
 * Al rellenar los juegos se marca solo el resultado que corresponde y se avisa
 * si no concuerda con el elegido. El servidor vuelve a comprobarlo al guardar.
 */
export default function ResultFields({
  options,
  pairA,
  pairB,
  defaultResult = "",
  defaultDetail,
  compact,
}: {
  options: Option[];
  pairA: string;
  pairB: string;
  defaultResult?: string;
  defaultDetail?: string | null;
  compact?: boolean;
}) {
  const initial = parseGames(defaultDetail);
  const [result, setResult] = useState(defaultResult);
  const [cells, setCells] = useState<Record<string, string>>(() => {
    const c: Record<string, string> = {};
    initial.forEach((s, i) => {
      c[gameField("a", i + 1)] = String(s.a);
      c[gameField("b", i + 1)] = String(s.b);
    });
    return c;
  });

  const read = readGames((name) => cells[name]);
  const chosen = options.find((o) => o.value === result);
  // Solo se avisa cuando las casillas están completas y bien: mientras se escribe, nada.
  const complete = "sets" in read && read.sets.length >= 2;
  const mismatch = complete && chosen ? gamesMatchResult(read.sets, chosen) : null;

  function change(name: string, raw: string) {
    const value = raw.replace(/\D/g, "").slice(0, 2);
    const next = { ...cells, [name]: value };
    setCells(next);
    const r = readGames((n) => next[n]);
    if ("sets" in r && r.sets.length >= 2) {
      const won = setsWon(r.sets);
      const match = options.find((o) => o.a === won.a && o.b === won.b);
      if (match) setResult(match.value);
    }
  }

  const cell =
    "h-11 w-full min-w-0 rounded-lg border border-gray-300 text-center text-lg font-bold tabular-nums text-black";

  return (
    <div className="flex flex-col gap-3">
      {compact ? (
        <select
          name="result"
          required
          value={result}
          onChange={(e) => setResult(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-black"
        >
          <option value="" disabled>
            Resultado
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {pairA} {o.value} {pairB}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-gray-200 px-3 py-2 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:border-gray-800 dark:has-[:checked]:bg-emerald-950"
            >
              <input
                type="radio"
                name="result"
                value={o.value}
                checked={result === o.value}
                onChange={() => setResult(o.value)}
                className="h-5 w-5 shrink-0 accent-emerald-600"
              />
              <span className="text-lg font-black tabular-nums">{o.score}</span>
              <span className="text-sm">{o.text}</span>
            </label>
          ))}
        </div>
      )}

      <fieldset className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
        <legend className="px-1 text-sm font-medium">Juegos de cada set (opcional)</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(3,3.25rem)] items-center gap-2">
          <span />
          {Array.from({ length: SETS }, (_, i) => (
            <span key={i} className="text-center text-xs font-semibold opacity-70">
              Set {i + 1}
            </span>
          ))}
          {(["a", "b"] as const).map((row) => (
            <Row key={row} name={row === "a" ? pairA : pairB}>
              {Array.from({ length: SETS }, (_, i) => {
                const name = gameField(row, i + 1);
                return (
                  <input
                    key={name}
                    name={name}
                    value={cells[name] ?? ""}
                    onChange={(e) => change(name, e.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    autoComplete="off"
                    aria-label={`${row === "a" ? pairA : pairB}, juegos del set ${i + 1}`}
                    className={cell}
                  />
                );
              })}
            </Row>
          ))}
        </div>
        <p className="mt-2 text-xs opacity-70">
          Al rellenarlos se marca solo el resultado. Si el partido no se terminó y acordáis un ganador,
          podéis dejarlos vacíos.
        </p>
        {complete && mismatch && (
          <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
            {mismatch}
          </p>
        )}
        {"error" in read && !read.error.includes("falta") && (
          <p className="mt-2 text-sm text-amber-700">{read.error}</p>
        )}
      </fieldset>
    </div>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <span className="truncate text-sm font-semibold">{name}</span>
      {children}
    </>
  );
}
