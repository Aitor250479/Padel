// Nivel de cada jugador, de 1,00 a 10, calculado con los partidos oficiales.
// Sin imports de ejecución para poder probarlo con node directamente.
//
//  * Nivel inicial: sale del formulario, la mitad de (1,00 + 0,25 por punto),
//    entre 1,00 y 3,25.
//    Quien no lo ha rellenado empieza en 1,00.
//  * Nivel de una pareja = media de sus jugadores en ese partido.
//  * Resultado esperado = 1 / (1 + 10^(nivel rival - nivel propio)).
//  * Lo que vale el resultado: 2-0 = 1, 2-1 = 0,8, 1-1 = 0,5, 1-2 = 0,2, 0-2 = 0.
//  * Cambio = 0,2 × (resultado - esperado), igual para los dos de la pareja.
//    Ganando nunca se baja y perdiendo nunca se sube. Entre 1,00 y 10.
//  * Se recalcula siempre desde cero con todos los partidos, por orden.

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 10;
export const DEFAULT_LEVEL = 1;
export const K = 0.2;
export const POINT_VALUE = 0.25;
/** Lo más alto que da el formulario: de ahí para arriba solo se sube jugando. */
export const MAX_INITIAL = 3.25;
/** El formulario da la mitad de (1,00 + 0,25 por punto). */
export const FORM_FACTOR = 0.5;

export type LevelQuestion = { key: string; text: string; options: string[] };

/** Formulario del nivel inicial. Cada opción vale su posición (0, 1, 2, 3). */
export const LEVEL_QUESTIONS: LevelQuestion[] = [
  {
    key: "experiencia",
    text: "¿Cuánto tiempo llevas jugando al pádel?",
    options: ["Menos de 6 meses", "De 6 meses a 2 años", "De 2 a 5 años", "Más de 5 años"],
  },
  {
    key: "frecuencia",
    text: "¿Cada cuánto juegas?",
    options: ["Menos de una vez al mes", "De 1 a 3 veces al mes", "Una vez por semana", "Dos o más veces por semana"],
  },
  {
    key: "raqueta",
    text: "¿Has jugado a tenis, squash u otro deporte de raqueta?",
    options: ["No", "Un poco", "Mucho, o he estado federado"],
  },
  {
    key: "peloteo",
    text: "Peloteo",
    options: [
      "Me cuesta pasar la bola",
      "Aguanto intercambios cortos",
      "Aguanto intercambios largos sin fallar",
      "Mando la bola donde quiero",
    ],
  },
  {
    key: "paredes",
    text: "Paredes",
    options: [
      "Las evito o no sé jugarlas",
      "A veces salgo de la pared de fondo",
      "Salgo de la pared de fondo y de la lateral",
      "Domino la doble pared",
    ],
  },
  {
    key: "red",
    text: "Juego en la red",
    options: [
      "Casi no subo a la red",
      "Voleo si la bola me llega fácil",
      "Voleo con dirección y hago bandeja",
      "Hago bandeja y víbora con intención",
    ],
  },
  {
    key: "remate",
    text: "Remate",
    options: ["No remato", "Remato a veces", "Remato fuerte y con dirección", "Saco la bola por 3 o por 4"],
  },
  {
    key: "competicion",
    text: "Competición",
    options: [
      "Nunca he competido",
      "Torneos sociales o ligas de club",
      "Juego torneos con regularidad",
      "Estoy federado o tengo ranking",
    ],
  },
];

export const MAX_POINTS = LEVEL_QUESTIONS.reduce((n, q) => n + q.options.length - 1, 0);

const clamp = (x: number) => Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, x));
/** Redondeo a 2 decimales, como se guarda en la base de datos. */
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Respuestas válidas: una por pregunta y dentro de sus opciones. */
export function validAnswers(answers: number[]) {
  return (
    answers.length === LEVEL_QUESTIONS.length &&
    answers.every((a, i) => Number.isInteger(a) && a >= 0 && a < LEVEL_QUESTIONS[i].options.length)
  );
}

/** Nivel inicial a partir de las respuestas del formulario. */
export function initialLevelFrom(answers: number[]) {
  const points = answers.reduce((n, a) => n + a, 0);
  return Math.max(MIN_LEVEL, Math.min(MAX_INITIAL, round2((MIN_LEVEL + points * POINT_VALUE) * FORM_FACTOR)));
}

