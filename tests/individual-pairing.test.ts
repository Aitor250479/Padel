import { historyCounts, makeIndividualPairings, type PastMatch } from "../src/lib/individual-pairing.ts";
let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log("FAIL", m); } else console.log("ok", m); };
const players = (ids: string[], played: Record<string, number> = {}) => ids.map((id) => ({ id, played: played[id] ?? 0 }));

// 1. Grupos de 4 y descansan los que más partidos llevan.
{
  const r = makeIndividualPairings(players(["a", "b", "c", "d", "e", "f"], { e: 3, f: 2 }), []);
  ok(r.matches.length === 1, "6 jugadores: 1 partido");
  ok(r.resting.sort().join() === "e,f", "descansan los que más partidos llevan");
  const all = r.matches.flatMap((m) => [...m.a, ...m.b]);
  ok(new Set(all).size === 4, "4 jugadores distintos");
}

// 2. Menos de 4: nadie juega.
ok(makeIndividualPairings(players(["a", "b", "c"]), []).matches.length === 0, "3 jugadores: no hay partido");

// 3. No repite compañero si se puede.
{
  const past: PastMatch[] = [{ a: ["a", "b"], b: ["c", "d"] }];
  for (let k = 0; k < 30; k++) {
    const [m] = makeIndividualPairings(players(["a", "b", "c", "d"]), past).matches;
    const pairs = [m.a.slice().sort().join(), m.b.slice().sort().join()];
    if (pairs.includes("a,b") || pairs.includes("c,d")) { ok(false, "no repite compañero"); break; }
    if (k === 29) ok(true, "no repite compañero (30 sorteos)");
  }
}

// 4. Rotación completa de 4 jugadores: tras a-b/c-d y a-c/b-d toca a-d/b-c.
{
  const past: PastMatch[] = [{ a: ["a", "b"], b: ["c", "d"] }, { a: ["a", "c"], b: ["b", "d"] }];
  const [m] = makeIndividualPairings(players(["a", "b", "c", "d"]), past).matches;
  const pairs = [m.a.slice().sort().join(), m.b.slice().sort().join()].sort();
  ok(pairs.join(" ") === "a,d b,c", "con 4 jugadores rota hasta la tercera combinación");
}

// 5. 8 jugadores durante 7 semanas: nunca se repite compañero (hay 7 rondas posibles).
{
  const ids = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const past: PastMatch[] = [];
  for (let w = 0; w < 7; w++) past.push(...makeIndividualPairings(players(ids), past).matches);
  const { partners } = historyCounts(past);
  const max = Math.max(...partners.values());
  ok(max <= 2, `8 jugadores, 7 semanas: compañero repetido como mucho 2 veces (máx ${max})`);
  const repeats = [...partners.values()].filter((v) => v > 1).length;
  ok(repeats <= 4, `pocas repeticiones de compañero (${repeats})`);
}

// 6. Con 13 disponibles juegan 12 y descansa 1.
{
  const ids = Array.from({ length: 13 }, (_, i) => `p${i}`);
  const r = makeIndividualPairings(players(ids), []);
  ok(r.matches.length === 3 && r.resting.length === 1, "13 jugadores: 3 partidos y 1 descansa");
}

if (fails) process.exitCode = 1;
