// Emparejamiento semanal de la liga individual.
// Sin imports de ejecución para poder probarlo con node directamente.
//
// Reglas:
//  1. Juegan grupos de 4. Si sobran jugadores, descansan los que más partidos
//     llevan en la liga (si empatan, al azar).
//  2. Se busca no repetir compañero: lo que más pesa es cuántas veces han
//     jugado ya juntos los dos de cada pareja.
//  3. Después, no repetir rivales.
//  4. A igualdad de todo, al azar.

export type IndividualCandidate = { id: string; played: number };

/** Partidos ya jugados (o programados) en la liga: los dos jugadores de cada lado. */
export type PastMatch = { a: [string, string]; b: [string, string] };

export type IndividualMatch = { a: [string, string]; b: [string, string] };

const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

export function historyCounts(past: PastMatch[]) {
  const partners = new Map<string, number>();
  const rivals = new Map<string, number>();
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const m of past) {
    inc(partners, key(...m.a));
    inc(partners, key(...m.b));
    for (const x of m.a) for (const y of m.b) inc(rivals, key(x, y));
  }
  return { partners, rivals };
}

function shuffle<T>(xs: T[], rand: () => number) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeIndividualPairings(
  candidates: IndividualCandidate[],
  past: PastMatch[],
  rand: () => number = Math.random,
): { matches: IndividualMatch[]; resting: string[] } {
  const { partners, rivals } = historyCounts(past);
  const partnerCost = (x: string, y: string) => partners.get(key(x, y)) ?? 0;
  const rivalCost = (x: string, y: string) => rivals.get(key(x, y)) ?? 0;

  // 1. Quién juega: los que menos partidos llevan, con desempate al azar.
  const ordered = shuffle(candidates, rand).sort((x, y) => x.played - y.played);
  const n = Math.floor(ordered.length / 4) * 4;
  const playing = ordered.slice(0, n).map((c) => c.id);
  const resting = ordered.slice(n).map((c) => c.id);
  if (!n) return { matches: [], resting };

  // Coste de un grupo de 4 ya colocado como [a1, a2] contra [b1, b2].
  // Repetir compañero pesa mucho más que repetir rival.
  const BIG = 1000;
  const costOf = (g: string[]) =>
    BIG * (partnerCost(g[0], g[1]) + partnerCost(g[2], g[3])) +
    rivalCost(g[0], g[2]) + rivalCost(g[0], g[3]) + rivalCost(g[1], g[2]) + rivalCost(g[1], g[3]);
  const total = (order: string[]) => {
    let c = 0;
    for (let i = 0; i < order.length; i += 4) c += costOf(order.slice(i, i + 4));
    return c;
  };

  // 2. Búsqueda local con varios arranques al azar: se intercambian jugadores
  //    mientras mejore. Con unas decenas de jugadores es instantáneo.
  let best: string[] = [];
  let bestCost = Infinity;
  const tries = 60;
  for (let t = 0; t < tries && bestCost > 0; t++) {
    const order = shuffle(playing, rand);
    let cost = total(order);
    let improved = true;
    while (improved && cost > 0) {
      improved = false;
      for (let i = 0; i < order.length && !improved; i++) {
        for (let j = i + 1; j < order.length && !improved; j++) {
          if (Math.floor(i / 4) === Math.floor(j / 4) && (i % 4 < 2) === (j % 4 < 2)) continue;
          [order[i], order[j]] = [order[j], order[i]];
          const c = total(order);
          if (c < cost) {
            cost = c;
            improved = true;
          } else {
            [order[i], order[j]] = [order[j], order[i]];
          }
        }
      }
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = [...order];
    }
  }

  const matches: IndividualMatch[] = [];
  for (let i = 0; i < best.length; i += 4) {
    matches.push({ a: [best[i], best[i + 1]], b: [best[i + 2], best[i + 3]] });
  }
  return { matches, resting };
}
