import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { compareSlots } from "@/lib/pairing";
import {
  MATCH_COLUMNS,
  formatBooking,
  formatResult,
  formatSlot,
  loadPairDirectory,
  type Match,
} from "@/lib/matches";
import { RESULT_OPTIONS } from "@/lib/standings";
import { requireProfile } from "@/lib/session";
import { formatWeek, slotKey, weekDays } from "@/lib/weeks";
import { deleteMatch, saveBooking, saveResult, updateMatch } from "../actions";

const input = "rounded-lg border border-gray-300 px-2 py-1 text-black";

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

  const { data: match } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .eq("id", id)
    .maybeSingle<Match>();
  if (!match) notFound();

  const days = weekDays(match.week_start);
  const [{ pairs, pairName, playersOf }, { data: slots }] = await Promise.all([
    loadPairDirectory(supabase),
    supabase
      .from("availability")
      .select("pair_id, day, hour")
      .in("pair_id", [match.pair_a, match.pair_b])
      .gte("day", days[0])
      .lte("day", days[6])
      .returns<{ pair_id: string; day: string; hour: number }[]>(),
  ]);

  const a = new Set((slots ?? []).filter((s) => s.pair_id === match.pair_a).map((s) => slotKey(s.day, s.hour)));
  const common = (slots ?? [])
    .filter((s) => s.pair_id === match.pair_b && a.has(slotKey(s.day, s.hour)))
    .map((s) => slotKey(s.day, s.hour))
    .sort(compareSlots);

  const isPlayer = !!profile.pair_id && [match.pair_a, match.pair_b].includes(profile.pair_id);
  const canBook = isPlayer || profile.is_organizer;
  const booking = formatBooking(match.booking_at);
  const result = formatResult(match, pairName);
  const currentResult = match.sets_a === null ? "" : `${match.sets_a}-${match.sets_b}`;
  const resultLabel = (a: number, b: number) =>
    a === b
      ? "1-1 · sin terminar, empate"
      : `${a}-${b} · gana ${a > b ? pairName(match.pair_a) : pairName(match.pair_b)}`;
  const currentSlot = match.slot_day !== null && match.slot_hour !== null ? slotKey(match.slot_day, match.slot_hour) : "";
  const slotOptions = currentSlot && !common.includes(currentSlot) ? [currentSlot, ...common] : common;

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
          {playersOf(match.pair_a) || "—"} contra {playersOf(match.pair_b) || "—"}
          {match.status === "cancelado" && " · CANCELADO"}
        </p>

        <Notice ok={notice.ok} error={notice.error} />

        <section className="mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="font-semibold">Cuándo coinciden</h2>
          <p className="text-sm">Propuesta: {formatSlot(match.slot_day, match.slot_hour)}</p>
          {common.length > 1 && (
            <p className="mt-1 text-xs opacity-70">
              También pueden: {common.filter((k) => k !== currentSlot).map((k) => formatSlot(...splitSlot(k))).join("; ")}
            </p>
          )}
        </section>

        {match.status !== "cancelado" && (
          <section className="mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="font-semibold">Resultado</h2>
            <p className="text-sm">{result ? <>🏆 {result}</> : "Sin resultado todavía."}</p>
            {canBook && (
              <form action={saveResult} className="mt-3 flex flex-col gap-2 text-sm">
                <input type="hidden" name="id" value={match.id} />
                <p className="text-xs opacity-70">
                  Sets ganados por {pairName(match.pair_a)} y por {pairName(match.pair_b)}. Si el
                  partido no se terminó, poned 1-1 (empate) o, si las dos parejas acordáis un
                  ganador, 2-1 o 2-0.
                </p>
                <div className="flex flex-col gap-1">
                  {RESULT_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="result"
                        value={o.value}
                        defaultChecked={currentResult === o.value}
                      />
                      {resultLabel(o.a, o.b)}
                    </label>
                  ))}
                </div>
                <input
                  name="score_detail"
                  defaultValue={match.score_detail ?? ""}
                  placeholder="Juegos, opcional (ej.: 6-4 3-6 7-5)"
                  className={input}
                />
                <div className="flex gap-3">
                  <button className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white">
                    Guardar resultado
                  </button>
                  {result && (
                    <button name="clear" value="1" className="text-red-600 underline">
                      Borrar resultado
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        )}

        <section className="mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="font-semibold">Reserva de pista</h2>
          {booking ? (
            <p className="text-sm">
              📍 <b>{match.booking_place || "Lugar sin indicar"}</b>, {booking}
            </p>
          ) : (
            <p className="rounded-lg bg-amber-100 p-2 text-sm text-amber-900">
              ⚠️ Recordad reservar pista y apuntar aquí el lugar y la hora para que lo vean todos.
            </p>
          )}
          {canBook && (
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
              <button className="self-start rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold text-white">
                Guardar reserva
              </button>
            </form>
          )}
        </section>

        {profile.is_organizer && (
          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="mb-2 font-semibold">Cambiar emparejamiento (organizador)</h2>
            <form action={updateMatch} className="flex flex-col gap-2 text-sm">
              <input type="hidden" name="id" value={match.id} />
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
              <label>
                Franja{" "}
                <select name="slot" defaultValue={currentSlot} className={input}>
                  <option value="">Sin franja</option>
                  {slotOptions.map((k) => (
                    <option key={k} value={k}>
                      {formatSlot(...splitSlot(k))}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estado{" "}
                <select
                  name="status"
                  defaultValue={match.status === "cancelado" ? "cancelado" : match.status}
                  className={input}
                >
                  <option value={match.status === "cancelado" ? "programado" : match.status}>
                    Activo
                  </option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </label>
              <button className="self-start rounded-lg bg-gray-800 px-3 py-1 font-semibold text-white">
                Guardar cambios
              </button>
            </form>
            <form action={deleteMatch} className="mt-3">
              <input type="hidden" name="id" value={match.id} />
              <input type="hidden" name="week_start" value={match.week_start} />
              <button className="text-sm text-red-600 underline">Borrar partido</button>
            </form>
          </section>
        )}
      </main>
    </>
  );
}

function splitSlot(key: string): [string, number] {
  const [day, hour] = key.split("|");
  return [day, Number(hour)];
}
