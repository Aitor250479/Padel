import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { displayName, requireOrganizer, type Pair, type Profile } from "@/lib/session";
import {
  assignPlayer,
  deletePlayer,
  savePlayerName,
  setPlayerActive,
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
      .select("*")
      .eq("id", id)
      .maybeSingle<Profile>(),
    supabase.from("pairs").select("id, name").is("league_id", null).order("name").returns<Pair[]>(),
  ]);
  if (!player || player.deleted_at) notFound();

  const pair = (pairs ?? []).find((p) => p.id === player.pair_id);
  const back = `/admin/jugadores/${player.id}`;
  const inactive = player.active === false;
  const isMe = player.id === profile.id;

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
          {inactive && (
            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 align-middle text-xs font-semibold text-gray-700">
              Desactivado
            </span>
          )}
        </h1>
        <p className="mb-4 text-sm opacity-70">
          {inactive ? (
            "No puede entrar en la web y no entra en parejas ni sorteos"
          ) : pair ? (
            <>
              Pareja: <b>{pair.name}</b>
            </>
          ) : (
            "Sin pareja asignada"
          )}
          {player.is_organizer && " · Organizador"}
        </p>
        <Notice ok={ok} error={error} />
        <Link
          href={`/jugadores/${player.id}/estadisticas`}
          className="mb-4 flex items-center justify-between rounded-xl bg-neutral-950 p-4 font-semibold text-white hover:bg-neutral-800"
        >
          <span>📊 Estadísticas de juego</span>
          <span aria-hidden className="text-lime-400">›</span>
        </Link>

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
              <SubmitButton className={button}>Guardar</SubmitButton>
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

          {!inactive && (
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
                <SubmitButton className={button}>Guardar</SubmitButton>
              </form>
            </section>
          )}

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
              <SubmitButton className={button}>Guardar</SubmitButton>
            </form>
          </section>

          {!isMe && !inactive && (
            <section className={card}>
              <h2 className="mb-1 font-semibold">Organizador</h2>
              <p className="mb-3 text-sm opacity-70">
                Los organizadores lanzan emparejamientos y gestionan parejas y jugadores.
              </p>
              <form action={toggleOrganizer}>
                <input type="hidden" name="player_id" value={player.id} />
                <input type="hidden" name="value" value={String(!player.is_organizer)} />
                <SubmitButton className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold">
                  {player.is_organizer ? "Quitar organizador" : "Hacer organizador"}
                </SubmitButton>
              </form>
            </section>
          )}

          {!isMe && !inactive && (
            <section className={card}>
              <h2 className="mb-1 font-semibold">Desactivar jugador</h2>
              <p className="mb-3 text-sm opacity-70">
                Sale de su pareja y deja de jugar y de entrar en los sorteos. Podrá entrar en la web solo para
                consultar partidos, clasificación y encuestas. Sus partidos y estadísticas se conservan. Puedes
                reactivarlo cuando quieras.
              </p>
              <form action={setPlayerActive}>
                <input type="hidden" name="player_id" value={player.id} />
                <input type="hidden" name="active" value="false" />
                <ConfirmButton
                  message={`${displayName(player)} saldrá de su pareja y solo podrá entrar a consultar. ¿Desactivarlo?`}
                  pendingText="Desactivando…"
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700"
                >
                  Desactivar
                </ConfirmButton>
              </form>
            </section>
          )}

          {!isMe && inactive && (
            <section className={card}>
              <h2 className="mb-1 font-semibold">Reactivar o eliminar</h2>
              <p className="mb-3 text-sm opacity-70">
                Si lo reactivas volverá a jugar y tendrás que asignarle pareja. Si lo eliminas, se borra su
                cuenta para siempre y ya no podrá entrar; sus partidos y estadísticas se conservan.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={setPlayerActive}>
                  <input type="hidden" name="player_id" value={player.id} />
                  <input type="hidden" name="active" value="true" />
                  <SubmitButton pendingText="Reactivando…" className={button}>
                    Reactivar
                  </SubmitButton>
                </form>
                <form action={deletePlayer}>
                  <input type="hidden" name="player_id" value={player.id} />
                  <ConfirmButton
                    message={`Se borrará la cuenta de ${displayName(player)} para siempre (sus estadísticas se conservan) y no se puede deshacer. ¿Eliminarlo?`}
                    pendingText="Eliminando…"
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Eliminar definitivamente
                  </ConfirmButton>
                </form>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
