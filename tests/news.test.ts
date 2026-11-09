import assert from "node:assert/strict";
import { breakingFontSize, breakingSize, fitFontSize, moveInOrder, newsEnabled, newsOrder } from "../src/lib/news.ts";

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

assert.deepEqual(newsOrder(undefined, ["n2", "n1"]), ["enfrentamientos", "resultados", "n2", "n1"], "orden por defecto");
assert.deepEqual(newsOrder("n1,resultados,borrada", ["n3", "n2", "n1"]), ["n1", "resultados", "enfrentamientos", "n3", "n2"], "las nuevas, al final");
assert.deepEqual(moveInOrder(["a", "b", "c"], "c", -1), ["a", "c", "b"]);
assert.deepEqual(moveInOrder(["a", "b", "c"], "a", -1), ["a", "b", "c"], "la primera no sube más");
console.log("ok orden de noticias");
