import assert from "node:assert/strict";
import { playerStats } from "../src/lib/player-stats.ts";

const m = (id: string, league: string, week: string, a: string, b: string, sa: number, sb: number, detail: string | null = null) =>
  ({ id, league_id: league, week_start: week, pair_a: a, pair_b: b, sets_a: sa, sets_b: sb, score_detail: detail });
const p = (match: string, profile: string, pair: string) => ({ match_id: match, profile_id: profile, pair_id: pair });

// Yo (yo) juego con Ana en la pareja P1 en la liga L1 y con Bea en P2 en la liga L2.
const matches = [
  m("m1", "L1", "2026-01-05", "P1", "X", 2, 0, "6-1 6-2"),
  m("m2", "L1", "2026-01-12", "Y", "P1", 2, 1, "6-4 3-6 7-5"),
  m("m3", "L2", "2026-03-02", "P2", "X", 1, 1),
  m("m4", "L2", "2026-03-09", "P2", "Y", 2, 1),
  m("m5", "L2", "2026-03-16", "Y", "P2", 0, 2),
];
const players = [
  p("m1", "yo", "P1"), p("m1", "ana", "P1"), p("m1", "x1", "X"), p("m1", "x2", "X"),
  p("m2", "yo", "P1"), p("m2", "ana", "P1"), p("m2", "y1", "Y"), p("m2", "y2", "Y"),
  p("m3", "yo", "P2"), p("m3", "bea", "P2"), p("m3", "x1", "X"), p("m3", "x2", "X"),
  p("m4", "yo", "P2"), p("m4", "bea", "P2"), p("m4", "y1", "Y"), p("m4", "y2", "Y"),
  p("m5", "yo", "P2"), p("m5", "bea", "P2"), p("m5", "y1", "Y"), p("m5", "y2", "Y"),
];

const s = playerStats("yo", matches, players);
assert.equal(s.total.played, 5);
assert.deepEqual([s.total.won, s.total.drawn, s.total.lost], [3, 1, 1]);
assert.deepEqual([s.total.setsFor, s.total.setsAgainst], [2 + 1 + 1 + 2 + 2, 0 + 2 + 1 + 1 + 0]);
assert.equal(s.total.points, 3 + 1 + 1 + 2 + 3);
assert.equal(s.leagues, 2);
assert.equal(s.partners.length, 2);
const bea = s.partners.find((x) => x.id === "bea")!;
assert.deepEqual([bea.played, bea.won, bea.drawn, bea.lost], [3, 2, 1, 0]);
const ana = s.partners.find((x) => x.id === "ana")!;
assert.deepEqual([ana.played, ana.won, ana.lost, ana.setsFor, ana.setsAgainst], [2, 1, 1, 3, 2]);
assert.equal(s.rivals.find((x) => x.id === "y1")!.played, 3);
// Juegos: m1 yo es A: 6+6 a favor, 1+2 en contra; m2 yo es B: 4+6+5 a favor, 6+3+7 en contra.
assert.deepEqual([s.gamesFor, s.gamesAgainst, s.matchesWithGames], [27, 19, 2]);
assert.equal(s.cleanWins, 2);
assert.equal(s.bestWinStreak, 2);
assert.deepEqual(s.streak, { type: "G", count: 2 });
assert.deepEqual(s.form, ["G", "P", "E", "G", "G"]);
console.log("ok estadísticas de jugador");
