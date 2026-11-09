import assert from "node:assert/strict";
import { breakingFontSize, fitFontSize, moveInOrder, newsEnabled, newsOrder } from "../src/lib/news.ts";

assert.equal(newsEnabled(undefined), true, "activada por defecto");
assert.equal(newsEnabled("1"), true);
assert.equal(newsEnabled("0"), false);
assert.ok(breakingFontSize("Corta") > breakingFontSize("x".repeat(150)), "las cortas, más grandes");
assert.equal(fitFontSize("Jon", 29, 3.2), 3.2, "nombre corto: tamaño máximo");
assert.ok(fitFontSize("Aitor Etxeberria", 29, 3.2) < 3.2, "nombre largo: más pequeño");
assert.equal(fitFontSize("x".repeat(60), 29, 3.2), 2.2, "pero nunca ilegible");
console.log("ok noticias");

assert.deepEqual(newsOrder(undefined, ["n2", "n1"]), ["enfrentamientos", "resultados", "n2", "n1"], "orden por defecto");
assert.deepEqual(newsOrder("n1,resultados,borrada", ["n3", "n2", "n1"]), ["n1", "resultados", "enfrentamientos", "n3", "n2"], "las nuevas, al final");
assert.deepEqual(moveInOrder(["a", "b", "c"], "c", -1), ["a", "c", "b"]);
assert.deepEqual(moveInOrder(["a", "b", "c"], "a", -1), ["a", "b", "c"], "la primera no sube más");
console.log("ok orden de noticias");
