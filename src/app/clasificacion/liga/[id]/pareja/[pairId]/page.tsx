import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Scoreboard from "@/components/Scoreboard";
import { LEAGUE_COLUMNS, type League } from "@/lib/leagues";
import { MATCH_COLUMNS, loadPairDirectory, type Match } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { formatWeekLong } from "@/lib/weeks";

export default async function PairMatchesPage({
  params,
}: {
  params: Promise<{ id: string; pairId: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { id, pairId } = await params;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID.test(id) || !UUID.test(pairId)) notFound();
  const [{ data: league }, { pairName, playersOf }, { data: matches }] = await Promise.all([
    supabase.from("leagues").select(LEAGUE_COLUMNS).eq("id", id).maybeSingle<League>(),
    loadPairDirectory(supabase),
    supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .eq("league_id", id)
      .or(`pair_a.eq.${pairId},pair_b.eq.${pairId}`)
      .neq("status", "cancelado")
      .order("week_start", { ascending: false })
      .returns<Match[]>(),
  ]);
  if (!league) notFound();
  const list = matches ?? [];
  const played = list.filter((m) => m.sets_a !== null && m.sets_b !== null);
  const pending = list.filter((m) => m.sets_a === null);

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href={league.ended_at ? `/clasificacion/liga/${league.id}` : "/clasificacion"}
          className="text-sm underline opacity-70"
        >
          ← {league.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{pairName(pairId)}</h1>
        <p className="mb-6 text-sm opacity-70">
          {playersOf(pairId) || "Sin jugadores"} · {played.length}{" "}
          {played.length === 1 ? "partido jugado" : "partidos jugados"} en {league.name}
        </p>

        {played.length ? (
          <div className="flex flex-col gap-6">
            {played.map((m) => (
              <Scoreboard
                key={m.id}
                caption={`Semana del ${formatWeekLong(m.week_start)}`}
                detail={m.score_detail}
                a={{ name: pairName(m.pair_a), players: playersOf(m.pair_a), sets: m.sets_a! }}
                b={{ name: pairName(m.pair_b), players: playersOf(m.pair_b), sets: m.sets_b! }}
              />
            ))}
          </div>
        ) : (
          <p className="opacity-70">Todavía no tiene resultados en esta liga.</p>
        )}

        {pending.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 font-semibold">Sin resultado</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {pending.map((m) => (
                <li key={m.id}>
                  <Link href={`/partidos/${m.id}`} className="underline">
                    {pairName(m.pair_a)} vs {pairName(m.pair_b)}
                  </Link>{" "}
                  <span className="opacity-60">· semana del {formatWeekLong(m.week_start)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
