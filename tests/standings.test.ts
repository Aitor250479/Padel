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
expect(by.A.points === 4 && by.A.won === 1 && by.A.drawn === 1 && by.A.played === 2, "A: 2-0 (3) y 1-1 (1) = 4 puntos, 1G 1E");
expect(by.B.points === 2 && by.B.won === 1 && by.B.lost === 1, "B: 0-2 y 2-1 = 2 puntos, 1G 1P");
expect(by.C.points === 2 && by.C.drawn === 1 && by.C.lost === 1, "C: 1-2 y 1-1 = 2 puntos, 1E 1P");
expect(by.D.points === 3 && by.D.won === 1 && by.D.lost === 1, "D: 2-1 y 1-2 = 3 puntos");
expect(r.map((x) => x.pairId).join("") === "ADBC", "orden: A 4, D 3, B y C empatan a 2 y B va delante por ganados");

// Clasificación individual
import { computePlayerStandings } from "../src/lib/standings.ts";
const ms = [
  { id: "m1", pair_a: "A", pair_b: "B", sets_a: 2, sets_b: 0, status: "jugado" },
  { id: "m2", pair_a: "A", pair_b: "C", sets_a: 1, sets_b: 2, status: "jugado" },
  { id: "m3", pair_a: "B", pair_b: "C", sets_a: 2, sets_b: 0, status: "cancelado" },
];
const mp = [
  { match_id: "m1", profile_id: "ana", pair_id: "A" },
  { match_id: "m1", profile_id: "bea", pair_id: "A" },
  { match_id: "m1", profile_id: "carlos", pair_id: "B" },
  { match_id: "m1", profile_id: "dani", pair_id: "B" },
  // En m2 Bea ya no está en A: su sitio lo ocupa Eva.
  { match_id: "m2", profile_id: "ana", pair_id: "A" },
  { match_id: "m2", profile_id: "eva", pair_id: "A" },
  { match_id: "m2", profile_id: "fran", pair_id: "C" },
  { match_id: "m3", profile_id: "carlos", pair_id: "B" },
];
const ps = computePlayerStandings(["nuevo"], ms, mp);
const pb = Object.fromEntries(ps.map((x) => [x.playerId, x]));
expect(pb.ana.points === 4 && pb.ana.played === 2 && pb.ana.won === 1 && pb.ana.lost === 1, "Ana: 2-0 (3) + 1-2 (1) = 4");
expect(pb.bea.points === 3 && pb.bea.played === 1, "Bea solo suma el partido que jugó con A");
expect(pb.eva.points === 1 && pb.eva.played === 1, "Eva solo suma el partido que jugó con A");
expect(pb.fran.points === 2 && pb.fran.won === 1, "Fran: 2-1 = 2 puntos");
expect(pb.carlos.played === 1 && pb.carlos.points === 0, "Carlos: el partido cancelado no cuenta");
expect(pb.nuevo.played === 0, "un jugador sin partidos sale con 0");
expect(ps[0].playerId === "ana" && ps.length === 7, "Ana primera; salen los 7 jugadores");
