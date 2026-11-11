import assert from "node:assert/strict";
import { breakingFontSize, breakingSize, fitFontSize, matchPending, moveInOrder, newsEnabled, newsOrder } from "../src/lib/news.ts";

assert.equal(newsEnabled(undefined), true, "activada por defecto");
assert.equal(newsEnabled("1"), true);
assert.equal(newsEnabled("0"), false);
assert.ok(breakingFontSize("Corta", 80, 20) > breakingFontSize("x".repeat(150), 80, 20), "las cortas, más grandes");
assert.equal(breakingSize("x".repeat(75)), 0, "hasta 75: el cartel pequeño");
assert.equal(breakingSize("x".repeat(76)), 1);
assert.equal(breakingSize("x".repeat(150)), 1);
assert.equal(breakingSize("x".repeat(301)), 3, "más de 300: el grande");
assert.equal(breakingSize("x".repeat(900)), 3, "nunca más allá del último");
assert.equal(fitFontSize("Jon", 29, 3.2), 3.2, "nombre corto: tamaño máximo");
assert.ok(fitFontSize("Aitor Etxeberria", 29, 3.2) < 3.2, "nombre largo: más pequeño");
assert.equal(fitFontSize("x".repeat(60), 29, 3.2), 2.2, "pero nunca ilegible");
console.log("ok noticias");

assert.deepEqual(
  newsOrder(undefined, ["n2", "n1"]),
  ["enfrentamientos", "enfrentamientos_proxima", "resultados_semana", "resultados", "n2", "n1"],
  "orden por defecto",
);
assert.deepEqual(
  newsOrder("n1,resultados,borrada", ["n3", "n2", "n1"]),
  ["n1", "resultados_semana", "resultados", "enfrentamientos", "enfrentamientos_proxima", "n3", "n2"],
  "las nuevas, al final; las fijas nuevas, junto a su pareja",
);
assert.deepEqual(
  newsOrder("n1,enfrentamientos,n2,resultados", ["n2", "n1"]),
  ["n1", "enfrentamientos", "enfrentamientos_proxima", "n2", "resultados_semana", "resultados"],
  "un orden guardado antes de las fijas nuevas las coloca junto a las de siempre",
);
assert.deepEqual(
  newsOrder("resultados_semana,n1,enfrentamientos_proxima,enfrentamientos,resultados", ["n1"]),
  ["resultados_semana", "n1", "enfrentamientos_proxima", "enfrentamientos", "resultados"],
  "si ya están en el orden guardado, se respeta",
);
assert.deepEqual(moveInOrder(["a", "b", "c"], "c", -1), ["a", "c", "b"]);
assert.deepEqual(moveInOrder(["a", "b", "c"], "a", -1), ["a", "b", "c"], "la primera no sube más");
console.log("ok orden de noticias");

const now = "2026-11-11T12:46";
assert.equal(matchPending({ sets_a: null, booking_at: null }, now), true, "sin reserva: pendiente");
assert.equal(matchPending({ sets_a: null, booking_at: "2026-11-12T19:00:00" }, now), true, "reserva futura: pendiente");
assert.equal(matchPending({ sets_a: null, booking_at: "2026-11-11T12:46:00" }, now), false, "a la hora del partido ya no sale");
assert.equal(matchPending({ sets_a: null, booking_at: "2026-11-10T19:00:00" }, now), false, "ya jugado: no sale");
assert.equal(matchPending({ sets_a: 2, booking_at: null }, now), false, "con resultado: no sale");
console.log("ok partidos pendientes");
