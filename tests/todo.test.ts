import assert from "node:assert/strict";
import { myTodos, type TodoInput } from "../src/lib/todo.ts";
import type { Match } from "../src/lib/matches.ts";
import { formatWeekLong } from "../src/lib/weeks.ts";

const m = (id: string, week: string, extra: Partial<Match> = {}): Match => ({
  id, week_start: week, pair_a: "yo", pair_b: id, slot_day: null, slot_hour: null, booking_place: null,
  booking_at: null, status: "programado", sets_a: null, sets_b: null, score_detail: null, ...extra,
});
const base: TodoInput = {
  myPair: "yo", thisWeek: "2026-11-09", nextWeek: "2026-11-16", matches: [], proposals: [],
  availabilityWeek: "2026-11-16", answered: true,
  isOpen: (x) => x.week_start < "2026-11-09",
  pairName: (id) => ({ yo: "Los Toros", r1: "Smash", r2: "Globo", r3: "Raqueta", r4: "Volea" })[id] ?? id,
  playersOf: (id) => (id === "r2" ? "Iker y Mar" : ""),
  formatBooking: (at) => (at ? "sábado 14/11 a las 10:00" : null),
  formatWeekLong,
};

assert.deepEqual(myTodos(base), [], "nada pendiente");

const t = myTodos({
  ...base,
  answered: false,
  matches: [
    m("r2", "2026-11-09"),
    m("r3", "2026-11-16", { booking_at: "2026-11-21T10:00:00", booking_place: "Club" }),
    m("r1", "2026-11-02"),
    m("r4", "2026-10-26"),
  ],
  proposals: [{ match_id: "r1", pair_id: "r1", sets_a: 2, sets_b: 1, score_detail: null }],
});
assert.deepEqual(t.map((x) => x.title), [
  "Falta poner el resultado",
  "Confirma el resultado",
  "Tu partido de esta semana",
  "Tu partido de la semana que viene",
  "¿Puedes jugar?",
]);
assert.match(t[1].text, /Smash ha puesto 2-1/);
assert.match(t[2].text, /Contra Globo \(Iker y Mar\)\. Falta reservar pista/);
assert.equal(t[2].tone, "action");
assert.match(t[3].text, /📍 Club, sábado 14\/11 a las 10:00/);
assert.equal(t[3].tone, "info");
assert.equal(t[4].href, "/disponibilidad?semana=2026-11-16");
assert.match(t[4].text, /16 al 22 de noviembre/);

const waiting = myTodos({ ...base, matches: [m("r1", "2026-11-02")], proposals: [{ match_id: "r1", pair_id: "yo", sets_a: 2, sets_b: 0, score_detail: null }] });
assert.equal(waiting[0].title, "Resultado enviado");
const clash = myTodos({
  ...base,
  matches: [m("r1", "2026-11-02")],
  proposals: [
    { match_id: "r1", pair_id: "yo", sets_a: 2, sets_b: 0, score_detail: null },
    { match_id: "r1", pair_id: "r1", sets_a: 0, sets_b: 2, score_detail: null },
  ],
});
assert.equal(clash[0].title, "Los resultados no coinciden");
console.log("ok portada");
