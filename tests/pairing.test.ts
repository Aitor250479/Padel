import { makePairings, type Candidate } from "../src/lib/pairing.ts";
let fails = 0;
const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log("FAIL", m); } else console.log("ok", m); };

// 1. Cadena A-B-C-D: el máximo es 2 partidos (A-B, C-D), aunque B-C también coincidan.
const chain: Candidate[] = [
  { id: "A", played: 0, slots: ["d|1"] },
  { id: "B", played: 0, slots: ["d|1", "d|2"] },
  { id: "C", played: 0, slots: ["d|2", "d|3"] },
  { id: "D", played: 0, slots: ["d|3"] },
];
for (let k = 0; k < 50; k++) {
  const r = makePairings(chain);
  if (r.matches.length !== 2) { ok(false, "cadena da 2 partidos"); break; }
  if (k === 49) ok(true, "cadena da 2 partidos (50 sorteos)");
}

// 2. A puede contra B (3 jugados) o C (1 jugado): elige C.
const pref: Candidate[] = [
  { id: "A", played: 2, slots: ["d|1"] },
  { id: "B", played: 3, slots: ["d|1"] },
  { id: "C", played: 1, slots: ["d|1"] },
];
let allC = true;
for (let k = 0; k < 50; k++) {
  const r = makePairings(pref);
  const m = r.matches[0];
  const pairIds = [m.a, m.b].sort().join("");
  // Todas coinciden entre sí; quien queda fuera debe ser la que más ha jugado o ser elección del rival con menos.
  if (pairIds === "AB") allC = false;
}
ok(allC, "nunca empareja A-B cuando C ha jugado menos");

// 3. Empate de jugados: ambas opciones salen alguna vez.
const tie: Candidate[] = [
  { id: "A", played: 0, slots: ["d|1"] },
  { id: "B", played: 0, slots: ["d|1"] },
  { id: "C", played: 0, slots: ["d|1"] },
];
const seen = new Set<string>();
for (let k = 0; k < 200; k++) { const m = makePairings(tie).matches[0]; seen.add([m.a, m.b].sort().join("")); }
ok(seen.size === 3, "con empates el sorteo varía: " + [...seen].join(","));

// 4. Sin coincidencias.
const none = makePairings([{ id: "A", played: 0, slots: ["d|1"] }, { id: "B", played: 0, slots: ["d|2"] }]);
ok(none.matches.length === 0 && none.unmatched.length === 2, "sin coincidencias no hay partido");

// 5. Franja: la primera común en orden de día y hora numérica.
const slot = makePairings([{ id: "A", played: 0, slots: ["2026-11-10|19", "2026-11-10|9"] }, { id: "B", played: 0, slots: ["2026-11-10|19", "2026-11-10|9"] }]);
ok(slot.matches[0].slot === "2026-11-10|9", "franja propuesta es la más temprana");

// 6. 14 parejas aleatorias: comparar con fuerza bruta.
function brute(c: Candidate[]): number {
  if (c.length < 2) return 0;
  const [x, ...rest] = c;
  let b = brute(rest);
  rest.forEach((y, idx) => { if (x.slots.some((s) => y.slots.includes(s))) b = Math.max(b, 1 + brute(rest.filter((_, k) => k !== idx))); });
  return b;
}
let good = true;
for (let t = 0; t < 30; t++) {
  const cs: Candidate[] = Array.from({ length: 12 }, (_, i) => ({ id: "P" + i, played: Math.floor(Math.random() * 4), slots: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => "d|" + Math.floor(Math.random() * 10)) }));
  const r = makePairings(cs);
  if (r.matches.length !== brute(cs) || r.matches.length * 2 + r.unmatched.length !== 12) good = false;
}
ok(good, "12 parejas aleatorias: siempre el máximo de partidos (30 casos)");

// 7. 30 parejas, rendimiento.
const big: Candidate[] = Array.from({ length: 30 }, (_, i) => ({ id: "P" + i, played: i % 3, slots: ["d|" + (i % 5), "d|" + ((i * 7) % 11)] }));
const t0 = Date.now(); makePairings(big); ok(Date.now() - t0 < 3000, `30 parejas en ${Date.now() - t0} ms`);
process.exit(fails ? 1 : 0);
