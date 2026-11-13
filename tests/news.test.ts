import assert from "node:assert/strict";
import { breakingFontSize, breakingSize, fitFontSize, matchPending, moveInOrder, newsEnabled, newsOrder, newsVariants, groupedNewsOrder, joinNewsOrder } from "../src/lib/news.ts";

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

// Modelos de breaking news: por turno dentro de cada tamaño, de la más antigua a la más nueva.
const item = (id: string, len: number, created_at: string, visible = true) => ({ id, body: "x".repeat(len), visible, created_at });
const v = newsVariants([
  item("c", 60, "2026-11-03"),
  item("a", 70, "2026-11-01"),
  item("b", 50, "2026-11-02"),
  item("largo", 140, "2026-11-01"),
  item("oculta", 65, "2026-10-01", false),
  item("d", 40, "2026-11-04"),
  item("e", 40, "2026-11-05"),
]);
assert.deepEqual(
  ["a", "b", "c", "d", "e", "oculta", "largo"].map((id) => v.get(id)),
  [0, 1, 2, 3, 0, 1, 0],
  "cortas: 0,1,2,3 y vuelve a empezar; las ocultas después; las de otro tamaño, su propio turno",
);
console.log("ok modelos de breaking news");

// Noticias propias agrupadas en un carrusel
{
  const fixed = ["enfrentamientos", "enfrentamientos_proxima", "resultados_semana", "resultados"];
  assert.deepEqual(groupedNewsOrder(undefined, ["n2", "n1"]), { top: [...fixed, "noticias"], custom: ["n2", "n1"] }, "por defecto, al final");
  assert.deepEqual(
    groupedNewsOrder("enfrentamientos,n1,resultados,n2", ["n2", "n1"]).top,
    ["enfrentamientos", "enfrentamientos_proxima", "noticias", "resultados_semana", "resultados"],
    "orden antiguo: el bloque va donde estaba la primera propia",
  );
  const g = groupedNewsOrder("noticias,enfrentamientos,n1,resultados,n2", ["n2", "n1", "n3"]);
  assert.deepEqual(g.top[0], "noticias");
  assert.deepEqual(g.custom, ["n1", "n2", "n3"], "las nuevas, al final del carrusel");
  const moved = { top: moveInOrder(g.top, "noticias", 1), custom: moveInOrder(g.custom, "n3", -1) };
  assert.deepEqual(groupedNewsOrder(joinNewsOrder(moved), ["n2", "n1", "n3"]), moved, "se guarda y se lee igual");
  console.log("ok carrusel de noticias");
}
