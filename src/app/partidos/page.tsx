import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { availablePairIds } from "@/lib/availability";
import {
  MATCH_COLUMNS,
  PROPOSED_COLUMNS,
  formatBooking,
  loadPairDirectory,
  resultOpen,
  resultStatus,
  type Match,
  type ProposedResult,
} from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { addDays, formatWeek, nowInSpain, parseWeek } from "@/lib/weeks";
import { confirmResultAsOrganizer, createMatch, generatePairings } from "./actions";
import { RESULT_OPTIONS } from "@/lib/standings";

const input = "rounded-lg border border-gray-300 px-2 py-1 text-black";

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const weekStart = parseWeek(params.semana);
  const now = nowInSpain();

  const [{ pairs, pairName, playersOf }, { data: matches }, available] = await Promise.all([
    loadPairDirectory(supabase),
    supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .eq("week_start", weekStart)
      .order("booking_at", { nullsFirst: false })
      .returns<Match[]>(),
    availablePairIds(supabase, weekStart),
  ]);
  const ids = (matches ?? []).map((m) => m.id);
  const { data: proposals } = ids.length
    ? await supabase
        .from("match_results")
        .select(PROPOSED_COLUMNS)
        .in("match_id", ids)
        .returns<ProposedResult[]>()
    : { data: [] as ProposedResult[] };

  // Organizador: partidos ya disputados (de cualquier semana) sin resultado confirmado.
  let pending: Match[] = [];
  let pendingProposals: ProposedResult[] = [];
  if (profile.is_organizer) {
    const { data: open } = await supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .is("sets_a", null)
      .neq("status", "cancelado")
      .order("week_start")
      .returns<Match[]>();
    pending = (open ?? []).filter((m) => resultOpen(m, now));
    if (pending.length) {
      const { data } = await supabase
        .from("match_results")
        .select(PROPOSED_COLUMNS)
        .in("match_id", pending.map((m) => m.id))
        .returns<ProposedResult[]>();
      pendingProposals = data ?? [];
    }
  }
  const proposalText = (m: Match, p: ProposedResult) =>
    `${pairName(m.pair_a)} ${p.sets_a}-${p.sets_b} ${pairName(m.pair_b)}${p.score_detail ? ` (${p.score_detail})` : ""}`;

  const active = (matches ?? []).filter((m) => m.status !== "cancelado");
  const busy = new Set(active.flatMap((m) => [m.pair_a, m.pair_b]));
  const availableSet = new Set(available);
  const free = pairs.filter((p) => !busy.has(p.id));

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-1 text-2xl font-bold">Partidos</h1>
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Link href={`/partidos?semana=${addDays(weekStart, -7)}`} className="underline">
            ← Anterior
          </Link>
          <span className="font-semibold">Semana del {formatWeek(weekStart)}</span>
          <Link href={`/partidos?semana=${addDays(weekStart, 7)}`} className="underline">
            Siguiente →
          </Link>
        </div>

        <Notice ok={params.ok} error={params.error} />

        {(matches ?? []).length === 0 ? (
          <p className="mb-6 opacity-70">Todavía no hay partidos esta semana.</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-2">
            {(matches ?? []).map((m) => {
              const mine = !!profile.pair_id && [m.pair_a, m.pair_b].includes(profile.pair_id);
              const booking = formatBooking(m.booking_at);
              const status = resultStatus(m, proposals ?? [], pairName);
              const showResult = status.tone === "ok" || (proposals ?? []).some((p) => p.match_id === m.id) || resultOpen(m, now);
              return (
                <li key={m.id}>
                  <Link
                    href={`/partidos/${m.id}`}
                    className={[
                      "block rounded-xl border p-3 hover:bg-gray-50 dark:hover:bg-gray-900",
                      mine ? "border-emerald-500" : "border-gray-200 dark:border-gray-800",
                      m.status === "cancelado" ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <p className="font-semibold">
                      {pairName(m.pair_a)} <span className="opacity-60">vs</span> {pairName(m.pair_b)}
                      {mine && <span className="ml-2 text-xs text-emerald-600">tu partido</span>}
                      {m.status === "cancelado" && <span className="ml-2 text-xs">cancelado</span>}
                    </p>
                    <p className="text-xs opacity-70">
                      {playersOf(m.pair_a) || "—"} · {playersOf(m.pair_b) || "—"}
                    </p>
                    {m.status !== "cancelado" && (
                      <>
                        <p className="mt-1 text-sm">
                          {booking ? (
                            <>📍 {m.booking_place || "Lugar sin indicar"}, {booking}</>
                          ) : (
                            <span className="text-amber-700">Falta poner lugar, fecha y hora</span>
                          )}
                        </p>
                        {showResult && (
                          <p
                            className={[
                              "mt-1 text-sm",
                              status.tone === "ok" ? "font-semibold" : status.tone === "warn" ? "text-red-600" : "text-amber-700",
                            ].join(" ")}
                          >
                            {status.tone === "ok" ? "🏆 " : ""}
                            {status.text}
                          </p>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {free.length > 0 && (
          <section className="mb-6 text-sm">
            <h2 className="mb-1 font-semibold">Parejas sin partido esta semana ({free.length})</h2>
            <ul>
              {free.map((p) => (
                <li key={p.id}>
                  {p.name}{" "}
                  <span className="opacity-60">
                    {availableSet.has(p.id) ? "· pueden jugar" : "· no pueden o falta que respondan"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile.is_organizer && (
          <section className="mb-6 rounded-xl border border-amber-300 p-4 dark:border-amber-800">
            <h2 className="mb-1 font-semibold">Organizador · Resultados pendientes de confirmar</h2>
            <p className="mb-3 text-xs opacity-70">
              Partidos ya disputados, de cualquier semana, cuyo resultado aún no cuenta. Puedes
              confirmar el que puso una pareja o fijar tú el resultado.
            </p>
            {pending.length === 0 ? (
              <p className="text-sm opacity-70">No hay ninguno. ¡Todo al día! 🎉</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pending.map((m) => {
                  const props = pendingProposals.filter((p) => p.match_id === m.id);
                  return (
                    <li key={m.id} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
                      <Link href={`/partidos/${m.id}`} className="font-semibold underline">
                        {pairName(m.pair_a)} vs {pairName(m.pair_b)}
                      </Link>
                      <span className="opacity-60"> · semana del {formatWeek(m.week_start)}</span>
                      {props.length === 0 && (
                        <p className="mt-1 opacity-70">Ninguna pareja ha puesto el resultado.</p>
                      )}
                      {props.map((p) => (
                        <form
                          key={p.pair_id}
                          action={confirmResultAsOrganizer}
                          className="mt-2 flex flex-wrap items-center gap-2"
                        >
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="from_pair" value={p.pair_id} />
                          <input type="hidden" name="week" value={weekStart} />
                          <span className="flex-1">
                            {pairName(p.pair_id)} puso: <b>{proposalText(m, p)}</b>
                          </span>
                          <button className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white">
                            Confirmar este
                          </button>
                        </form>
                      ))}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs underline opacity-70">
                          Poner otro resultado
                        </summary>
                        <form action={confirmResultAsOrganizer} className="mt-2 flex flex-wrap gap-2">
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="week" value={weekStart} />
                          <select name="result" required defaultValue="" className={input}>
                            <option value="" disabled>
                              Resultado
                            </option>
                            {RESULT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {pairName(m.pair_a)} {o.value} {pairName(m.pair_b)}
                              </option>
                            ))}
                          </select>
                          <input name="score_detail" placeholder="Juegos (ej.: 6-4 3-6 7-5)" className={input} />
                          <button className="rounded-lg bg-gray-800 px-3 py-1 font-semibold text-white">
                            Confirmar
                          </button>
                        </form>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {profile.is_organizer && (
          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="mb-2 font-semibold">Organizador · Emparejamientos</h2>
            <form action={generatePairings} className="mb-2">
              <input type="hidden" name="week_start" value={weekStart} />
              <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
                Generar emparejamientos
              </button>
            </form>
            <p className="mb-4 text-xs opacity-70">
              Empareja al azar a las parejas sin partido en las que los dos jugadores pueden jugar
              esta semana ({free.filter((p) => availableSet.has(p.id)).length} ahora mismo),
              priorizando como rival a quien menos partidos lleva. Si son impares, descansa la que
              más partidos lleva. Los partidos ya creados no se tocan.
            </p>

            <h3 className="mb-1 text-sm font-semibold">Crear partido a mano</h3>
            <form action={createMatch} className="flex flex-wrap gap-2">
              <input type="hidden" name="week_start" value={weekStart} />
              {(["pair_a", "pair_b"] as const).map((name) => (
                <select key={name} name={name} defaultValue="" className={input}>
                  <option value="" disabled>
                    Elegir pareja
                  </option>
                  {pairs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {busy.has(p.id) ? " (ya tiene partido)" : ""}
                    </option>
                  ))}
                </select>
              ))}
              <button className="rounded-lg bg-gray-800 px-3 py-1 text-sm font-semibold text-white">
                Crear
              </button>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
