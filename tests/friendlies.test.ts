import assert from "node:assert/strict";
import {
  daysBefore,
  friendlyMessage,
  friendlyState,
  friendlyStatRows,
  friendlyTodos,
  homeFriendlies,
  lineup,
  missing,
  type FriendlyMatch,
  type FriendlyPlayer,
} from "../src/lib/friendlies.ts";
import { playerStats } from "../src/lib/player-stats.ts";

const NOW = "2026-11-13T10:00";
const m = (id: string, play_at: string, extra: Partial<FriendlyMatch> = {}): FriendlyMatch => ({
  id, play_at, place: null, sets_a: null, sets_b: null, score_detail: null, created_by: "p1", created_at: "", ...extra,
});
const four = (match_id: string, ids = ["p1", "p2", "p3", "p4"]): FriendlyPlayer[] => [
  { match_id, profile_id: ids[0], side: "a", slot: 1 },
  { match_id, profile_id: ids[1], side: "a", slot: 2 },
  { match_id, profile_id: ids[2], side: "b", slot: 1 },
  { match_id, profile_id: ids[3], side: "b", slot: 2 },
];

// Estados
const future = m("f", "2026-11-14T19:00:00");
assert.equal(friendlyState(future, [four("f")[0]], NOW), "abierto");
assert.equal(friendlyState(future, four("f"), NOW), "confirmado");
assert.equal(friendlyState(m("x", "2026-11-13T10:00:00"), four("x"), NOW), "jugado", "a la hora en punto ya cuenta como jugado");
assert.equal(friendlyState(m("y", "2026-11-12T19:00:00"), four("y").slice(0, 3), NOW), "no_jugado");
assert.equal(missing(future, four("f").slice(0, 3)), 1);
assert.deepEqual(lineup(future, [four("f")[0], four("f")[3]]), { a: ["p1", null], b: [null, "p4"] });

// Fechas
assert.equal(daysBefore(NOW, 14), "2026-10-30T10:00");
assert.equal(daysBefore("2026-03-01T00:30", 1), "2026-02-28T00:30");

// Carruseles: próximos por fecha, jugados del más reciente; fuera los no jugados y los antiguos
const ms = [
  m("lejos", "2026-11-20T10:00:00"),
  m("cerca", "2026-11-14T10:00:00"),
  m("conf2", "2026-11-18T10:00:00"),
  m("conf1", "2026-11-15T10:00:00"),
  m("ayer", "2026-11-12T10:00:00"),
  m("antes", "2026-11-10T10:00:00"),
  m("viejo", "2026-10-01T10:00:00"),
  m("incompleto", "2026-11-11T10:00:00"),
];
const ps = [
  ...four("lejos").slice(0, 1), ...four("cerca").slice(0, 2), ...four("conf1"), ...four("conf2"),
  ...four("ayer"), ...four("antes"), ...four("viejo"), ...four("incompleto").slice(0, 2),
];
const h = homeFriendlies(ms, ps, NOW);
assert.deepEqual(h.open.map((x) => x.id), ["cerca", "lejos"]);
assert.deepEqual(h.confirmed.map((x) => x.id), ["conf1", "conf2"]);
assert.deepEqual(h.played.map((x) => x.id), ["ayer", "antes"]);

// Estadísticas: solo los completos con resultado, y cuentan como los de liga
const played = [
  m("g", "2026-11-01T10:00:00", { sets_a: 2, sets_b: 0 }),
  m("p", "2026-11-02T10:00:00", { sets_a: 2, sets_b: 1, score_detail: "6-4 3-6 6-2" }),
  m("sin", "2026-11-03T10:00:00"),
];
const rows = friendlyStatRows(played, [...four("g"), ...four("p", ["p3", "p4", "p1", "p2"]), ...four("sin")]);
assert.equal(rows.matches.length, 2);
assert.equal(rows.players.length, 8);
const s = playerStats("p1", rows.matches, rows.players);
assert.equal(s.total.played, 2);
assert.equal(s.total.won, 1);
assert.equal(s.total.lost, 1);
assert.equal(s.total.points, 3 + 1, "2-0 = 3 puntos, perder 1-2 = 1 punto");
assert.deepEqual(s.partners.map((x) => x.id), ["p2"]);
assert.deepEqual(s.rivals.map((x) => x.id).sort(), ["p3", "p4"]);

// Tarjetas del inicio
const fmt = (at: string | null) => (at ? `día ${at.slice(8, 10)}` : null);
const todos = friendlyTodos("p1", [future, m("ayer", "2026-11-12T10:00:00"), m("viejo", "2026-10-01T10:00:00")], [...four("f").slice(0, 2), ...four("ayer"), ...four("viejo")], NOW, fmt);
assert.deepEqual(todos.map((t) => t.title), ["Pon el resultado de tu amistoso", "Tienes un amistoso el día 14"]);
assert.equal(todos[1].text, "Faltan 2 jugadores.");
assert.deepEqual(friendlyTodos("p9", [future], four("f"), NOW, fmt), [], "no apuntado = sin tarjetas");

// WhatsApp
const names = (id: string) => ({ p1: "Ana", p2: "Bea", p3: "Carla", p4: "Dani" })[id] ?? id;
const msg = friendlyMessage({ ...future, place: "Club" }, four("f").slice(0, 3), names, fmt, "https://x/amistosos/f");
assert.match(msg, /Falta 1 jugador para un amistoso/);
assert.match(msg, /📍 Club/);
assert.match(msg, /Apuntados: Ana, Bea, Carla/);
assert.match(friendlyMessage(future, four("f"), names, fmt, "u"), /Ana y Bea vs Carla y Dani/);

console.log("friendlies: OK");
