import assert from "node:assert/strict";
import { pollOpen, pollResults } from "../src/lib/polls.ts";

assert.equal(pollOpen({ closes_at: "2026-11-10T22:00:00" }, "2026-11-10T21:59"), true, "abierta un minuto antes");
assert.equal(pollOpen({ closes_at: "2026-11-10T22:00:00" }, "2026-11-10T22:00"), false, "cerrada a la hora exacta");

const options = [
  { id: "b", poll_id: "p", position: 2, label: "No" },
  { id: "a", poll_id: "p", position: 1, label: "Sí" },
  { id: "c", poll_id: "p", position: 3, label: "Me da igual" },
];
const r = pollResults(options, [
  { profile_id: "1", option_id: "a" },
  { profile_id: "2", option_id: "a" },
  { profile_id: "3", option_id: "b" },
]);
assert.equal(r.total, 3);
assert.deepEqual(r.rows.map((x) => [x.label, x.count, x.percent, x.winner]), [
  ["Sí", 2, 67, true],
  ["No", 1, 33, false],
  ["Me da igual", 0, 0, false],
], "recuento en orden, porcentajes y ganadora");
assert.ok(pollResults(options, []).rows.every((x) => !x.winner && x.percent === 0), "sin votos no hay ganadora");
console.log("ok encuestas");

import { countdownParts, madridToEpoch } from "../src/lib/polls.ts";
assert.equal(madridToEpoch("2026-11-22T22:00:00"), Date.UTC(2026, 10, 22, 21, 0, 0), "invierno: UTC+1");
assert.equal(madridToEpoch("2026-07-01T22:00"), Date.UTC(2026, 6, 1, 20, 0, 0), "verano: UTC+2");
assert.deepEqual(countdownParts(((2 * 24 + 5) * 3600 + 13 * 60 + 8) * 1000), { days: 2, hours: 5, minutes: 13, seconds: 8 });
assert.deepEqual(countdownParts(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0 }, "nunca negativo");
console.log("ok cuenta atrás");
