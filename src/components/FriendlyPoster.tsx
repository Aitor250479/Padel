import Image from "next/image";
import Link from "next/link";
import { FRIENDLY_NO_RESULT_TEMPLATES, FRIENDLY_RESULT_TEMPLATES, ResultPoster } from "@/components/NewsPosters";
import { fitFontSize } from "@/lib/news";

export type FriendlyPosterKind = "open" | "confirmed" | "result" | "noresult";

const TITLES: Record<FriendlyPosterKind, string> = {
  open: "¡Se buscan jugadores!",
  confirmed: "Amistoso confirmado",
  result: "Resultado del amistoso",
  noresult: "Amistoso jugado",
};

// Cuatro carteles "Partido amistoso" (865x420) con la misma maqueta: cuatro
// casillas de nombre, dos por pareja. Cada partido del carrusel usa uno distinto.
const ANNOUNCE_TEMPLATES = ["/amistoso1.png", "/amistoso2.png", "/amistoso3.png", "/amistoso4.png"];
const ANNOUNCE_W = 865;
const ANNOUNCE_H = 420;
// Casillas, en porcentaje del cartel: centro vertical de cada fila y borde izquierdo de cada pareja.
const ANNOUNCE_ROWS = [78.2, 91.6];
const ANNOUNCE_LEFT = [3.4, 63.6];
const ANNOUNCE_WIDTH = 32.8;
// Alto de la casilla en unidades cqw (9,5 % del alto del cartel).
const ANNOUNCE_MAX_FONT = ((9.5 * ANNOUNCE_H) / ANNOUNCE_W) * 0.62;

/**
 * Cartel de un amistoso para los carruseles del inicio: "Partido amistoso"
 * para anunciarlo (con huecos o confirmado) y "Resultado amistoso" cuando se
 * ha jugado.
 */
export default function FriendlyPoster({
  href,
  kind,
  a,
  b,
  when,
  place,
  score,
  variant = 0,
}: {
  href: string;
  /** Qué modelo de cartel usar (rota en el carrusel). */
  variant?: number;
  kind: FriendlyPosterKind;
  /** Nombres de cada pareja; null = hueco libre. */
  a: (string | null)[];
  b: (string | null)[];
  when: string;
  place?: string | null;
  score?: { a: number; b: number; detail: string | null };
}) {
  if (kind === "open" || kind === "confirmed") {
    const left = [...a, ...b].filter((n) => !n).length;
    return (
      <Link href={href} className="block active:scale-[0.99]" aria-label={`${TITLES[kind]}: ${when}`}>
        <figure className="w-full">
          <div
            className="relative w-full overflow-hidden rounded-xl [container-type:inline-size]"
            style={{ aspectRatio: `${ANNOUNCE_W} / ${ANNOUNCE_H}` }}
          >
            <Image
              src={ANNOUNCE_TEMPLATES[variant % ANNOUNCE_TEMPLATES.length]}
              alt="Partido amistoso"
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-contain"
            />
            {[a, b].map((names, side) =>
              ANNOUNCE_ROWS.map((top, r) => {
                const text = names[r] ?? "¡Hueco libre!";
                return (
                  <span
                    key={`${side}-${r}`}
                    className={`absolute -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap text-center font-black uppercase italic leading-tight ${
                      names[r] ? "text-neutral-950" : "text-red-600"
                    }`}
                    style={{
                      left: `${ANNOUNCE_LEFT[side]}%`,
                      width: `${ANNOUNCE_WIDTH}%`,
                      top: `${top}%`,
                      fontSize: `${fitFontSize(text, ANNOUNCE_WIDTH, ANNOUNCE_MAX_FONT, 2)}cqw`,
                    }}
                  >
                    {text}
                  </span>
                );
              }),
            )}
          </div>
          <figcaption className="mt-1 text-center text-sm">
            <span className="block">
              📅 <b>{when}</b>
              {place ? ` · 📍 ${place}` : ""}
            </span>
            {kind === "confirmed" ? (
              <span className="block font-semibold text-emerald-700 dark:text-emerald-400">✅ Confirmado: ya están los 4</span>
            ) : (
              <span className="block font-semibold text-red-600">
                🔥 {left === 1 ? "Falta 1 jugador" : `Faltan ${left} jugadores`} · ¡Pincha y apúntate!
              </span>
            )}
          </figcaption>
        </figure>
      </Link>
    );
  }

  // Jugado: cartel de resultado (o pendiente de resultado).
  const players = (names: (string | null)[]) => names.filter((n): n is string => !!n);
  const sa = score?.a ?? 0;
  const sb = score?.b ?? 0;
  return (
    <Link href={href} className="block active:scale-[0.99]" aria-label={`${TITLES[kind]}: ${when}`}>
      <ResultPoster
        templates={score ? FRIENDLY_RESULT_TEMPLATES : FRIENDLY_NO_RESULT_TEMPLATES}
        variant={variant}
        pending={!score}
        detail={score?.detail ?? null}
        a={{ name: players(a).join(" y "), players: players(a), sets: sa }}
        b={{ name: players(b).join(" y "), players: players(b), sets: sb }}
        caption={
          <>
            <span className="block">
              📅 {when}
              {place ? ` · 📍 ${place}` : ""}
            </span>
            {score ? (
              <span className="block">
                {players(a).join(" y ")} <strong>{sa}-{sb}</strong> {players(b).join(" y ")}
                {sa === sb ? " · empate" : ""}
              </span>
            ) : (
              <span className="block font-semibold text-red-600">📝 Jugado: falta poner el resultado</span>
            )}
          </>
        }
      />
    </Link>
  );
}
