import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import ResultFields from "@/components/ResultFields";
import WhatsAppLink from "@/components/WhatsAppLink";
import { matchMessage } from "@/lib/share";
import { siteUrl } from "@/lib/site-url";
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
import { displayName, requireProfile } from "@/lib/session";
import { gameField, parseGames } from "@/lib/score";
import { RESULT_OPTIONS } from "@/lib/standings";
import { formatWeek, formatWeekLong, nowInSpain } from "@/lib/weeks";
import { deleteMatch, saveBooking, saveResult, updateMatch } from "../actions";

const input = "rounded-lg border border-gray-300 px-2 py-1 text-black";
const card = "mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800";

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { id } = await params;
  const notice = await searchParams;

  const [{ data: match }, { data: proposals }, { pairs, pairName, playersOf, sideOf, membersOf, isLeaguePair, players }] = await Promise.all([
    supabase.from("matches").select(MATCH_COLUMNS).eq("id", id).maybeSingle<Match>(),
    supabase
      .from("match_results")
      .select(PROPOSED_COLUMNS)
      .eq("match_id", id)
      .returns<ProposedResult[]>(),
    loadPairDirectory(supabase),
  ]);
  if (!match) notFound();

  const myPair = sideOf(match, profile);
  const isPlayer = !!myPair;
  // Partido de liga individual: sus parejas se forman con 4 jugadores sueltos.
  const individualMatch = isLeaguePair(match.pair_a) || isLeaguePair(match.pair_b);
  const activePlayers = players
    .filter((p) => p.active !== false)
    .sort((x, y) => displayName(x).localeCompare(displayName(y)));
  const canEdit = isPlayer || profile.is_organizer;
  const booking = formatBooking(match.booking_at);
  const open = resultOpen(match, nowInSpain());
  const status = resultStatus(match, proposals ?? [], pairName);
  const myProposal = (proposals ?? []).find((p) => p.pair_id === myPair);
  const otherProposal = (proposals ?? []).find((p) => p.pair_id !== myPair);
  const cancelled = match.status === "cancelado";

  const label = (a: number, b: number) =>
    a === b
      ? "1-1 · sin terminar, empate"
      : `${a}-${b} · gana ${a > b ? pairName(match.pair_a) : pairName(match.pair_b)}`;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <Link href={`/partidos?semana=${match.week_start}`} className="text-sm underline">
          ← Partidos de la semana del {formatWeek(match.week_start)}
        </Link>

        <h1 className="mt-3 text-2xl font-bold">
          {pairName(match.pair_a)} <span className="opacity-60">vs</span> {pairName(match.pair_b)}
        </h1>
        <p className="mb-4 text-sm opacity-70">
          {individualMatch ? "Liga individual" : `${playersOf(match.pair_a) || "—"} contra ${playersOf(match.pair_b) || "—"}`}
          {cancelled && " · CANCELADO"}
        </p>

        <Notice ok={notice.ok} error={notice.error} />

        {!cancelled && (
          <section className={card}>
            <h2 className="font-semibold">Lugar, fecha y hora</h2>
            {booking ? (
              <p className="text-sm">
                📍 <b>{match.booking_place || "Lugar sin indicar"}</b>, {booking}
              </p>
            ) : (
              <p className="rounded-lg bg-amber-100 p-2 text-sm text-amber-900">
                ⚠️ Recordad reservar pista y apuntar aquí el lugar, la fecha y la hora para que lo
                vean todos.
              </p>
            )}
            {isPlayer && (
              <div className="mt-3">
                <WhatsAppLink text={matchMessage(match, myPair, { pairName, playersOf, formatBooking, formatWeekLong }, await siteUrl())}>
                  {booking ? "Mandar lugar y hora por WhatsApp" : "Hablar con el rival por WhatsApp"}
                </WhatsAppLink>
              </div>
            )}
            {canEdit && (
              <form action={saveBooking} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="id" value={match.id} />
                <input
                  name="booking_place"
                  defaultValue={match.booking_place ?? ""}
                  placeholder="Club o lugar de la pista"
                  className={input}
                />
                <input
                  type="datetime-local"
                  name="booking_at"
                  defaultValue={match.booking_at?.slice(0, 16) ?? ""}
                  className={input}
                />
                <SubmitButton className="self-start rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
                  Guardar
                </SubmitButton>
              </form>
            )}
          </section>
        )}

        {!cancelled && (
          <section className={card}>
            <h2 className="font-semibold">Resultado</h2>
            <p
              className={[
                "text-sm",
                status.tone === "ok" ? "font-semibold" : status.tone === "warn" ? "text-red-600" : "text-amber-700",
              ].join(" ")}
            >
              {status.tone === "ok" ? "🏆 " : ""}
              {status.text}
            </p>

            {status.tone !== "ok" && (proposals ?? []).length > 0 && (
              <ul className="mt-2 text-sm">
                {(proposals ?? []).map((p) => (
                  <li key={p.pair_id}>
                    {pairName(p.pair_id)} dice: <b>{label(p.sets_a, p.sets_b)}</b>
                    {p.score_detail ? ` (${p.score_detail})` : ""}
                  </li>
                ))}
              </ul>
            )}

            {isPlayer && !open && (
              <p className="mt-2 text-sm opacity-70">
                {match.booking_at
                  ? "Podréis poner el resultado cuando haya pasado la fecha y hora del partido."
                  : "Podréis poner el resultado cuando haya pasado la fecha del partido. Apuntad arriba cuándo jugáis."}
              </p>
            )}

            {isPlayer && open && (
              <>
                {!myProposal && otherProposal && (
                  <form action={saveResult} className="mt-3">
                    <input type="hidden" name="id" value={match.id} />
                    <input
                      type="hidden"
                      name="result"
                      value={`${otherProposal.sets_a}-${otherProposal.sets_b}`}
                    />
                    {parseGames(otherProposal.score_detail).flatMap((g, i) => [
                      <input key={`a${i}`} type="hidden" name={gameField("a", i + 1)} value={g.a} />,
                      <input key={`b${i}`} type="hidden" name={gameField("b", i + 1)} value={g.b} />,
                    ])}
                    <SubmitButton className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                      ✅ Confirmar {otherProposal.sets_a}-{otherProposal.sets_b}
                    </SubmitButton>
                    <p className="mt-1 text-xs opacity-70">
                      Si no estáis de acuerdo, poned abajo el resultado correcto.
                    </p>
                  </form>
                )}
                <ResultForm
                  matchId={match.id}
                  current={myProposal}
                  label={label}
                  pairA={pairName(match.pair_a)}
                  pairB={pairName(match.pair_b)}
                  title={myProposal ? "Cambiar vuestro resultado" : "Poner el resultado de vuestra pareja"}
                />
              </>
            )}

            {profile.is_organizer && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-semibold">
                  Fijar el resultado como organizador
                </summary>
                <p className="mt-1 text-xs opacity-70">
                  Lo pone como confirmado por las dos parejas, sin esperar a que lo introduzcan.
                </p>
                <ResultForm
                  matchId={match.id}
                  current={status.tone === "ok" && match.sets_a !== null ? { sets_a: match.sets_a, sets_b: match.sets_b!, score_detail: match.score_detail } : undefined}
                  label={label}
                  pairA={pairName(match.pair_a)}
                  pairB={pairName(match.pair_b)}
                  asOrganizer
                />
              </details>
            )}
          </section>
        )}

        {profile.is_organizer && (
          <section className={card}>
            <h2 className="mb-2 font-semibold">Cambiar emparejamiento (organizador)</h2>
            <form action={updateMatch} className="flex flex-col gap-2 text-sm">
              <input type="hidden" name="id" value={match.id} />
              {individualMatch ? (
                <>
                  <input type="hidden" name="pair_a" value={match.pair_a} />
                  <input type="hidden" name="pair_b" value={match.pair_b} />
                  {(["a", "b"] as const).map((side) => {
                    const members = membersOf(side === "a" ? match.pair_a : match.pair_b);
                    return (
                      <div key={side} className="flex flex-wrap items-center gap-2">
                        <span className="w-16 font-semibold">Pareja {side.toUpperCase()}</span>
                        {[0, 1].map((n) => (
                          <select key={n} name={`${side}${n + 1}`} defaultValue={members[n] ?? ""} className={input}>
                            <option value="" disabled>
                              Jugador
                            </option>
                            {activePlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {displayName(p)}
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(["pair_a", "pair_b"] as const).map((name) => (
                    <select key={name} name={name} defaultValue={match[name]} className={input}>
                      {pairs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              )}
              <label>
                Estado{" "}
                <select name="status" defaultValue={cancelled ? "cancelado" : match.status} className={input}>
                  <option value={cancelled ? "programado" : match.status}>Activo</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
              <SubmitButton className="self-start rounded-lg bg-gray-800 px-3 py-1 font-semibold text-white">
                Guardar cambios
              </SubmitButton>
            </form>
            <form action={deleteMatch} className="mt-3">
              <input type="hidden" name="id" value={match.id} />
              <input type="hidden" name="week_start" value={match.week_start} />
              <ConfirmButton
                message="¿Seguro que quieres borrar este partido? Se borrarán también sus resultados."
                pendingText="Borrando…"
                className="text-sm text-red-600 underline"
              >
                Borrar partido
              </ConfirmButton>
            </form>
          </section>
        )}
      </main>
    </>
  );
}

function ResultForm({
  matchId,
  current,
  label,
  pairA,
  pairB,
  title,
  asOrganizer,
}: {
  matchId: string;
  current?: { sets_a: number; sets_b: number; score_detail: string | null };
  label: (a: number, b: number) => string;
  pairA: string;
  pairB: string;
  title?: string;
  asOrganizer?: boolean;
}) {
  const options = RESULT_OPTIONS.map((o) => {
    const [score, ...rest] = label(o.a, o.b).split(" · ");
    return { ...o, score, text: rest.join(" · ") };
  });
  return (
    <form action={saveResult} className="mt-3 flex flex-col gap-2 text-sm">
      <input type="hidden" name="id" value={matchId} />
      {asOrganizer && <input type="hidden" name="as_organizer" value="1" />}
      {title && <p className="font-medium">{title}</p>}
      <p className="text-xs opacity-70">
        Sets ganados por cada pareja. Si el partido no se terminó, poned 1-1 (empate) o, si las
        dos parejas acordáis un ganador, 2-1 o 2-0.
      </p>
      <ResultFields
        options={options}
        pairA={pairA}
        pairB={pairB}
        defaultResult={current ? `${current.sets_a}-${current.sets_b}` : ""}
        defaultDetail={current?.score_detail}
      />
      <div className="flex gap-3">
        <SubmitButton className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
          Guardar resultado
        </SubmitButton>
        {current && (
          <ConfirmButton
            message="¿Seguro que quieres borrar el resultado?"
            name="clear"
            value="1"
            pendingText="Borrando…"
            className="text-red-600 underline"
          >
            Borrar
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
