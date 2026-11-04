import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { displayName, requireOrganizer, type Pair, type Profile } from "@/lib/session";
import {
  assignPlayer,
  savePlayerName,
  setPlayerEmail,
  setPlayerPassword,
  toggleOrganizer,
} from "../../parejas/actions";
import { button, card, input } from "../../parejas/ui";

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireOrganizer();
  const { id } = await params;
  const { error, ok } = await searchParams;

  const [{ data: player }, { data: pairs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, is_organizer, pair_id")
      .eq("id", id)
      .maybeSingle<Profile>(),
    supabase.from("pairs").select("id, name").order("name").returns<Pair[]>(),
  ]);
  if (!player) notFound();

  const pair = (pairs ?? []).find((p) => p.id === player.pair_id);
  const back = `/admin/jugadores/${player.id}`;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href={pair ? `/admin/parejas/${pair.id}` : "/admin/parejas"}
          className="text-sm underline opacity-70"
        >
          ← {pair ? pair.name : "Parejas y jugadores"}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {displayName(player)} {player.is_organizer && <span className="text-base">⭐</span>}
        </h1>
        <p className="mb-4 text-sm opacity-70">
          {pair ? (
            <>
              Pareja: <b>{pair.name}</b>
            </>
          ) : (
            "Sin pareja asignada"
          )}
          {player.is_organizer && " · Organizador"}
        </p>
        <Notice ok={ok} error={error} />

        <div className="flex flex-col gap-4">
          <section className={card}>
            <h2 className="mb-3 font-semibold">Nombre</h2>
            <form action={savePlayerName} className="flex gap-2">
              <input type="hidden" name="player_id" value={player.id} />
              <input
                name="full_name"
                defaultValue={player.full_name ?? ""}
                placeholder="Nombre y apellido"
                className={`${input} flex-1`}
              />
              <button className={button}>Guardar</button>
            </form>
          </section>

          <section className={card}>
            <h2 className="mb-1 font-semibold">Email de acceso</h2>
            <p className="mb-3 text-sm opacity-70">
              Es con el que entra en la web. Si lo cambias, tendrá que entrar con el nuevo.
            </p>
            <form action={setPlayerEmail} className="flex flex-wrap gap-2">
              <input type="hidden" name="player_id" value={player.id} />
              <input
                name="email"
                type="email"
                required
                defaultValue={player.email}
                className={`${input} min-w-0 flex-1`}
              />
              <ConfirmButton
                message={`A partir de ahora ${displayName(player)} tendrá que entrar con el email nuevo. ¿Cambiarlo?`}
                className={button}
              >
                Cambiar email
              </ConfirmButton>
            </form>
          </section>

          <section className={card}>
            <h2 className="mb-3 font-semibold">Pareja</h2>
            <form action={assignPlayer} className="flex flex-wrap gap-2">
              <input type="hidden" name="player_id" value={player.id} />
              <input type="hidden" name="back" value={back} />
              <select name="pair_id" defaultValue={player.pair_id ?? ""} className={`${input} flex-1`}>
                <option value="">Sin pareja</option>
                {(pairs ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button className={button}>Guardar</button>
            </form>
          </section>

          <section className={card}>
            <h2 className="mb-1 font-semibold">Contraseña</h2>
            <p className="mb-3 text-sm opacity-70">
              Pon una nueva y pásasela al jugador. Luego podrá cambiarla en Mi perfil.
            </p>
            <form action={setPlayerPassword} className="flex flex-wrap gap-2">
              <input type="hidden" name="player_id" value={player.id} />
              <input
                name="password"
                type="text"
                required
                minLength={6}
                autoComplete="off"
                placeholder="Nueva contraseña (mín. 6)"
                className={`${input} min-w-0 flex-1`}
              />
              <button className={button}>Guardar</button>
            </form>
          </section>

          {player.id !== profile.id && (
            <section className={card}>
              <h2 className="mb-1 font-semibold">Organizador</h2>
              <p className="mb-3 text-sm opacity-70">
                Los organizadores lanzan emparejamientos y gestionan parejas y jugadores.
              </p>
              <form action={toggleOrganizer}>
                <input type="hidden" name="player_id" value={player.id} />
                <input type="hidden" name="value" value={String(!player.is_organizer)} />
                <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">
                  {player.is_organizer ? "Quitar organizador" : "Hacer organizador"}
                </button>
              </form>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
