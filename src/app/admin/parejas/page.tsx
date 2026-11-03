import Header from "@/components/Header";
import { displayName, requireOrganizer, type Pair, type Profile } from "@/lib/session";
import { assignPlayer, createPair, deletePair, renamePair, toggleOrganizer } from "./actions";

const input = "rounded-lg border border-gray-300 px-2 py-1 text-black";
const button = "rounded-lg bg-emerald-600 px-3 py-1 text-sm font-semibold text-white";

export default async function ParejasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { error } = await searchParams;

  const [{ data: pairs }, { data: players }] = await Promise.all([
    supabase.from("pairs").select("id, name").order("name").returns<Pair[]>(),
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, pair_id")
      .order("created_at")
      .returns<Profile[]>(),
  ]);

  const playersOf = (pairId: string) => (players ?? []).filter((p) => p.pair_id === pairId);

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Parejas y jugadores</h1>

        {error && <p className="mb-4 rounded-lg bg-red-100 p-3 text-red-900">{error}</p>}

        <form action={createPair} className="mb-6 flex gap-2">
          <input name="name" placeholder="Nombre de la nueva pareja" className={`${input} flex-1`} />
          <button className={button}>Crear pareja</button>
        </form>

        <h2 className="mb-2 text-lg font-semibold">Parejas ({pairs?.length ?? 0})</h2>
        <ul className="mb-8 flex flex-col gap-2">
          {(pairs ?? []).map((pair) => {
            const members = playersOf(pair.id);
            return (
              <li
                key={pair.id}
                className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <form action={renamePair} className="flex flex-1 gap-2">
                    <input type="hidden" name="id" value={pair.id} />
                    <input name="name" defaultValue={pair.name} className={`${input} flex-1`} />
                    <button className="text-sm underline">Renombrar</button>
                  </form>
                  <form action={deletePair}>
                    <input type="hidden" name="id" value={pair.id} />
                    <button className="text-sm text-red-600 underline">Borrar</button>
                  </form>
                </div>
                <p className="mt-1 text-sm opacity-80">
                  {members.length
                    ? members.map((m) => displayName(m)).join(" y ")
                    : "Sin jugadores"}
                  {members.length === 1 && " (falta uno)"}
                </p>
              </li>
            );
          })}
        </ul>

        <h2 className="mb-2 text-lg font-semibold">Jugadores ({players?.length ?? 0})</h2>
        <p className="mb-3 text-sm opacity-70">
          Los jugadores aparecen aquí cuando entran por primera vez con su email.
        </p>
        <ul className="flex flex-col gap-2">
          {(players ?? []).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
            >
              <div className="min-w-40 flex-1">
                <p className="font-medium">
                  {displayName(p)} {p.is_organizer && <span className="text-xs">⭐ organizador</span>}
                </p>
                <p className="text-xs opacity-60">{p.email}</p>
              </div>
              <form action={assignPlayer} className="flex gap-2">
                <input type="hidden" name="player_id" value={p.id} />
                <select name="pair_id" defaultValue={p.pair_id ?? ""} className={input}>
                  <option value="">Sin pareja</option>
                  {(pairs ?? []).map((pair) => (
                    <option key={pair.id} value={pair.id}>
                      {pair.name}
                    </option>
                  ))}
                </select>
                <button className={button}>Asignar</button>
              </form>
              {p.id !== profile.id && (
                <form action={toggleOrganizer}>
                  <input type="hidden" name="player_id" value={p.id} />
                  <input type="hidden" name="value" value={String(!p.is_organizer)} />
                  <button className="text-sm underline">
                    {p.is_organizer ? "Quitar organizador" : "Hacer organizador"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
