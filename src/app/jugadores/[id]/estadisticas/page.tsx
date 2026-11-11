import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { LEAGUE_COLUMNS, type League } from "@/lib/leagues";
import { playerStats, winRate, type Record, type StatMatch, type StatPlayer } from "@/lib/player-stats";
import { leaguePairName } from "@/lib/matches";
import { displayName, requireProfile, type Pair, type Profile } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-neutral-950 p-3 text-center text-white">
      <p className="text-2xl font-black text-lime-400">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      {sub && <p className="text-[11px] opacity-60">{sub}</p>}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 text-sm dark:border-gray-900">
      <span className="opacity-70">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function RecordTable({ rows, first }: { rows: (Record & { key: string; name: React.ReactNode })[]; first: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left dark:border-gray-700">
            <th className="py-2 pr-2">{first}</th>
            <th className="px-1 text-center" title="Partidos jugados">PJ</th>
            <th className="px-1 text-center" title="Ganados">G</th>
            <th className="px-1 text-center" title="Empatados">E</th>
            <th className="px-1 text-center" title="Perdidos">P</th>
            <th className="px-1 text-center" title="Sets a favor y en contra">Sets</th>
            <th className="px-1 text-center" title="Puntos">Pts</th>
            <th className="pl-1 text-center" title="Porcentaje de victorias">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-gray-100 dark:border-gray-900">
              <td className="py-2 pr-2 font-medium">{r.name}</td>
              <td className="px-1 text-center">{r.played}</td>
              <td className="px-1 text-center">{r.won}</td>
              <td className="px-1 text-center">{r.drawn}</td>
              <td className="px-1 text-center">{r.lost}</td>
              <td className="px-1 text-center opacity-70">
                {r.setsFor}-{r.setsAgainst}
              </td>
              <td className="px-1 text-center font-bold">{r.points}</td>
              <td className="pl-1 text-center opacity-70">{winRate(r)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FORM_STYLE = { G: "bg-emerald-600", E: "bg-gray-400", P: "bg-red-600" } as const;
const STREAK_TEXT = { G: "victorias", E: "empates", P: "derrotas" } as const;

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, profile } = await requireProfile();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [{ data: player }, { data: mine }, { data: people }, { data: pairs }, { data: leagues }] =
    await Promise.all([
      supabase.from("profiles").select("id, email, full_name, is_organizer, pair_id").eq("id", id).maybeSingle<Profile>(),
      supabase.from("match_players").select("match_id").eq("profile_id", id).returns<{ match_id: string }[]>(),
      supabase.from("profiles").select("id, email, full_name, is_organizer, pair_id").returns<Profile[]>(),
      supabase.from("pairs").select("id, name, league_id, player_1, player_2").returns<Pair[]>(),
      supabase.from("leagues").select(LEAGUE_COLUMNS).returns<League[]>(),
    ]);
  if (!player) notFound();

  const ids = (mine ?? []).map((r) => r.match_id);
  const [{ data: matches }, { data: players }] = ids.length
    ? await Promise.all([
        supabase
          .from("matches")
          .select("id, league_id, week_start, pair_a, pair_b, sets_a, sets_b, score_detail")
          .in("id", ids)
          .not("sets_a", "is", null)
          .neq("status", "cancelado")
          .returns<StatMatch[]>(),
        supabase.from("match_players").select("match_id, profile_id, pair_id").in("match_id", ids).returns<StatPlayer[]>(),
      ])
    : [{ data: [] as StatMatch[] }, { data: [] as StatPlayer[] }];

  const s = playerStats(id, matches ?? [], players ?? []);
  const nameOf = (pid: string) => {
    const p = (people ?? []).find((x) => x.id === pid);
    return p ? displayName(p) : "Jugador borrado";
  };
  const pairName = (pid: string) => {
    const pair = (pairs ?? []).find((p) => p.id === pid);
    if (!pair) return "Pareja borrada";
    return leaguePairName(pair, (x) => {
      const p = (people ?? []).find((y) => y.id === x);
      return p ? displayName(p) : null;
    });
  };
  const leagueName = (lid: string) => (leagues ?? []).find((l) => l.id === lid)?.name ?? "Sin liga";
  const leagueStart = (lid: string) => (leagues ?? []).find((l) => l.id === lid)?.started_at ?? "";
  const playerLink = (pid: string) => (
    <Link href={`/jugadores/${pid}/estadisticas`} className="underline decoration-lime-400 decoration-2 underline-offset-2">
      {nameOf(pid)}
    </Link>
  );

  const t = s.total;
  const nemesis = [...s.rivals].filter((r) => r.lost > 0).sort((a, b) => b.lost - a.lost || b.played - a.played)[0];
  const victim = [...s.rivals].filter((r) => r.won > 0).sort((a, b) => b.won - a.won || b.played - a.played)[0];
  const bestPartner = [...s.partners].sort(
    (a, b) => b.points / b.played - a.points / a.played || b.played - a.played,
  )[0];
  const isMe = player.id === profile.id;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link href={isMe ? "/perfil" : "/clasificacion"} className="text-sm underline opacity-70">
          ← {isMe ? "Mi perfil" : "Clasificación"}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">📊 {displayName(player)}</h1>
        <p className="mb-4 text-sm opacity-70">
          Estadísticas de juego de todas las ligas
          {player.pair_id && ` · ahora en ${pairName(player.pair_id)}`}
        </p>

        {t.played === 0 ? (
          <p className="rounded-xl bg-neutral-50 p-5 text-center dark:bg-neutral-900">
            Todavía no tiene partidos con resultado confirmado. ¡Las estadísticas llegarán con el
            primer partido! 🎾
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label="Ligas" value={s.leagues} />
              <Tile label="Partidos" value={t.played} />
              <Tile label="Victorias" value={`${winRate(t)}%`} sub={`${t.won} de ${t.played}`} />
              <Tile label="Puntos" value={t.points} sub={`${(t.points / t.played).toFixed(1)} por partido`} />
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">Resultados</h2>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-900">
                  <p className="text-2xl font-black">{t.won}</p>
                  <p className="text-xs font-semibold uppercase">Ganados</p>
                </div>
                <div className="rounded-xl bg-gray-100 p-3 text-gray-900">
                  <p className="text-2xl font-black">{t.drawn}</p>
                  <p className="text-xs font-semibold uppercase">Empatados</p>
                </div>
                <div className="rounded-xl bg-red-100 p-3 text-red-900">
                  <p className="text-2xl font-black">{t.lost}</p>
                  <p className="text-xs font-semibold uppercase">Perdidos</p>
                </div>
              </div>
              <Fact label="Sets a favor / en contra" value={`${t.setsFor} / ${t.setsAgainst} (${t.setsFor - t.setsAgainst >= 0 ? "+" : ""}${t.setsFor - t.setsAgainst})`} />
              {s.matchesWithGames > 0 && (
                <Fact
                  label={`Juegos a favor / en contra (en ${s.matchesWithGames} ${s.matchesWithGames === 1 ? "partido" : "partidos"} con juegos apuntados)`}
                  value={`${s.gamesFor} / ${s.gamesAgainst}`}
                />
              )}
              <Fact label="Victorias por 2-0 (sin ceder set)" value={s.cleanWins} />
              <Fact label="Derrotas por 0-2" value={s.cleanLosses} />
              <Fact label="Mejor racha de victorias" value={s.bestWinStreak} />
              {s.streak && (
                <Fact label="Racha actual" value={`${s.streak.count} ${STREAK_TEXT[s.streak.type]} seguid${s.streak.type === "P" ? "as" : "os"}`} />
              )}
              <Fact
                label="Últimos partidos"
                value={
                  <span className="flex justify-end gap-1">
                    {s.form.map((r, i) => (
                      <span key={i} className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold text-white ${FORM_STYLE[r]}`}>
                        {r}
                      </span>
                    ))}
                  </span>
                }
              />
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">Por liga</h2>
              <RecordTable
                first="Liga"
                rows={[...s.byLeague]
                  .sort((a, b) => leagueStart(b.id).localeCompare(leagueStart(a.id)))
                  .map((l) => ({
                    ...l,
                    key: l.id,
                    name: (
                      <>
                        {leagueName(l.id)}
                        <span className="block text-xs font-normal opacity-60">{l.pairs.map(pairName).join(", ")}</span>
                      </>
                    ),
                  }))}
              />
            </section>

            <section>
              <h2 className="mb-1 text-lg font-semibold">Con cada compañero</h2>
              <p className="mb-2 text-sm opacity-70">
                Ha jugado con {s.partners.length} {s.partners.length === 1 ? "compañero" : "compañeros distintos"}.
                {bestPartner && s.partners.length > 1 && <> Mejor pareja: <b>{nameOf(bestPartner.id)}</b> ({(bestPartner.points / bestPartner.played).toFixed(1)} puntos por partido).</>}
              </p>
              <RecordTable first="Compañero" rows={s.partners.map((r) => ({ ...r, key: r.id, name: playerLink(r.id) }))} />
            </section>

            <section>
              <h2 className="mb-2 text-lg font-semibold">Contra cada rival</h2>
              {(nemesis || victim) && (
                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                  {victim && (
                    <p className="rounded-xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950">
                      😎 <b>Víctima favorita:</b> {nameOf(victim.id)} ({victim.won} {victim.won === 1 ? "victoria" : "victorias"})
                    </p>
                  )}
                  {nemesis && (
                    <p className="rounded-xl bg-red-50 p-3 text-sm dark:bg-red-950">
                      😱 <b>Bestia negra:</b> {nameOf(nemesis.id)} ({nemesis.lost} {nemesis.lost === 1 ? "derrota" : "derrotas"})
                    </p>
                  )}
                </div>
              )}
              <RecordTable first="Rival" rows={s.rivals.map((r) => ({ ...r, key: r.id, name: playerLink(r.id) }))} />
            </section>
          </div>
        )}
      </main>
    </>
  );
}
