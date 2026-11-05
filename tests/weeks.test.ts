import assert from "node:assert/strict";
import { formatWeekLong, parseWeek, weekLabel, weeksFromNow } from "../src/lib/weeks.ts";

assert.equal(formatWeekLong("2026-11-09"), "9 al 15 de noviembre");
assert.equal(formatWeekLong("2026-10-26"), "26 de octubre al 1 de noviembre");
assert.equal(weeksFromNow("2026-11-02", "2026-11-02"), 0);
assert.equal(weeksFromNow("2026-11-23", "2026-11-02"), 3);
assert.equal(weeksFromNow("2026-10-26", "2026-11-02"), -1);
// cambio de hora (25 oct) no descuadra
assert.equal(weeksFromNow("2026-11-02", "2026-10-19"), 2);
assert.equal(weekLabel(0), "Esta semana");
assert.equal(weekLabel(1), "Próxima semana");
assert.equal(weekLabel(3), "Dentro de 3 semanas");
assert.equal(parseWeek(undefined, "2026-11-02"), "2026-11-02");
assert.equal(parseWeek("", "2026-11-02"), "2026-11-02");
assert.equal(parseWeek("2026-11-08", "2026-11-02"), "2026-11-02"); // domingo -> su lunes
assert.equal(parseWeek("basura", "2026-11-09"), "2026-11-09");
console.log("ok semanas");
