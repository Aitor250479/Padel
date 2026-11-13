import Link from "next/link";

export type FriendlyPosterKind = "open" | "confirmed" | "result" | "noresult";

const TITLES: Record<FriendlyPosterKind, string> = {
  open: "¡Se buscan jugadores!",
  confirmed: "Amistoso confirmado",
  result: "Resultado del amistoso",
  noresult: "Amistoso jugado",
};

/**
 * Cartel de un amistoso para los carruseles del inicio. Mismo formato que los
 * carteles de liga (1672x941). De momento se dibuja con estilos; cuando lleguen
 * las imágenes exclusivas de amistosos se pondrán de fondo con sus zonas medidas.
 */
export default function FriendlyPoster({
  href,
  kind,
  a,
  b,
  when,
  place,
  score,
}: {
  href: string;
  kind: FriendlyPosterKind;
  /** Nombres de cada pareja; null = hueco libre. */
  a: (string | null)[];
  b: (string | null)[];
  when: string;
  place?: string | null;
  score?: { a: number; b: number; detail: string | null };
}) {
  const winner = score ? (score.a > score.b ? "a" : score.b > score.a ? "b" : null) : null;
  const team = (names: (string | null)[], side: "a" | "b") => (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-[1.5cqw]">
      {names.map((n, i) =>
        n ? (
          <span
            key={i}
            className={`w-full truncate text-center text-[4.2cqw] font-black uppercase leading-tight ${
              winner === side ? "text-lime-300" : "text-white"
            }`}
          >
            {n}
          </span>
        ) : (
          <span
            key={i}
            className="rounded-full border-[0.3cqw] border-dashed border-lime-400 px-[3cqw] py-[0.6cqw] text-[3.6cqw] font-extrabold uppercase text-lime-300"
          >
            ¡Hueco libre!
          </span>
        ),
      )}
    </div>
  );

  return (
    <Link href={href} className="block active:scale-[0.99]" aria-label={`${TITLES[kind]}: ${when}`}>
      <div
        className="relative flex w-full flex-col overflow-hidden rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-emerald-950 text-white shadow-md [container-type:inline-size]"
        style={{ aspectRatio: "1672 / 941" }}
      >
        <div className="flex items-center justify-center gap-[1.5cqw] bg-lime-400 py-[1.6cqw] text-neutral-950">
          <span aria-hidden className="text-[4cqw]">
            🤝
          </span>
          <span className="text-[4.4cqw] font-black uppercase italic tracking-tight">{TITLES[kind]}</span>
        </div>
        <div className="flex flex-1 items-center gap-[2cqw] px-[4cqw]">
          {team(a, "a")}
          <div className="shrink-0 text-center">
            {score ? (
              <>
                <p className="text-[9cqw] font-black tabular-nums leading-none">
                  {score.a}-{score.b}
                </p>
                {score.detail && <p className="mt-[0.8cqw] text-[2.6cqw] font-semibold opacity-80">{score.detail}</p>}
              </>
            ) : kind === "noresult" ? (
              <p className="text-[3.2cqw] font-extrabold uppercase leading-tight text-amber-300">
                Pendiente
                <br />
                de resultado
              </p>
            ) : (
              <p className="text-[8cqw] font-black italic leading-none text-lime-400">VS</p>
            )}
          </div>
          {team(b, "b")}
        </div>
        <div className="bg-black/60 px-[3cqw] py-[1.6cqw] text-center text-[3.2cqw] font-bold">
          📅 {when}
          {place && <span className="opacity-80"> · 📍 {place}</span>}
        </div>
      </div>
    </Link>
  );
}
