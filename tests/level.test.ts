import {
  LEVEL_QUESTIONS,
  MAX_POINTS,
  computeLevels,
  formatChange,
  formatLevel,
  initialLevelFrom,
  levelChange,
  validAnswers,
} from "../src/lib/level.ts";

const expect = (cond: boolean, msg: string) => { console.log(cond ? "ok" : "FAIL", msg); if (!cond) process.exitCode = 1; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

expect(LEVEL_QUESTIONS.length === 8 && MAX_POINTS === 23, "8 preguntas y 23 puntos");
expect(initialLevelFrom([0, 0, 0, 0, 0, 0, 0, 0]) === 1, "todo a cero = 1,00");
expect(initialLevelFrom([3, 3, 2, 3, 3, 3, 3, 3]) === 6.5, "todo al máximo = 6,50 (tope)");
expect(initialLevelFrom([3, 3, 2, 3, 3, 3, 3, 2]) === 6.5, "22 puntos = 6,50");
expect(initialLevelFrom([2, 2, 1, 2, 1, 2, 1, 1]) === 4, "12 puntos = 4,00");
expect(validAnswers([0, 1, 2, 3, 0, 1, 2, 3]), "respuestas válidas");
expect(!validAnswers([0, 1, 3, 3, 0, 1, 2, 3]), "raqueta solo llega a 2");
expect(!validAnswers([0, 1]), "faltan respuestas");

// Ejemplos de la propuesta.
expect(near(levelChange(3, 3, 2, 0), 0.2), "2-0 a igual: +0,20");
expect(near(levelChange(3, 3, 2, 1), 0.12), "2-1 a igual: +0,12");
expect(near(levelChange(3, 3, 0, 2), -0.2), "0-2 contra igual: −0,20");
expect(near(levelChange(3, 3, 1, 2), -0.12), "1-2 contra igual: −0,12");
expect(near(levelChange(3, 3, 1, 1), 0), "empate entre iguales: 0");
expect(levelChange(3, 2, 2, 1) === 0, "2-1 a uno peor: no sube (ni baja)");
expect(levelChange(3, 2, 2, 0) < 0.05, "2-0 a uno peor: casi nada");
expect(near(levelChange(2, 3, 2, 0), 0.364), "2-0 a uno mejor: +0,36");
expect(levelChange(2, 3, 2, 0) > levelChange(2, 3, 2, 1), "2-0 vale más que 2-1");
expect(levelChange(3, 3, 0, 2) < levelChange(3, 3, 1, 2), "0-2 quita más que 1-2");
expect(levelChange(2, 3, 1, 2) === 0, "perder 1-2 contra uno mejor no sube");
expect(levelChange(4, 3, 1, 1) < 0 && levelChange(3, 4, 1, 1) > 0, "empate: baja el mejor y sube el peor");

const m = (id: string, week: string, a: string, b: string, sa: number, sb: number) =>
  ({ id, week_start: week, pair_a: a, pair_b: b, sets_a: sa, sets_b: sb });
const pl = (match: string, pair: string, ...ids: string[]) => ids.map((profile_id) => ({ match_id: match, profile_id, pair_id: pair }));

// Pareja Ana+Luis (3 y 2 = 2,50) gana 2-1 a Pedro+Marta (3 y 3).
const one = computeLevels(
  [m("m1", "2026-11-02", "p1", "p2", 2, 1)],
  [...pl("m1", "p1", "ana", "luis"), ...pl("m1", "p2", "pedro", "marta")],
  new Map([["ana", 3], ["luis", 2], ["pedro", 3], ["marta", 3]]),
);
const ana = one.get("ana")!;
const pedro = one.get("pedro")!;
expect(near(ana.level - 3, one.get("luis")!.level - 2), "los dos de la pareja cambian lo mismo");
expect(near(ana.level - 3, -(pedro.level - 3)), "lo que gana una pareja lo pierde la otra");
expect(ana.history.length === 1 && ana.history[0].result === "2-1" && pedro.history[0].result === "1-2", "historial con el resultado");

// Sin formulario: empieza en 1,00 y no baja de 1,00.
const two = computeLevels([m("m1", "2026-11-02", "p1", "p2", 0, 2)], [...pl("m1", "p1", "x", "y"), ...pl("m1", "p2", "z", "w")], new Map());
expect(two.get("x")!.level === 1 && !two.get("x")!.rated, "sin formulario: 1,00 y pendiente");
expect(near(two.get("z")!.level, 1.2), "gana 2-0 entre iguales: 1,20");

// Cinco victorias seguidas contra la misma pareja de 1,00: cada vez sube menos.
const five = computeLevels(
  [1, 2, 3, 4, 5].map((i) => m(`m${i}`, `2026-11-0${i}`, "p1", "p2", 2, 0)),
  [1, 2, 3, 4, 5].flatMap((i) => [...pl(`m${i}`, "p1", "a", "b"), ...pl(`m${i}`, "p2", "c", "d")]),
  new Map(),
);
const steps = five.get("a")!.history.map((h) => h.after - h.before);
expect(steps.every((s, i) => i === 0 || s < steps[i - 1]), "cada victoria contra la misma pareja vale menos");
expect(near(five.get("a")!.level, 1.66), "cinco victorias a la misma pareja: 1,66");

// El orden de los partidos manda, no el orden en que llegan.
const shuffled = computeLevels(
  [5, 3, 1, 4, 2].map((i) => m(`m${i}`, `2026-11-0${i}`, "p1", "p2", 2, 0)),
  [1, 2, 3, 4, 5].flatMap((i) => [...pl(`m${i}`, "p1", "a", "b"), ...pl(`m${i}`, "p2", "c", "d")]),
  new Map(),
);
expect(shuffled.get("a")!.level === five.get("a")!.level, "mismo resultado aunque lleguen desordenados");

expect(formatLevel(3.2) === "3,20", "formato con coma");
expect(formatChange(0.061) === "+0,06" && formatChange(-0.1) === "−0,10" && formatChange(0.001) === "0,00", "formato del cambio");
