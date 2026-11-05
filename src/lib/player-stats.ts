/** Estadísticas de un jugador a partir de los partidos confirmados en los que jugó. */

export type StatMatch = {
  id: string;
  league_id: string | null;
  week_start: string;
  pair_a: string;
  pair_b: string;
  sets_a: number;
  sets_b: number;
  score_detail: string | null;
};

export type StatPlayer = { match_id: string; profile_id: string; pair_id: string };

export type Record = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
};

const empty = (): Record => ({ played: 0, won: 0, drawn: 0, lost: 0, setsFor: 0, setsAgainst: 0, points: 0 });

function add(r: Record, mine: number, theirs: number) {
  r.played++;
  r.setsFor += mine;
  r.setsAgainst += theirs;
  r.points += mine + (mine === 2 && theirs === 0 ? 1 : 0);
  if (mine > theirs) r.won++;
  else if (mine < theirs) r.lost++;
  else r.drawn++;
}

function games(detail: string | null): [number, number][] {
  if (!detail) return [];
  return [...detail.matchAll(/(\d{1,2})\s*[-–/]\s*(\d{1,2})/g)].slice(0, 3).map((m) => [Number(m[1]), Number(m[2])]);
}

export function playerStats(playerId: string, matches: StatMatch[], players: StatPlayer[]) {
  const total = empty();
  const byLeague = new Map<string, Record & { pairs: Set<string> }>();
  const byPartner = new Map<string, Record>();
  const byRival = new Map<string, Record>();
  let gamesFor = 0;
  let gamesAgainst = 0;
  let matchesWithGames = 0;
  let setsWon = 0;
  let setsPlayedDetail = 0;
  let cleanWins = 0;
  let cleanLosses = 0;
  let bestWinStreak = 0;
  let run = 0;
  const results: ("G" | "E" | "P")[] = [];

  const sorted = [...matches].sort((a, b) => a.week_start.localeCompare(b.week_start));
  for (const m of sorted) {
    const inMatch = players.filter((p) => p.match_id === m.id);
    const me = inMatch.find((p) => p.profile_id === playerId);
    if (!me) continue;
    const isA = me.pair_id === m.pair_a;
    const mine = isA ? m.sets_a : m.sets_b;
    const theirs = isA ? m.sets_b : m.sets_a;

    add(total, mine, theirs);
    const lg = m.league_id ?? "sin-liga";
    if (!byLeague.has(lg)) byLeague.set(lg, { ...empty(), pairs: new Set() });
    const l = byLeague.get(lg)!;
    add(l, mine, theirs);
    l.pairs.add(me.pair_id);

    for (const p of inMatch) {
      if (p.profile_id === playerId) continue;
      const map = p.pair_id === me.pair_id ? byPartner : byRival;
      if (!map.has(p.profile_id)) map.set(p.profile_id, empty());
      add(map.get(p.profile_id)!, mine, theirs);
    }

    const g = games(m.score_detail);
    if (g.length) {
      matchesWithGames++;
      for (const [a, b] of g) {
        gamesFor += isA ? a : b;
        gamesAgainst += isA ? b : a;
        setsPlayedDetail++;
        if ((isA ? a : b) > (isA ? b : a)) setsWon++;
      }
    }
    if (mine === 2 && theirs === 0) cleanWins++;
    if (mine === 0 && theirs === 2) cleanLosses++;

    const res = mine > theirs ? "G" : mine < theirs ? "P" : "E";
    results.push(res);
    run = res === "G" ? run + 1 : 0;
    bestWinStreak = Math.max(bestWinStreak, run);
  }

  // Racha actual: resultados iguales seguidos desde el último partido.
  let streak = 0;
  const last = results[results.length - 1];
  for (let i = results.length - 1; i >= 0 && results[i] === last; i--) streak++;

  const ranked = (map: Map<string, Record>) =>
    [...map.entries()]
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => b.played - a.played || b.points - a.points);

  return {
    total,
    leagues: byLeague.size,
    byLeague: [...byLeague.entries()].map(([id, r]) => ({ id, ...r, pairs: [...r.pairs] })),
    partners: ranked(byPartner),
    rivals: ranked(byRival),
    gamesFor,
    gamesAgainst,
    matchesWithGames,
    setsPlayedDetail,
    setsWon,
    cleanWins,
    cleanLosses,
    bestWinStreak,
    streak: last ? { type: last, count: streak } : null,
    form: results.slice(-5),
  };
}

export type PlayerStats = ReturnType<typeof playerStats>;

export function winRate(r: Pick<Record, "played" | "won">) {
  return r.played ? Math.round((r.won / r.played) * 100) : 0;
}
