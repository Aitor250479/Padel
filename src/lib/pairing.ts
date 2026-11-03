// Algoritmo de emparejamiento semanal.
//
// Reglas del torneo:
//  1. Que juegue el mayor número posible de parejas (máximo de partidos).
//  2. Cuando una pareja puede jugar contra varias, juega contra la que menos
//     partidos lleva. Si empatan, al azar.
//  3. Da igual que dos parejas ya se hayan enfrentado.
//
// Con unas pocas decenas de parejas se puede calcular el máximo exacto
// recorriendo subconjuntos con memoria (bitmask).

export type Candidate = {
  id: string;
  /** Partidos que lleva la pareja (sin contar cancelados). */
  played: number;
  /** Franjas disponibles, como "YYYY-MM-DD|H". */
  slots: string[];
};

export type ProposedMatch = { a: string; b: string; slot: string; common: string[] };

export const MAX_CANDIDATES = 30;

export function compareSlots(x: string, y: string) {
  const [dx, hx] = x.split("|");
  const [dy, hy] = y.split("|");
  return dx === dy ? Number(hx) - Number(hy) : dx < dy ? -1 : 1;
}

export function makePairings(
  candidates: Candidate[],
  rand: () => number = Math.random,
): { matches: ProposedMatch[]; unmatched: string[] } {
  if (candidates.length > MAX_CANDIDATES) {
    throw new Error(`Demasiadas parejas para emparejar a la vez (máximo ${MAX_CANDIDATES})`);
  }
  const n = candidates.length;
  const sets = candidates.map((c) => new Set(c.slots));
  const common: string[][][] = candidates.map(() => []);
  const adj = new Array<number>(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const shared = candidates[i].slots.filter((s) => sets[j].has(s)).sort(compareSlots);
      common[i][j] = common[j][i] = shared;
      if (shared.length) {
        adj[i] |= 1 << j;
        adj[j] |= 1 << i;
      }
    }
  }

  const memo = new Map<number, number>();
  function best(mask: number): number {
    if (mask === 0) return 0;
    const cached = memo.get(mask);
    if (cached !== undefined) return cached;
    const i = 31 - Math.clz32(mask & -mask);
    const rest = mask & ~(1 << i);
    let result = best(rest); // i no juega
    let opts = adj[i] & rest;
    while (opts) {
      const j = 31 - Math.clz32(opts & -opts);
      opts &= opts - 1;
      result = Math.max(result, 1 + best(rest & ~(1 << j)));
    }
    memo.set(mask, result);
    return result;
  }

  const bitsIn = (x: number) => {
    let c = 0;
    while (x) {
      x &= x - 1;
      c++;
    }
    return c;
  };
  const pickRandom = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  let mask = n >= 31 ? -1 >>> 0 : (1 << n) - 1;
  const matches: ProposedMatch[] = [];
  const unmatched: string[] = [];

  while (mask) {
    const target = best(mask);

    // Elegimos primero la pareja con menos rivales posibles (la más difícil de colocar).
    const alive: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) alive.push(i);
    const fewest = Math.min(...alive.map((i) => bitsIn(adj[i] & mask)));
    const i = pickRandom(alive.filter((k) => bitsIn(adj[k] & mask) === fewest));
    const rest = mask & ~(1 << i);

    // Rivales con los que se sigue pudiendo alcanzar el máximo de partidos.
    const options: number[] = [];
    for (let j = 0; j < n; j++) {
      if (adj[i] & rest & (1 << j) && 1 + best(rest & ~(1 << j)) === target) options.push(j);
    }

    if (!options.length) {
      unmatched.push(candidates[i].id);
      mask = rest;
      continue;
    }

    const minPlayed = Math.min(...options.map((j) => candidates[j].played));
    const j = pickRandom(options.filter((k) => candidates[k].played === minPlayed));
    matches.push({
      a: candidates[i].id,
      b: candidates[j].id,
      slot: common[i][j][0],
      common: common[i][j],
    });
    mask = rest & ~(1 << j);
  }

  return { matches, unmatched };
}
