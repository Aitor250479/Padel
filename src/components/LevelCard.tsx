import Link from "next/link";
import { formatChange, formatLevel, type PlayerLevel } from "@/lib/level";

function formatWeek(week: string) {
  return new Date(`${week}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Línea con la evolución del nivel (el nivel inicial y después de cada partido). */
function Sparkline({ points }: { points: number[] }) {
  const w = 300;
  const h = 64;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(0.2, max - min);
  const x = (i: number) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 8) + 4);
  const y = (v: number) => h - 6 - ((v - min) / span) * (h - 12);
  const d = points.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label="Evolución del nivel">
      <path d={d} fill="none" stroke="#a3e635" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={4.5} fill="#a3e635" />
    </svg>
  );
}

/** Nivel de un jugador en su ficha de estadísticas. */
export default function LevelCard({
  level,
  isMe,
  isOrganizer,
  playerId,
}: {
  level: PlayerLevel | undefined;
  isMe: boolean;
  isOrganizer: boolean;
  playerId: string;
}) {
  const history = level?.history ?? [];
  const last = history[history.length - 1];
  const change = last ? last.after - last.before : 0;
  const recent = history.slice(-8).reverse();
  return (
    <section className="mb-4 rounded-xl bg-neutral-950 p-4 text-white">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">🎯 Nivel</p>
          <p className="text-4xl font-black text-lime-400">
            {level?.rated ? formatLevel(level.level) : "Pendiente"}
          </p>
        </div>
        {level?.rated && last && (
          <p className={`text-lg font-bold ${change > 0.004 ? "text-lime-400" : change < -0.004 ? "text-red-400" : "opacity-70"}`}>
            {change > 0.004 ? "▲" : change < -0.004 ? "▼" : "="} {formatChange(change)}
            <span className="block text-right text-[11px] font-normal text-white opacity-60">último partido</span>
          </p>
        )}
      </div>

      {!level?.rated && (
        <p className="mt-2 text-sm opacity-80">
          {isMe ? "Todavía no has rellenado el formulario de nivel." : "Todavía no ha rellenado el formulario de nivel."}{" "}
          Mientras tanto cuenta como 1,00 para calcular el nivel de sus rivales.{" "}
          {(isMe || isOrganizer) && (
            <Link href={isMe ? "/nivel" : `/nivel?jugador=${playerId}`} className="font-semibold text-lime-400 underline">
              Rellenar el formulario ›
            </Link>
          )}
        </p>
      )}

      {level?.rated && history.length > 0 && (
        <>
          <Sparkline points={[level.initial, ...history.map((s) => s.after)]} />
          <ul className="mt-2 flex flex-col text-sm">
            {recent.map((s) => {
              const d = s.after - s.before;
              return (
                <li key={s.matchId} className="flex items-center justify-between gap-2 border-t border-white/10 py-1.5">
                  <Link href={`/partidos/${s.matchId}`} className="min-w-0 flex-1 truncate">
                    <span className="opacity-60">{formatWeek(s.week)}</span> · <b>{s.result}</b>{" "}
                    <span className="opacity-60">contra nivel {formatLevel(s.rival)}</span>
                  </Link>
                  <span className={d > 0.004 ? "text-lime-400" : d < -0.004 ? "text-red-400" : "opacity-60"}>
                    {formatChange(d)}
                  </span>
                  <span className="w-11 text-right font-semibold">{formatLevel(s.after)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-[11px] opacity-60">
            Empezó en {formatLevel(level.initial)} · {history.length}{" "}
            {history.length === 1 ? "partido oficial" : "partidos oficiales"}
          </p>
        </>
      )}

      <Link href={isMe ? "/nivel" : isOrganizer ? `/nivel?jugador=${playerId}` : "/clasificacion?vista=jugadores#nivel"} className="mt-2 inline-block text-xs text-lime-400 underline">
        {isMe ? "Mi formulario y cómo se calcula ›" : isOrganizer ? "Formulario y nivel inicial ›" : "Cómo se calcula ›"}
      </Link>
    </section>
  );
}
