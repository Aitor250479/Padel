import Image from "next/image";
import { parseSets } from "@/components/Scoreboard";
import { breakingFontSize, breakingSize, fitFontSize } from "@/lib/news";

// Esquinas redondeadas, iguales en los carteles de enfrentamiento y de resultado.
const posterCorners = "overflow-hidden rounded-xl";

const name =
  "absolute -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap font-black uppercase italic leading-tight";

// Cuatro modelos de cartel de enfrentamiento con la misma maqueta (1672x941); cada
// partido del carrusel usa uno distinto y se repiten a partir del quinto.
const MATCHUP_TEMPLATES = [
  "/enfrentamiento1.png",
  "/enfrentamiento2.png",
  "/enfrentamiento3.png",
  "/enfrentamiento4.png",
];
// Casillas de los nombres, en porcentaje.
const MATCHUP_ROWS = [76.8, 90.2];
const MATCHUP_LEFT = [12.5, 60];
const MATCHUP_WIDTH = 28.5;

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
  const src = MATCHUP_TEMPLATES[variant % MATCHUP_TEMPLATES.length];
  return (
    <figure className="w-full">
      <div
        className={`relative w-full [container-type:inline-size] ${posterCorners}`}
        style={{ aspectRatio: "1672 / 941" }}
      >
        <Image
          src={src}
          alt="Próximo enfrentamiento"
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-contain"
        />
        {[a, b].map((players, side) =>
          MATCHUP_ROWS.map((top, r) => {
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

// Ocho modelos de cartel de resultado (sin las rayas de escribir); cada partido del
// carrusel usa uno distinto y se repiten a partir del noveno. Por modelo, en
// porcentaje del cartel: zona del nombre (x), filas de cada pareja (y) y casillas
// de los sets (x).
type ResultTemplate = {
  src: string;
  w: number;
  h: number;
  name: [number, number];
  rows: [number, number][];
  sets: [number, number][];
};
const PRESS: Omit<ResultTemplate, "src" | "w" | "h" | "rows"> = {
  name: [13.8, 45.8],
  sets: [
    [46.2, 58.8],
    [59.2, 71.9],
    [72.4, 86.1],
  ],
};
const SHIRTS: Omit<ResultTemplate, "src" | "w" | "h" | "rows"> = {
  name: [19.5, 57],
  sets: [
    [58.4, 69.2],
    [70.5, 81.2],
    [82.6, 93.6],
  ],
};
const RESULT_TEMPLATES: ResultTemplate[] = [
  {
    src: "/resultado1.png",
    w: 861,
    h: 432,
    ...PRESS,
    rows: [
      [68.1, 81.0],
      [82.2, 94.8],
    ],
  },
  {
    src: "/resultado2.png",
    w: 861,
    h: 433,
    name: [35.4, 60.6],
    rows: [
      [30.9, 44.3],
      [45.3, 58.9],
    ],
    sets: [
      [61.1, 70.3],
      [70.7, 79.9],
      [80.4, 90.2],
    ],
  },
  {
    src: "/resultado3.png",
    w: 861,
    h: 433,
    ...PRESS,
    rows: [
      [69.5, 82.7],
      [83.6, 96.3],
    ],
  },
  {
    src: "/resultado4.png",
    w: 861,
    h: 432,
    ...PRESS,
    rows: [
      [69.4, 82.6],
      [83.6, 96.3],
    ],
  },
  {
    src: "/resultado5.png",
    w: 831,
    h: 464,
    ...SHIRTS,
    rows: [
      [69.0, 80.2],
      [83.8, 95.0],
    ],
  },
  {
    src: "/resultado6.png",
    w: 830,
    h: 464,
    ...SHIRTS,
    rows: [
      [69.0, 80.2],
      [83.8, 95.0],
    ],
  },
  {
    src: "/resultado7.png",
    w: 831,
    h: 465,
    ...SHIRTS,
    rows: [
      [70.5, 81.1],
      [84.5, 95.3],
    ],
  },
  {
    src: "/resultado8.png",
    w: 830,
    h: 465,
    ...SHIRTS,
    rows: [
      [70.5, 81.1],
      [84.5, 95.3],
    ],
  },
];

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
  const t = RESULT_TEMPLATES[variant % RESULT_TEMPLATES.length];
  const games = parseSets(detail);
  const rows = [a, b];
  const left = t.name[0] + 1.5;
  const width = t.name[1] - left - 1;
  return (
    <div
      className={`relative w-full [container-type:inline-size] ${posterCorners}`}
      style={{ aspectRatio: `${t.w} / ${t.h}` }}
    >
      <Image
        src={t.src}
        alt="Resultado del partido"
        fill
        sizes="(max-width: 768px) 100vw, 720px"
        className="object-contain"
      />
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
        const [y0, y1] = t.rows[r];
        // Alto de la fila en cqw (porcentaje del ancho del cartel).
        const rowCqw = ((y1 - y0) * t.h) / t.w;
        return (
          <div key={r}>
            <span
              className={`${name} ${won ? "text-red-600" : "text-black"}`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: `${y0 + (y1 - y0) * 0.33}%`,
                fontSize: `${fitFontSize(title, width, Math.min(3.3, rowCqw * 0.42))}cqw`,
              }}
            >
              {title}
            </span>
            {sub && (
              <span
                className="absolute -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-tight text-black/75"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: `${y0 + (y1 - y0) * 0.75}%`,
                  fontSize: `${Math.max(1.6, Math.min(2.3, width / ([...sub].length * 0.58)))}cqw`,
                }}
              >
                {sub}
              </span>
            )}
            {t.sets.map(([x0, x1], s) => {
              const g = games[s];
              if (!g) return null;
              return (
                <span
                  key={s}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 font-black tabular-nums ${g[r] > g[1 - r] ? "text-red-600" : "text-black"}`}
                  style={{
                    left: `${(x0 + x1) / 2}%`,
                    top: `${(y0 + y1) / 2}%`,
                    fontSize: `${Math.min(rowCqw * 0.7, (x1 - x0) * 0.6)}cqw`,
                  }}
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

// Ocho carteles de "Breaking news": dos por tamaño (hasta 75, 150, 300 y 600
// caracteres). Caja del texto en porcentaje del cartel: x0, x1, y0, y1.
type BreakingTemplate = { src: string; w: number; h: number; box: [number, number, number, number] };
const BREAKING_TEMPLATES: BreakingTemplate[][] = [
  [
    { src: "/breaking1.png", w: 521, h: 152, box: [6, 94, 61, 82] },
    { src: "/breaking2.png", w: 521, h: 182, box: [5, 95, 59, 84] },
  ],
  [
    { src: "/breaking3.png", w: 521, h: 243, box: [5, 95, 56, 86] },
    { src: "/breaking4.png", w: 521, h: 243, box: [5, 95, 56, 86] },
  ],
  [
    { src: "/breaking5.png", w: 521, h: 331, box: [5, 95, 37, 81] },
    { src: "/breaking6.png", w: 521, h: 331, box: [5, 95, 37, 81] },
  ],
  [
    { src: "/breaking7.png", w: 521, h: 585, box: [5, 95, 26, 85] },
    { src: "/breaking8.png", w: 521, h: 584, box: [5, 95, 26, 85] },
  ],
];

/**
 * Noticia escrita por un organizador, en el cartel "Breaking news" del tamaño
 * que necesita el texto. `variant` alterna entre los dos modelos de cada tamaño.
 */
export function BreakingNews({ text, variant = 0 }: { text: string; variant?: number }) {
  const options = BREAKING_TEMPLATES[breakingSize(text)];
  const t = options[variant % options.length];
  const [x0, x1, y0, y1] = t.box;
  const width = x1 - x0;
  const height = ((y1 - y0) * t.h) / t.w;
  return (
    <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: `${t.w} / ${t.h}` }}>
      <Image src={t.src} alt="Breaking news" fill sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
      <p
        className="absolute flex items-center break-words font-extrabold leading-tight text-black"
        style={{
          left: `${x0}%`,
          right: `${100 - x1}%`,
          top: `${y0}%`,
          bottom: `${100 - y1}%`,
          fontSize: `${breakingFontSize(text, width, height)}cqw`,
        }}
      >
        <span className="w-full">{text}</span>
      </p>
    </div>
  );
}
