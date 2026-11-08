// "Lo tuyo" en la portada: lo que un jugador tiene pendiente.
// Sin imports de ejecución para poder probarlo con node directamente.
import type { Match, ProposedResult } from "@/lib/matches";

export type Todo = {
  /** "action" = tiene que hacer algo; "info" = solo para que lo sepa. */
  tone: "action" | "info";
  icon: string;
  title: string;
  text: string;
  href: string;
};

export type TodoInput = {
  myPair: string;
  /** Liga individual: la pareja con la que juega en cada partido (si no, myPair). */
  mySide?: (m: Match) => string;
  thisWeek: string;
  nextWeek: string;
  /** Partidos de su pareja en la liga en curso, sin resultado confirmado y no cancelados. */
  matches: Match[];
  proposals: ProposedResult[];
  /** Semana por la que se pregunta la disponibilidad, y si ya ha contestado. */
  availabilityWeek: string;
  answered: boolean;
  isOpen: (m: Match) => boolean;
  pairName: (id: string) => string;
  playersOf: (id: string) => string;
  formatBooking: (at: string | null) => string | null;
  formatWeekLong: (weekStart: string) => string;
};

export function myTodos(i: TodoInput): Todo[] {
  const todos: Todo[] = [];
  const me = (m: Match) => i.mySide?.(m) ?? i.myPair;
  const rivalOf = (m: Match) => (m.pair_a === me(m) ? m.pair_b : m.pair_a);
  const rivalText = (m: Match) => {
    const r = rivalOf(m);
    const players = i.playersOf(r);
    return players ? `${i.pairName(r)} (${players})` : i.pairName(r);
  };
  const byWeek = [...i.matches].sort((a, b) => a.week_start.localeCompare(b.week_start));

  // 1. Resultados por poner o confirmar (partidos ya jugados).
  for (const m of byWeek.filter((m) => i.isOpen(m))) {
    const props = i.proposals.filter((p) => p.match_id === m.id);
    const mine = props.find((p) => p.pair_id === me(m));
    const theirs = props.find((p) => p.pair_id !== me(m));
    const href = `/partidos/${m.id}`;
    const rival = i.pairName(rivalOf(m));
    if (!mine && !theirs) {
      todos.push({ tone: "action", icon: "📝", title: "Falta poner el resultado", text: `Partido contra ${rival}.`, href });
    } else if (!mine && theirs) {
      todos.push({
        tone: "action",
        icon: "✅",
        title: "Confirma el resultado",
        text: `${rival} ha puesto ${theirs.sets_a}-${theirs.sets_b}. Falta que lo confirméis.`,
        href,
      });
    } else if (mine && theirs) {
      todos.push({
        tone: "action",
        icon: "⚠️",
        title: "Los resultados no coinciden",
        text: `Vosotros y ${rival} habéis puesto resultados distintos. Hablad y corregidlo.`,
        href,
      });
    } else {
      todos.push({ tone: "info", icon: "⏳", title: "Resultado enviado", text: `Falta que ${rival} lo confirme.`, href });
    }
  }

  // 2. Próximos partidos (esta semana y la siguiente).
  for (const m of byWeek.filter((m) => !i.isOpen(m) && (m.week_start === i.thisWeek || m.week_start === i.nextWeek))) {
    const when = i.formatBooking(m.booking_at);
    todos.push({
      tone: when ? "info" : "action",
      icon: "🎾",
      title: m.week_start === i.thisWeek ? "Tu partido de esta semana" : "Tu partido de la semana que viene",
      text: `Contra ${rivalText(m)}. ` + (when ? `📍 ${m.booking_place || "Lugar sin indicar"}, ${when}.` : "Falta reservar pista y apuntar lugar, fecha y hora."),
      href: `/partidos/${m.id}`,
    });
  }

  // 3. Disponibilidad sin contestar.
  if (!i.answered) {
    todos.push({
      tone: "action",
      icon: "📅",
      title: "¿Puedes jugar?",
      text: `Aún no has dicho si puedes jugar la semana del ${i.formatWeekLong(i.availabilityWeek)}.`,
      href: `/disponibilidad?semana=${i.availabilityWeek}`,
    });
  }

  return todos;
}
