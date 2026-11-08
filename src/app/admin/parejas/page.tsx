import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { currentLeague, isIndividual } from "@/lib/leagues";
import { displayName, requireOrganizer, type Pair, type Profile } from "@/lib/session";
import { createPair, createPlayer } from "./actions";
import { button, input, rowLink } from "./ui";

export default async function ParejasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { error, ok } = await searchParams;

  const [{ data: pairs }, { data: players }, league] = await Promise.all([
    supabase.from("pairs").select("id, name").is("league_id", null).order("name").returns<Pair[]>(),
    supabase
      .from("profiles")
      .select("*")
      .order("full_name")
      .returns<Profile[]>(),
    currentLeague(supabase),
  ]);
  const individual = isIndividual(league);

  const playersOf = (pairId: string) => (players ?? []).filter((p) => p.pair_id === pairId);
  const active = (players ?? []).filter((p) => p.active !== false);
  // Los eliminados ya no salen: solo se conservan para las estadísticas.
  const inactive = (players ?? []).filter((p) => p.active === false && !p.deleted_at);
  // En la liga individual no hay parejas fijas: se listan todos los jugadores activos.
  const unassigned = individual ? active : active.filter((p) => !p.pair_id);

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">{individual ? "Jugadores" : "Parejas y jugadores"}</h1>
        <Notice ok={ok} error={error} />

        {individual && (
          <p className="mb-6 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
            🙋 <b>La liga en curso es individual</b>, así que las parejas fijas no se usan: cada semana
            se forman parejas nuevas al generar los partidos. Las parejas que había se guardan tal cual
            y vuelven si empiezas otra liga por parejas.
          </p>
        )}

        {!individual && (
        <>
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Parejas ({pairs?.length ?? 0})</h2>
          <ul className="mb-3 grid gap-2 sm:grid-cols-2">
            {(pairs ?? []).map((pair) => {
              const members = playersOf(pair.id);
              return (
                <li key={pair.id}>
                  <Link href={`/admin/parejas/${pair.id}`} className={rowLink}>
                    <span className="min-w-0">
                      <span className="block font-semibold">{pair.name}</span>
                      <span className="block truncate text-sm opacity-70">
                        {members.length ? members.map((m) => displayName(m)).join(" y ") : "Sin jugadores"}
                      </span>
                    </span>
                    {members.length < 2 && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        {members.length === 1 ? "Falta 1" : "Vacía"}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400">
              ➕ Crear pareja
            </summary>
            <form action={createPair} className="mt-2 flex gap-2">
              <input name="name" required placeholder="Nombre de la pareja" className={`${input} flex-1`} />
              <SubmitButton pendingText="Creando…" className={button}>Crear</SubmitButton>
            </form>
          </details>
        </section>

        <section className="mb-8 rounded-xl border border-lime-400 bg-lime-50 p-4 dark:bg-neutral-900">
          <h2 className="mb-1 font-semibold">🎲 Crear parejas al azar</h2>
          <p className="mb-3 text-sm opacity-70">
            Verás primero cómo quedarían y podrás confirmarlas o volver a sortear.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/parejas/sorteo?modo=sin" className={button}>
              Con los jugadores sin pareja ({unassigned.length})
            </Link>
            <Link
              href="/admin/parejas/sorteo?modo=todos"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold dark:bg-transparent"
            >
              Rehacer todas las parejas ({active.length} jugadores)
            </Link>
          </div>
        </section>
        </>
        )}

        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold">
            {individual ? `Jugadores activos (${unassigned.length})` : `Jugadores sin pareja (${unassigned.length})`}
          </h2>
          <p className="mb-3 text-sm opacity-70">
            {individual
              ? "Entra en uno para ver su ficha, cambiarle la contraseña o desactivarlo."
              : "Aparecen aquí cuando se dan de alta. Entra en uno para asignarle pareja."}
          </p>
          {unassigned.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {unassigned.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/jugadores/${p.id}`} className={rowLink}>
                    <span className="min-w-0">
                      <span className="block font-semibold">{displayName(p)}</span>
                      <span className="block truncate text-xs opacity-60">{p.email}</span>
                    </span>
                    <span aria-hidden className="opacity-50">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-70">Todos los jugadores tienen pareja. 🎉</p>
          )}
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400">
              ➕ Dar de alta un jugador
            </summary>
            <p className="mt-2 opacity-70">
              Pon su email y una contraseña, y pásaselos para que entre. Luego podrá cambiar la contraseña en
              Mi perfil.
            </p>
            <form action={createPlayer} className="mt-2 grid gap-2 sm:grid-cols-2">
              <input name="full_name" placeholder="Nombre y apellido" className={input} />
              <input name="email" type="email" required placeholder="Email" autoComplete="off" className={input} />
              <input
                name="password"
                type="text"
                required
                minLength={6}
                autoComplete="off"
                placeholder="Contraseña (mín. 6)"
                className={input}
              />
              <SubmitButton pendingText="Creando…" className={button}>
                Crear jugador
              </SubmitButton>
            </form>
          </details>
        </section>

        {inactive.length > 0 && (
          <section>
            <h2 className="mb-1 text-lg font-semibold">Jugadores desactivados ({inactive.length})</h2>
            <p className="mb-3 text-sm opacity-70">
              Pueden entrar en la web solo para consultar (partidos, clasificación y encuestas), pero no
              juegan ni entran en parejas ni sorteos. Entra en uno para reactivarlo o eliminarlo.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {inactive.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/jugadores/${p.id}`} className={`${rowLink} opacity-70`}>
                    <span className="min-w-0">
                      <span className="block font-semibold">{displayName(p)}</span>
                      <span className="block truncate text-xs opacity-60">{p.email}</span>
                    </span>
                    <span aria-hidden className="opacity-50">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
