import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { MATCH_COLUMNS, formatBooking, formatSlot, loadPairDirectory, type Match } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { addDays, formatWeek, parseWeek, weekDays } from "@/lib/weeks";
import { createMatch, generatePairings } from "./actions";

const input = "rounded-lg border border-gray-300 px-2 py-1 text-black";

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const params = await searchParams;
  const weekStart = parseWeek(params.semana);
  const days = weekDays(weekStart);

  const [{ pairs, pairName, playersOf }, { data: matches }, { data: slots }, { data: weeks }] =
    await Promise.all([
      loadPairDirectory(supabase),
      supabase
        .from("matches")
        .select(MATCH_COLUMNS)
        .eq("week_start", weekStart)
        .order("slot_day", { nullsFirst: false })
        .order("slot_hour")
        .returns<Match[]>(),
      supabase
        .from("availability")
        .select("pair_id")
        .gte("day", days[0])
        .lte("day", days[6])
        .returns<{ pair_id: string }[]>(),
      supabase
        .from("availability_weeks")
        .select("pair_id")
        .eq("week_start", weekStart)
        .returns<{ pair_id: string }[]>(),
    ]);

  const active = (matches ?? []).filter((m) => m.status !== "cancelado");
  const busy = new Set(active.flatMap((m) => [m.pair_a, m.pair_b]));
  const withSlots = new Set((slots ?? []).map((s) => s.pair_id));
  const answered = new Set((weeks ?? []).map((w) => w.pair_id));
  const free = pairs.filter((p) => !busy.has(p.id));
  const notAnswered = free.filter((p) => !answered.has(p.id));

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
              const mine = profile.pair_id && [m.pair_a, m.pair_b].includes(profile.pair_id);
              const booking = formatBooking(m.booking_at);
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
                    <p className="mt-1 text-sm">
                      {booking ? (
                        <>
                          📍 {m.booking_place || "Lugar sin indicar"}, {booking}
                        </>
                      ) : (
                        <>
                          Coinciden el {formatSlot(m.slot_day, m.slot_hour)} ·{" "}
                          <span className="text-amber-700">pista sin reservar</span>
                        </>
                      )}
                    </p>
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
                    {!answered.has(p.id)
                      ? "· no ha indicado disponibilidad"
                      : !withSlots.has(p.id)
                        ? "· no puede esta semana"
                        : "· sin rival que coincida"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile.is_organizer && (
          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="mb-2 font-semibold">Organizador</h2>
            <form action={generatePairings} className="mb-2">
              <input type="hidden" name="week_start" value={weekStart} />
              <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">
                Generar emparejamientos
              </button>
            </form>
            <p className="mb-4 text-xs opacity-70">
              Empareja al azar a las parejas sin partido que coinciden en alguna franja, priorizando
              a quien menos partidos lleva. Los partidos ya creados no se tocan, así que se puede
              volver a pulsar cuando más parejas indiquen su disponibilidad.
              {notAnswered.length > 0 &&
                ` Ojo: ${notAnswered.length} pareja(s) aún no han indicado disponibilidad.`}
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