/** Lo que vale un resultado en sets para quien lo saca (2-0 = 1 ... 0-2 = 0). */
export function resultScore(mine: number, theirs: number) {
  if (mine === theirs) return 0.5;
  if (mine > theirs) return theirs === 0 ? 1 : 0.8;
  return mine === 0 ? 0 : 0.2;
}

/** Resultado esperado (de 0 a 1) para una pareja de nivel `mine` contra `theirs`. */
export function expectedScore(mine: number, theirs: number) {
  return 1 / (1 + 10 ** (theirs - mine));
}

/** Cambio de nivel de cada jugador de una pareja tras un partido. */
export function levelChange(mine: number, theirs: number, setsMine: number, setsTheirs: number) {
  const delta = K * (resultScore(setsMine, setsTheirs) - expectedScore(mine, theirs));
  if (setsMine > setsTheirs) return Math.max(0, delta);
  if (setsMine < setsTheirs) return Math.min(0, delta);
  return delta;
}

export type LevelMatch = {
  id: string;
  week_start: string;
  /** Para ordenar los partidos de una misma semana. */
  booking_at?: string | null;
  result_at?: string | null;
  pair_a: string;
  pair_b: string;
  sets_a: number;
  sets_b: number;
};

export type LevelPlayer = { match_id: string; profile_id: string; pair_id: string };

export type LevelStep = {
  matchId: string;
  week: string;
  before: number;
  after: number;
  /** Media de la pareja rival antes del partido. */
  rival: number;
  result: string;
};

export type PlayerLevel = {
  level: number;
  initial: number;
  /** false si no ha rellenado el formulario (empieza en 1,00). */
  rated: boolean;
  history: LevelStep[];
};

function matchOrder(a: LevelMatch, b: LevelMatch) {
  return (
    a.week_start.localeCompare(b.week_start) ||
    (a.booking_at ?? "~").localeCompare(b.booking_at ?? "~") ||
    (a.result_at ?? "~").localeCompare(b.result_at ?? "~") ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Niveles de todos los jugadores, recorriendo los partidos confirmados en orden.
 * `initial` tiene el nivel inicial de quien ha rellenado el formulario.
 */
export function computeLevels(matches: LevelMatch[], players: LevelPlayer[], initial: Map<string, number>) {
  const result = new Map<string, PlayerLevel>();
  const get = (id: string) => {
    let p = result.get(id);
    if (!p) {
      const start = initial.get(id);
      p = { level: start ?? DEFAULT_LEVEL, initial: start ?? DEFAULT_LEVEL, rated: start !== undefined, history: [] };
      result.set(id, p);
    }
    return p;
  };
  for (const id of initial.keys()) get(id);

  const byMatch = new Map<string, LevelPlayer[]>();
  for (const p of players) {
    if (!byMatch.has(p.match_id)) byMatch.set(p.match_id, []);
    byMatch.get(p.match_id)!.push(p);
  }

  for (const m of [...matches].sort(matchOrder)) {
    const inMatch = byMatch.get(m.id) ?? [];
    const sideA = inMatch.filter((p) => p.pair_id === m.pair_a).map((p) => get(p.profile_id));
    const sideB = inMatch.filter((p) => p.pair_id === m.pair_b).map((p) => get(p.profile_id));
    if (!sideA.length || !sideB.length) continue;
    const avg = (side: PlayerLevel[]) => side.reduce((n, p) => n + p.level, 0) / side.length;
    const levelA = avg(sideA);
    const levelB = avg(sideB);
    const deltaA = levelChange(levelA, levelB, m.sets_a, m.sets_b);
    const deltaB = levelChange(levelB, levelA, m.sets_b, m.sets_a);
    const apply = (side: PlayerLevel[], delta: number, rival: number, result: string) => {
      for (const p of side) {
        const before = p.level;
        p.level = clamp(before + delta);
        p.history.push({ matchId: m.id, week: m.week_start, before, after: p.level, rival, result });
      }
    };
    apply(sideA, deltaA, levelB, `${m.sets_a}-${m.sets_b}`);
    apply(sideB, deltaB, levelA, `${m.sets_b}-${m.sets_a}`);
  }
  return result;
}

/** 3,24 */
export function formatLevel(x: number) {
  return x.toFixed(2).replace(".", ",");
}

/** +0,06 / −0,10 / 0,00 */
export function formatChange(x: number) {
  const r = round2(x);
  if (r === 0) return "0,00";
  return `${r > 0 ? "+" : "−"}${formatLevel(Math.abs(r))}`;
}
