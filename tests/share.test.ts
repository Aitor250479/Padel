import assert from "node:assert/strict";
import { matchMessage, weekMessage, whatsappUrl } from "../src/lib/share.ts";
import type { Match } from "../src/lib/matches.ts";
import { formatWeekLong } from "../src/lib/weeks.ts";

// Copia de formatBooking (lib/matches importa cosas de Next).
const WD = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
function formatBooking(at: string | null) {
  if (!at) return null;
  const [day, time] = at.split("T");
  const d = new Date(`${day}T00:00:00Z`);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1} a las ${time.slice(0, 5)}`;
}

const names = {
  pairName: (id: string) => ({ a: "Los Toros", b: "Smash", c: "Raqueta", d: "Globo" })[id] ?? "?",
  playersOf: (id: string) => ({ a: "Ana y Juan", b: "Eva y Leo", c: "", d: "Iker y Mar" })[id] ?? "",
  formatBooking,
  formatWeekLong,
};
const base: Match = {
  id: "m1", week_start: "2026-11-09", pair_a: "a", pair_b: "b", slot_day: null, slot_hour: null,
  booking_place: null, booking_at: null, status: "programado", sets_a: null, sets_b: null, score_detail: null,
};
const booked: Match = { ...base, id: "m2", pair_a: "c", pair_b: "d", booking_place: "Club Loyola", booking_at: "2026-11-14T10:00:00" };
const cancelled: Match = { ...base, id: "m3", status: "cancelado" };

const week = weekMessage("2026-11-09", [base, booked, cancelled], names, "https://x.app");
assert.match(week, /semana del 9 al 15 de noviembre/);
assert.match(week, /• Los Toros \(Ana y Juan\) vs Smash \(Eva y Leo\)\n {3}⏳ Falta reservar pista/);
assert.match(week, /• Raqueta vs Globo \(Iker y Mar\)\n {3}📍 Club Loyola, sábado 14\/11 a las 10:00/);
assert.equal(week.split("•").length - 1, 2, "los cancelados no salen");
assert.match(week, /https:\/\/x\.app\/partidos\?semana=2026-11-09$/);

const ask = matchMessage(base, "a", names, "https://x.app");
assert.match(ask, /¿Qué día y hora os viene bien, Eva y Leo\?/);
assert.match(ask, /https:\/\/x\.app\/partidos\/m1$/);
assert.match(matchMessage(booked, "d", names, "https://x.app"), /📍 Club Loyola, sábado 14\/11 a las 10:00/);

assert.equal(whatsappUrl("a b&c"), "https://wa.me/?text=a%20b%26c");
console.log("ok compartir");
