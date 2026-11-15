import { formatSeasonStart, isResting, type League } from "@/lib/leagues";

/** Aviso de descanso entre temporadas: cuándo empieza la siguiente. */
export default function RestNotice({ league, children }: { league: League | null; children?: React.ReactNode }) {
  if (!league || !isResting(league)) return null;
  return (
    <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      🏖️ <b>Descanso entre temporadas.</b> «{league.name}» empieza el{" "}
      <b>{formatSeasonStart(league.started_at)}</b>
      {league.kind === "individual" ? " (individual)" : " (por parejas)"}. {children}
    </p>
  );
}
