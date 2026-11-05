import Image from "next/image";

/** Juegos de cada set desde "6-4 3-6 7-5" (o vacío si no se apuntaron). */
export function parseSets(detail: string | null): [number, number][] {
  if (!detail) return [];
  return [...detail.matchAll(/(\d{1,2})\s*[-–/]\s*(\d{1,2})/g)]
    .slice(0, 3)
    .map((m) => [Number(m[1]), Number(m[2])]);
}

// Posiciones sobre marcador.png (1774x887), en porcentaje.
const ROW_TOP = [46.2, 75.3];
const SET_LEFT = [45.9, 60.7, 75.3];
const RESULT_LEFT = 90.8;

type Side = { name: string; players: string; sets: number };

export default function Scoreboard({
  a,
  b,
  detail,
  caption,
}: {
  a: Side;
  b: Side;
  detail: string | null;
  caption?: string;
}) {
  const games = parseSets(detail);
  const rows = [a, b];
  const tie = a.sets === b.sets;

  return (
    <figure className="w-full">
      {caption && <figcaption className="mb-1 text-center text-xs font-semibold opacity-60">{caption}</figcaption>}
      <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: "1774 / 887" }}>
        <Image src="/marcador.png" alt="" fill sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
        {rows.map((side, r) => {
          const won = side.sets > rows[1 - r].sets;
          return (
            <div key={r}>
              <div
                className="absolute flex -translate-y-1/2 flex-col justify-center leading-tight"
                style={{ left: "4.5%", width: "33%", top: `${ROW_TOP[r]}%` }}
              >
                <span
                  className="line-clamp-2 font-black uppercase italic break-words"
                  style={{ fontSize: "3.6cqw", lineHeight: 1.05 }}
                >
                  {side.name}
                </span>
                <span className="truncate font-semibold opacity-70" style={{ fontSize: "2.4cqw" }}>
                  {side.players}
                  {games.length === 0 && ` · ${side.sets} ${side.sets === 1 ? "set" : "sets"}`}
                </span>
              </div>
              {SET_LEFT.map((left, s) => {
                const g = games[s];
                const value = g ? g[r] : "";
                const wonSet = g ? g[r] > g[1 - r] : false;
                return (
                  <span
                    key={s}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 font-black tabular-nums ${wonSet ? "text-red-600" : ""}`}
                    style={{ left: `${left}%`, top: `${ROW_TOP[r]}%`, fontSize: "7cqw" }}
                  >
                    {value}
                  </span>
                );
              })}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${RESULT_LEFT}%`, top: `${ROW_TOP[r]}%`, width: "12%", aspectRatio: "1" }}
              >
                {tie ? (
                  <span
                    className="grid h-full w-full place-items-center font-black"
                    style={{ fontSize: "5cqw" }}
                    title="Empate"
                  >
                    🤝
                  </span>
                ) : (
                  <Image
                    src={won ? "/ganador.png" : "/perdedor.png"}
                    alt={won ? "Ganador" : "Perdedor"}
                    fill
                    sizes="90px"
                    className="object-contain"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
