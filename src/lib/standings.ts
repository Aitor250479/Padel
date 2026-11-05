export type ResultRow = {
  pair_a: string;
  pair_b: string;
  sets_a: number | null;
  sets_b: number | null;
  status: string;
};

export type Standing = {
  pairId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
};

/**
 * Clasificación: 1 punto por set ganado y 1 extra por ganar sin ceder set (2-0 = 3).
 * Orden: puntos, ganados, diferencia de sets.
 */
export function computeStandings(pairIds: string[], matches: ResultRow[]): Standing[] {
  const table = new Map<string, Standing>(
    pairIds.map((id) => [
      id,
      { pairId: id, played: 0, won: 0, drawn: 0, lost: 0, setsFor: 0, setsAgainst: 0, points: 0 },
    ]),
  );

  for (const m of matches) {
    if (m.status === "cancelado" || m.sets_a === null || m.sets_b === null) continue;
    const sides: [string, number, number][] = [
      [m.pair_a, m.sets_a, m.sets_b],
      [m.pair_b, m.sets_b, m.sets_a],
    ];
    for (const [id, mine, theirs] of sides) {
      const row = table.get(id);
      if (!row) continue;
      row.played++;
      row.setsFor += mine;
      row.setsAgainst += theirs;
      row.points += mine + (mine === 2 && theirs === 0 ? 1 : 0);
      if (mine > theirs) row.won++;
      else if (mine < theirs) row.lost++;
      else row.drawn++;
    }
  }

  return [...table.values()].sort(
    (x, y) =>
      y.points - x.points ||
      y.won - x.won ||
      y.setsFor - y.setsAgainst - (x.setsFor - x.setsAgainst),
  );
}

export const RESULT_OPTIONS: { value: string; a: number; b: number }[] = [
  { value: "2-0", a: 2, b: 0 },
  { value: "2-1", a: 2, b: 1 },
  { value: "1-1", a: 1, b: 1 },
  { value: "1-2", a: 1, b: 2 },
  { value: "0-2", a: 0, b: 2 },
];
