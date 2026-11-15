import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import LevelInfo from "@/components/LevelInfo";
import { formatLevel } from "@/lib/level";
import { loadLevels } from "@/lib/level-data";
import Notice from "@/components/Notice";
import StandingsTable from "@/components/StandingsTable";
import StandingsTabs from "@/components/StandingsTabs";
import { leaguePlayerStandings, leagueStandings } from "@/lib/league-data";
import { LEAGUE_COLUMNS, dateInputValue, isIndividual, isResting, type League } from "@/lib/leagues";
import RestNotice from "@/components/RestNotice";
import { loadPairDirectory } from "@/lib/matches";
import { requireProfile } from "@/lib/session";
import { renameLeague, startNewLeague, updateNextSeason } from "./actions";

const input = "min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-black";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });
}

export default async function ClasificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; vista?: string }>;
}) {
  const { supabase, profile } = await requireProfile();
  const { ok, error, vista } = await searchParams;

  const [{ pairs, pairName }, { data: leagues }] = await Promise.all([
    loadPairDirectory(supabase),
    // Temporadas de la categoría que se está viendo.
    supabase.from("category_seasons").select(LEAGUE_COLUMNS).order("started_at", { ascending: false }).returns<League[]>(),
  ]);
  const open = (leagues ?? []).find((l) => !l.ended_at) ?? null;
  const previous = (leagues ?? []).filter((l) => l.ended_at);
  // En el descanso se ve la clasificación final de la temporada que acaba de terminar.
  const resting = isResting(open);
  const current = resting ? (previous[0] ?? null) : open;
  // En una liga individual solo hay clasificación individual.
  const individualLeague = isIndividual(current);
  const individual = individualLeague || vista === "jugadores";
  const { rows, matches } = await leagueStandings(
    supabase,
    current,
    pairs.map((p) => p.id),
    { onlyPlayed: resting },
  );
  const today = dateInputValue(new Date().toISOString());
  const [players, levelData] = individual
    ? await Promise.all([
        leaguePlayerStandings(supabase, matches, { includeCurrentPlayers: !resting, individual: individualLeague }),
        loadLevels(supabase),
      ])
    : [null, null];
  const levelOf = (id: string) => {
    const l = levelData?.levels.get(id);
    return l?.rated ? formatLevel(l.level) : "–";
  };

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Clasificación</h1>
        {current && (
          <p className="mb-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            🏆 {resting ? "Clasificación final de " : ""}
            {current.name} · {individualLeague ? "liga individual" : "liga por parejas"} ·{" "}
            {resting && current.ended_at
              ? `del ${formatDate(current.started_at)} al ${formatDate(current.ended_at)}`
              : `desde el ${formatDate(current.started_at)}`}
          </p>
        )}
        <Notice ok={ok} error={error} />
        <RestNotice league={open} />
        {!individualLeague && <StandingsTabs base="/clasificacion" players={individual} />}
        {players ? (
          <>
            <StandingsTable
              rows={players.rows}
              nameOf={players.nameOf}
              label="Jugador"
              highlight={profile.id}
              hrefFor={(id) => `/jugadores/${id}/estadisticas`}
              levelOf={levelOf}
            />
            <p className="mt-2 text-xs opacity-60">
              {individualLeague
                ? "Liga individual: cada semana cambian las parejas y cada jugador suma los puntos de sus partidos."
                : "Cada jugador suma los puntos de los partidos que ha jugado, con la pareja que tenía en cada partido."}{" "}
              Pulsa en un jugador para ver sus estadísticas y la evolución de su nivel. «–» = no ha rellenado
              el formulario de nivel.
            </p>
            <div id="nivel" className="mt-4 scroll-mt-20">
              <LevelInfo />
            </div>
          </>
        ) : (
          <>
            <StandingsTable
              rows={rows}
              nameOf={pairName}
              highlight={profile.pair_id}
              hrefFor={current ? (id) => `/clasificacion/liga/${current.id}/pareja/${id}` : undefined}
            />
            {current && <p className="mt-2 text-xs opacity-60">Pulsa en una pareja para ver sus partidos.</p>}
          </>
        )}

        <div className="mt-4 text-xs opacity-70">
          <p className="font-semibold">
            Ganas 1 punto por cada set ganado, y 1 punto extra si ganas sin ceder ningún set.
          </p>
          <ul className="my-1 list-inside list-disc">
            <li>Ganar 2-0: 3 puntos (2 sets + 1 extra)</li>
            <li>Ganar 2-1: 2 puntos</li>
            <li>Perder 1-2: 1 punto</li>
            <li>Perder 0-2: 0 puntos</li>
            <li>Partido sin terminar: empate, 1 punto para cada pareja</li>
          </ul>
          <p>A igualdad de puntos, desempatan los partidos ganados y luego la diferencia de sets.</p>

          <p className="mt-3 font-semibold">🎲 Cómo funciona el sorteo</p>
          <p>
            Cada semana, cada jugador marca en Disponibilidad si puede jugar. Después, un organizador lanza el
            sorteo. Solo entran quienes han dicho que pueden, y nadie juega más de un partido por semana.
          </p>
          {individualLeague ? (
            <ul className="my-1 list-inside list-disc">
              <li>Los partidos se forman de 4 en 4 entre los jugadores disponibles.</li>
              <li>Si sobran jugadores, descansan los que más partidos llevan (si hay empate, al azar).</li>
              <li>
                Se intenta que no repitas compañero y, después, que no repitas rivales. Lo demás se decide al azar.
              </li>
            </ul>
          ) : (
            <ul className="my-1 list-inside list-disc">
              <li>Una pareja entra en el sorteo si pueden jugar sus dos miembros.</li>
              <li>
                Si el número de parejas es impar, descansa la que más partidos lleva (si hay empate, se decide al
                azar).
              </li>
              <li>
                A cada pareja le toca de rival la que menos partidos lleva (si hay empate, al azar). Se puede repetir
                rival.
              </li>
            </ul>
          )}
          <p>
            Los organizadores pueden retocar los partidos a mano después del sorteo si hay algún cambio de última hora.
          </p>
        </div>

        {previous.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-lg font-semibold">📚 Ligas anteriores</h2>
            <ul className="flex flex-col gap-2">
              {previous.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/clasificacion/liga/${l.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 hover:border-lime-400 hover:bg-lime-50 dark:border-gray-800 dark:hover:bg-neutral-900"
                  >
                    <span>
                      <span className="block font-semibold">{l.name}</span>
                      <span className="block text-xs opacity-60">
                        Del {formatDate(l.started_at)} al {formatDate(l.ended_at!)}
                      </span>
                    </span>
                    <span aria-hidden className="opacity-50">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {profile.is_organizer && open && resting && (
          <section className="mt-8 rounded-xl border border-amber-300 p-4 dark:border-amber-800">
            <h2 className="mb-1 font-semibold">Organizador · Temporada que viene</h2>
            <p className="mb-3 text-sm opacity-70">
              Hasta que empiece puedes cambiarle el nombre, el tipo y la fecha de inicio. Empieza sola ese día.
              Durante el descanso, el organizador de la liga puede cambiar jugadores de categoría.
            </p>
            <form action={updateNextSeason} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={open.id} />
              <input name="name" required maxLength={60} defaultValue={open.name} className={input} />
              <div className="flex flex-wrap gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="kind" value="parejas" defaultChecked={open.kind !== "individual"} />
                  Por parejas
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="kind" value="individual" defaultChecked={open.kind === "individual"} />
                  Individual
                </label>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                Empieza el
                <input type="date" name="start" required min={today} defaultValue={dateInputValue(open.started_at)} className={input} />
              </label>
              <SubmitButton className="self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                Guardar
              </SubmitButton>
            </form>
          </section>
        )}

        {profile.is_organizer && current && !resting && (
          <section className="mt-8 flex flex-col gap-4">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h2 className="mb-2 font-semibold">Organizador · Nombre de la liga en curso</h2>
              <form action={renameLeague} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={current.id} />
                <input name="name" required defaultValue={current.name} className={input} />
                <SubmitButton className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                  Guardar
                </SubmitButton>
              </form>
            </div>

            <div className="rounded-xl border border-red-200 p-4 dark:border-red-900">
              <h2 className="mb-1 font-semibold text-red-700 dark:text-red-400">
                Organizador · Terminar la temporada
              </h2>
              <p className="mb-3 text-sm opacity-70">
                Termina «{current.name}» (su clasificación y resultados quedan en Ligas anteriores) y
                prepara la temporada siguiente desde cero, por parejas o individual. Hasta su fecha de inicio
                hay descanso: no hay partidos y el organizador de la liga puede cambiar jugadores de
                categoría. Las parejas, los jugadores y la disponibilidad se mantienen.
              </p>
              <form action={startNewLeague} className="flex flex-col gap-2">
                <input name="name" required maxLength={60} placeholder="Nombre de la nueva temporada" className={input} />
                <label className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">Empieza el</span>
                  <input type="date" name="start" required min={today} defaultValue={today} className={input} />
                  <span className="opacity-70">(hoy = sin descanso, empieza ya)</span>
                </label>
                <fieldset className="flex flex-col gap-1 text-sm">
                  <legend className="mb-1 font-semibold">Tipo de temporada</legend>
                  <label className="flex items-start gap-2">
                    <input type="radio" name="kind" value="parejas" defaultChecked className="mt-1" />
                    <span>
                      <b>Por parejas</b> · como hasta ahora: parejas fijas, juegan las parejas en las que
                      pueden los dos.
                    </span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="radio" name="kind" value="individual" className="mt-1" />
                    <span>
                      <b>Individual</b> · cada semana se forman parejas nuevas entre los jugadores
                      disponibles, rotando compañeros. Parejas queda deshabilitado (no se borra) y la
                      clasificación es por jugador.
                    </span>
                  </label>
                </fieldset>
                <div className="flex flex-wrap gap-2">
                  <input name="confirm" required autoComplete="off" placeholder="Escribe TERMINAR" className={input} />
                  <ConfirmButton
                    message={`Se cerrará «${current.name}» y su clasificación quedará como final. ¿Seguro?`}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Terminar temporada
                  </ConfirmButton>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
