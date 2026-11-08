import Link from "next/link";

/** Pestañas Parejas / Jugadores de la clasificación (?vista=jugadores). */
export default function StandingsTabs({ base, players }: { base: string; players: boolean }) {
  const tab = (active: boolean) =>
    [
      "flex-1 rounded-full px-4 py-1.5 text-center text-sm font-semibold transition-colors",
      active ? "bg-lime-400 text-neutral-950" : "opacity-70 hover:opacity-100",
    ].join(" ");
  return (
    <nav className="mb-4 flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900" aria-label="Tipo de clasificación">
      <Link href={base} className={tab(!players)} aria-current={!players ? "page" : undefined}>
        👥 Parejas
      </Link>
      <Link href={`${base}?vista=jugadores`} className={tab(players)} aria-current={players ? "page" : undefined}>
        🙋 Individual
      </Link>
    </nav>
  );
}
