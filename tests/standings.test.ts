import { computeStandings } from "../src/lib/standings.ts";

const r = computeStandings(["A", "B", "C", "D"], [
  { pair_a: "A", pair_b: "B", sets_a: 2, sets_b: 0, status: "jugado" },
  { pair_a: "C", pair_b: "D", sets_a: 1, sets_b: 2, status: "jugado" },
  { pair_a: "A", pair_b: "C", sets_a: 1, sets_b: 1, status: "jugado" },
  { pair_a: "B", pair_b: "D", sets_a: 2, sets_b: 1, status: "jugado" },
  { pair_a: "A", pair_b: "D", sets_a: 2, sets_b: 0, status: "cancelado" },
  { pair_a: "B", pair_b: "C", sets_a: null, sets_b: null, status: "programado" },
]);
const by = Object.fromEntries(r.map((x) => [x.pairId, x]));
const expect = (cond: boolean, msg: string) => { console.log(cond ? "ok" : "FAIL", msg); if (!cond) process.exitCode = 1; };
expect(by.A.points === 3 && by.A.won === 1 && by.A.drawn === 1 && by.A.played === 2, "A: 2-0 y 1-1 = 3 puntos, 1G 1E");
expect(by.B.points === 2 && by.B.won === 1 && by.B.lost === 1, "B: 0-2 y 2-1 = 2 puntos, 1G 1P");
expect(by.C.points === 2 && by.C.drawn === 1 && by.C.lost === 1, "C: 1-2 y 1-1 = 2 puntos, 1E 1P");
expect(by.D.points === 3 && by.D.won === 1 && by.D.lost === 1, "D: 2-1 y 1-2 = 3 puntos");
expect(r.map((x) => x.pairId).join("") === "ADBC", "orden: A y D empatan a 3 y desempata la diferencia de sets; B delante de C por ganados");
