import Link from "next/link";
import type { Standing } from "@/lib/standings";

type Row = Omit<Standing, "pairId"> & { id: string; note?: string };

/** Tabla de clasificación, de parejas o de jugadores. */
export default function StandingsTable({
  rows,
  nameOf,
  hrefFor,
  highlight,
  label = "Pareja",
}: {
  rows: Row[];
  nameOf: (id: string) => string;
  hrefFor?: (id: string) => string;
  highlight?: string | null;
  label?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left dark:border-gray-700">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">{label}</th>
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
              key={r.id}
              className={[
                "border-b border-gray-100 dark:border-gray-900",
                r.id === highlight ? "bg-emerald-50 dark:bg-emerald-950" : "",
              ].join(" ")}
            >
              <td className="py-2 pr-2 opacity-60">{i + 1}</td>
              <td className="py-2 pr-2 font-medium">
                {hrefFor ? (
                  <Link href={hrefFor(r.id)} className="underline decoration-lime-400 decoration-2 underline-offset-2">
                    {nameOf(r.id)}
                  </Link>
                ) : (
                  nameOf(r.id)
                )}
                {r.note && <span className="ml-1 text-xs font-normal opacity-60">{r.note}</span>}
              </td>
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
  );
}
