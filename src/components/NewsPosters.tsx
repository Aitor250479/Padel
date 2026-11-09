import Image from "next/image";
import { parseSets } from "@/components/Scoreboard";
import { breakingFontSize, fitFontSize } from "@/lib/news";

const name = "absolute -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap font-black uppercase italic leading-tight";

// Cuatro modelos de cartel de enfrentamiento; cada partido del carrusel usa
// uno distinto y se repiten a partir del quinto. Casillas en porcentaje.
const MATCHUP_TEMPLATES = [
  { src: "/enfrentamiento1.png", aspect: "744 / 463", rows: [73.6, 87.4] },
  { src: "/enfrentamiento2.png", aspect: "744 / 463", rows: [73.7, 87.5] },
  { src: "/enfrentamiento3.png", aspect: "744 / 465", rows: [75.3, 89.1] },
  { src: "/enfrentamiento4.png", aspect: "744 / 465", rows: [76.0, 89.6] },
];
const MATCHUP_LEFT = [6.5, 61.2];
const MATCHUP_WIDTH = 32;

/** Cartel "Próximo enfrentamiento" con los dos jugadores de cada lado. */
export function MatchupPoster({
  a,
  b,
  caption,
  variant = 0,
}: {
  a: string[];
  b: string[];
  caption: string[];
  variant?: number;
}) {
  const t = MATCHUP_TEMPLATES[variant % MATCHUP_TEMPLATES.length];
  return (
    <figure className="w-full">
      <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: t.aspect }}>
        <Image src={t.src} alt="Próximo enfrentamiento" fill sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
        {[a, b].map((players, side) =>
          t.rows.map((top, r) => {
            const text = players[r] ?? "";
            return (
              <span
                key={`${side}-${r}`}
                className={name}
                style={{
                  left: `${MATCHUP_LEFT[side]}%`,
                  width: `${MATCHUP_WIDTH}%`,
                  top: `${top}%`,
                  fontSize: `${fitFontSize(text, MATCHUP_WIDTH, 3.6, 2.2)}cqw`,
                }}
              >
                {text}
              </span>
            );
          }),
        )}
      </div>
      {caption.map((line) => (
        <figcaption key={line} className="mt-1 text-center text-sm">
          {line}
        </figcaption>
      ))}
    </figure>
  );
}

// Cuatro modelos de cartel de resultado (sin las rayas de escribir) con la misma maqueta; cada partido del
// carrusel usa uno distinto y se repiten a partir del quinto. Casillas en porcentaje.
const RESULT_TEMPLATES = ["/resultado1.png", "/resultado2.png", "/resultado3.png", "/resultado4.png"];
const RESULT_NAME_TOP = [72.6, 86.4];
const RESULT_SUB_TOP = [78.2, 92.0];
const RESULT_SET_LEFT = [65.2, 77.5, 90.0];
const RESULT_SET_TOP = [76.6, 89.2];
const RESULT_LEFT = 13.5;
const RESULT_WIDTH = 43;

type ResultSide = { name: string; players: string; sets: number };

/** Cartel "Resultado del partido" con los juegos de cada set. */
export function ResultPoster({
  a,
  b,
  detail,
  variant = 0,
}: {
  a: ResultSide;
  b: ResultSide;
  detail: string | null;
  variant?: number;
}) {
  const src = RESULT_TEMPLATES[variant % RESULT_TEMPLATES.length];
  const games = parseSets(detail);
  const rows = [a, b];
  return (
    <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: "869 / 443" }}>
      <Image src={src} alt="Resultado del partido" fill sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
      {rows.map((side, r) => {
        const other = rows[1 - r];
        const won = side.sets > other.sets;
        const title = `${won ? "🏆 " : ""}${side.name}`;
        // Sin juegos apuntados: el resultado en sets debajo del nombre.
        const score = games.length
          ? ""
          : side.sets === other.sets
            ? `empate ${side.sets}-${other.sets}`
            : `${won ? "ganan" : "pierden"} ${side.sets}-${other.sets}`;
        const sub = [score, side.players].filter(Boolean).join(" · ");
        return (
          <div key={r}>
            <span
              className={`${name} ${won ? "text-red-600" : "text-black"}`}
              style={{
                left: `${RESULT_LEFT}%`,
                width: `${RESULT_WIDTH}%`,
                top: `${RESULT_NAME_TOP[r]}%`,
                fontSize: `${fitFontSize(title, RESULT_WIDTH, 3.3)}cqw`,
              }}
            >
              {title}
            </span>
            {sub && (
              <span
                className="absolute -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-tight text-black/75"
                style={{
                  left: `${RESULT_LEFT}%`,
                  width: `${RESULT_WIDTH}%`,
                  top: `${RESULT_SUB_TOP[r]}%`,
                  fontSize: `${Math.max(1.7, Math.min(2.3, RESULT_WIDTH / ([...sub].length * 0.58)))}cqw`,
                }}
              >
                {sub}
              </span>
            )}
            {RESULT_SET_LEFT.map((left, s) => {
              const g = games[s];
              if (!g) return null;
              return (
                <span
                  key={s}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-black tabular-nums ${g[r] > g[1 - r] ? "text-red-600" : "text-black"}`}
                  style={{ left: `${left}%`, top: `${RESULT_SET_TOP[r]}%`, fontSize: "5.5cqw" }}
                >
                  {g[r]}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Noticia escrita por un organizador, en el cartel "Breaking news". */
export function BreakingNews({ text }: { text: string }) {
  return (
    <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: "1774 / 887" }}>
      <Image src="/breaking.png" alt="Breaking news" fill sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
      <p
        className="absolute flex items-center break-words font-extrabold leading-tight text-black"
        style={{ left: "29%", right: "4%", top: "33%", bottom: "13%", fontSize: `${breakingFontSize(text)}cqw` }}
      >
        <span className="w-full">{text}</span>
      </p>
    </div>
  );
}
