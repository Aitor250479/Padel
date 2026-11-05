import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { loadPairDirectory } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { computeStandings, type ResultRow } from "@/lib/standings";
import { resetLeague } from "./actions";

export default async function ClasificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { ok, error } = await searchParams;
  const [{ pairs, pairName }, { data: matches }] = await Promise.all([
    loadPairDirectory(supabase),
    supabase
      .from("matches")
      .select("pair_a, pair_b, sets_a, sets_b, status")
      .returns<ResultRow[]>(),
  ]);

  const rows = computeStandings(
    pairs.map((p) => p.id),
    matches ?? [],
  );

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Clasificación</h1>
        <Notice ok={ok} error={error} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left dark:border-gray-700">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Pareja</th>
                <th className="px-1 text-center" title="Partidos jugados">PJ</th>
                <th className="px-1 text-center" title="Ganados">G</th>
                <th className="px-1 text-center" title="Empatados">E</th>
                <th className="px-1 text-center" title="Perdidos">P</th>
                <th className="px-1 text-center" title="Sets a favor y en contra">Sets</th>
                <th className="pl-1 text-center font-bold" title="Puntos">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.pairId}
                  className={[
                    "border-b border-gray-100 dark:border-gray-900",
                    r.pairId === profile.pair_id ? "bg-emerald-50 dark:bg-emerald-950" : "",
                  ].join(" ")}
                >
                  <td className="py-2 pr-2 opacity-60">{i + 1}</td>
                  <td className="py-2 pr-2 font-medium">{pairName(r.pairId)}</td>
                  <td className="px-1 text-center">{r.played}</td>
                  <td className="px-1 text-center">{r.won}</td>
                  <td className="px-1 text-center">{r.drawn}</td>
                  <td className="px-1 text-center">{r.lost}</td>
                  <td className="px-1 text-center opacity-70">
                    {r.setsFor}-{r.setsAgainst}
                  </td>
                  <td className="pl-1 text-center font-bold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

        {profile.is_organizer && (
          <section className="mt-8 rounded-xl border border-red-200 p-4 dark:border-red-900">
            <h2 className="mb-1 font-semibold text-red-700 dark:text-red-400">
              Organizador · Reiniciar la liga
            </h2>
            <p className="mb-3 text-sm opacity-70">
              Borra todos los partidos y resultados para empezar de cero. Las parejas, los jugadores
              y la disponibilidad se mantienen. No se puede deshacer.
            </p>
            <form action={resetLeague} className="flex flex-wrap gap-2">
              <input
                name="confirm"
                required
                autoComplete="off"
                placeholder="Escribe REINICIAR"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-black"
              />
              <ConfirmButton
                message="Se borrarán TODOS los partidos y resultados de la liga. ¿Seguro que quieres reiniciarla?"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Reiniciar liga
              </ConfirmButton>
            </form>
          </section>
        )}
      </main>
    </>
  );
}
