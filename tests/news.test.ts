import assert from "node:assert/strict";
import { breakingFontSize, fitFontSize, newsEnabled } from "../src/lib/news.ts";

assert.equal(newsEnabled(undefined), true, "activada por defecto");
assert.equal(newsEnabled("1"), true);
assert.equal(newsEnabled("0"), false);
assert.ok(breakingFontSize("Corta") > breakingFontSize("x".repeat(150)), "las cortas, más grandes");
assert.equal(fitFontSize("Jon", 29, 3.2), 3.2, "nombre corto: tamaño máximo");
assert.ok(fitFontSize("Aitor Etxeberria", 29, 3.2) < 3.2, "nombre largo: más pequeño");
assert.equal(fitFontSize("x".repeat(60), 29, 3.2), 2.2, "pero nunca ilegible");
console.log("ok noticias");
