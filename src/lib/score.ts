/**
 * Juegos de cada set (casillas de 2 filas x 3 columnas) y su relación con el
 * resultado en sets (2-0, 2-1, 1-1...). Sin imports para poder probarlo con node.
 */

export const SETS = 3;
export const MAX_GAMES = 20;

/** Nombre del campo de la casilla: fila "a" o "b", set 1 a 3. */
export const gameField = (row: "a" | "b", set: number) => `games_${row}_${set}`;

export type SetGames = { a: number; b: number };

/** Lee un número de juegos. "" = vacío, null = no es un número válido. */
function readNumber(raw: unknown): number | "" | null {
  const s = String(raw ?? "").trim();
  if (s === "") return "";
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  return n <= MAX_GAMES ? n : null;
}

/**
 * Lee las casillas y comprueba que tienen sentido. Devuelve los sets jugados
 * (en orden) o un error en español. Todo vacío = sin juegos (es opcional).
 */
export function readGames(get: (name: string) => unknown): { sets: SetGames[] } | { error: string } {
  const sets: SetGames[] = [];
  let ended = false;
  for (let i = 1; i <= SETS; i++) {
    const a = readNumber(get(gameField("a", i)));
    const b = readNumber(get(gameField("b", i)));
    if (a === null || b === null) return { error: `En el set ${i} solo se pueden poner números del 0 al ${MAX_GAMES}` };
    if (a === "" && b === "") {
      ended = true;
      continue;
    }
    if (a === "" || b === "") return { error: `En el set ${i} falta el número de una de las parejas` };
    if (ended) return { error: `Rellena los sets en orden: falta el set ${i - 1}` };
    if (a === b) return { error: `El set ${i} no puede acabar empatado (${a}-${b})` };
    sets.push({ a, b });
  }
  const first2 = setsWon(sets.slice(0, 2));
  if (sets.length === 3 && (first2.a === 2 || first2.b === 2)) {
    return { error: "No hay tercer set: una pareja ya ganó los dos primeros" };
  }
  return { sets };
}

export function setsWon(sets: SetGames[]) {
  return {
    a: sets.filter((s) => s.a > s.b).length,
    b: sets.filter((s) => s.b > s.a).length,
  };
}

/**
 * Comprueba que los juegos concuerdan con el resultado elegido. Sin juegos
 * siempre vale (por ejemplo, un partido sin terminar en el que acordáis ganador).
 */
export function gamesMatchResult(sets: SetGames[], result: { a: number; b: number }): string | null {
  if (!sets.length) return null;
  const won = setsWon(sets);
  if (won.a === result.a && won.b === result.b) return null;
  return `Según los juegos el resultado es ${won.a}-${won.b}, no ${result.a}-${result.b}. Revisa los números o el resultado elegido.`;
}

/** "6-4 3-6 7-5", como se guarda y se muestra. */
export const formatGames = (sets: SetGames[]) => sets.map((s) => `${s.a}-${s.b}`).join(" ") || null;

/** Lo contrario de formatGames, para rellenar las casillas con lo ya guardado. */
export function parseGames(detail: string | null | undefined): SetGames[] {
  return [...(detail ?? "").matchAll(/(\d{1,2})\s*-\s*(\d{1,2})/g)]
    .slice(0, SETS)
    .map((m) => ({ a: Number(m[1]), b: Number(m[2]) }));
}
