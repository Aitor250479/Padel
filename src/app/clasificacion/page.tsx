import Header from "@/components/Header";
import { loadPairDirectory } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { computeStandings, type ResultRow } from "@/lib/standings";

export default async function ClasificacionPage() {
  const { supabase, profile } = await requireProfile();
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
        <p className="mt-4 text-xs opacity-70">
          1 punto por cada set ganado: ganar 2-0 da 3 puntos, ganar 2-1 da 2, perder 1-2 da 1 y
          perder 0-2 da 0. Un partido sin terminar cuenta como empate (1 punto cada pareja). A
          igualdad de puntos, desempatan los partidos ganados y luego la diferencia de sets.
        </p>
      </main>
    </>
  );
}
