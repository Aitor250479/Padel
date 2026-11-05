import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import StandingsTable from "@/components/StandingsTable";
import { leagueStandings } from "@/lib/league-data";
import { LEAGUE_COLUMNS, type League } from "@/lib/leagues";
import { loadPairDirectory } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { renameLeague, startNewLeague } from "./actions";

const input = "min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-black";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
}

export default async function ClasificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { ok, error } = await searchParams;
  const [{ pairs, pairName }, { data: leagues }] = await Promise.all([
    loadPairDirectory(supabase),
    supabase.from("leagues").select(LEAGUE_COLUMNS).order("started_at", { ascending: false }).returns<League[]>(),
  ]);
  const current = (leagues ?? []).find((l) => !l.ended_at) ?? null;
  const previous = (leagues ?? []).filter((l) => l.ended_at);
  const { rows } = await leagueStandings(
    supabase,
    current,
    pairs.map((p) => p.id),
  );

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Clasificación</h1>
        {current && (
          <p className="mb-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            🏆 {current.name} · desde el {formatDate(current.started_at)}
          </p>
        )}
        <Notice ok={ok} error={error} />
        <StandingsTable
          rows={rows}
          pairName={pairName}
          highlight={profile.pair_id}
          hrefFor={current ? (id) => `/clasificacion/liga/${current.id}/pareja/${id}` : undefined}
        />
        {current && <p className="mt-2 text-xs opacity-60">Pulsa en una pareja para ver sus partidos.</p>}

        <div className="mt-4 text-xs opacity-70">
          <p className="font-semibold">
            Ganas 1 punto por cada set ganado, y 1 punto extra si ganas sin ceder ningún set.
          </p>
          <ul className="my-1 list-inside list-disc">
            <li>Ganar 2-0: 3 puntos (2 sets + 1 extra)</li>
            <li>Ganar 2-1: 2 puntos</li>
            <li>Perder 1-2: 1 punto</li>
            <li>Perder 0-2: 0 puntos</li>
            <li>Partido sin terminar: empate, 1 punto para cada pareja</li>
          </ul>
          <p>A igualdad de puntos, desempatan los partidos ganados y luego la diferencia de sets.</p>
        </div>

        {previous.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-lg font-semibold">📚 Ligas anteriores</h2>
            <ul className="flex flex-col gap-2">
              {previous.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/clasificacion/liga/${l.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 hover:border-lime-400 hover:bg-lime-50 dark:border-gray-800 dark:hover:bg-neutral-900"
                  >
                    <span>
                      <span className="block font-semibold">{l.name}</span>
                      <span className="block text-xs opacity-60">
                        Del {formatDate(l.started_at)} al {formatDate(l.ended_at!)}
                      </span>
                    </span>
                    <span aria-hidden className="opacity-50">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile.is_organizer && current && (
          <section className="mt-8 flex flex-col gap-4">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h2 className="mb-2 font-semibold">Organizador · Nombre de la liga en curso</h2>
              <form action={renameLeague} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={current.id} />
                <input name="name" required defaultValue={current.name} className={input} />
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                  Guardar
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-red-200 p-4 dark:border-red-900">
              <h2 className="mb-1 font-semibold text-red-700 dark:text-red-400">
                Organizador · Reiniciar la liga
              </h2>
              <p className="mb-3 text-sm opacity-70">
                Termina «{current.name}» (su clasificación y resultados quedan en Ligas anteriores) y
                empieza una liga nueva desde cero. Las parejas, los jugadores y la disponibilidad se
                mantienen.
              </p>
              <form action={startNewLeague} className="flex flex-col gap-2">
                <input name="name" required maxLength={60} placeholder="Nombre de la nueva liga" className={input} />
                <div className="flex flex-wrap gap-2">
                  <input name="confirm" required autoComplete="off" placeholder="Escribe REINICIAR" className={input} />
                  <ConfirmButton
                    message={`Se cerrará «${current.name}» y empezará la nueva liga desde cero. ¿Seguro?`}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Empezar liga nueva
                  </ConfirmButton>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
