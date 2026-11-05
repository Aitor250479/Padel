import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";
import Link from "next/link";
import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { requireProfile } from "@/lib/session";
import { saveEmail, saveName, savePassword } from "./actions";

const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-black";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; nueva?: string }>;
}) {
  const { profile } = await requireProfile();
  const params = await searchParams;

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Mi perfil</h1>
        <Notice ok={params.ok} error={params.error} />
        <Link
          href={`/jugadores/${profile.id}/estadisticas`}
          className="mb-6 flex items-center justify-between rounded-xl bg-neutral-950 p-4 font-semibold text-white hover:bg-neutral-800"
        >
          <span>📊 Estadísticas de juego</span>
          <span aria-hidden className="text-lime-400">›</span>
        </Link>
        {params.nueva && (
          <p className="mb-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">
            Crea aquí abajo tu nueva contraseña.
          </p>
        )}

        <form action={saveName} className="mb-8 flex flex-col gap-3">
          <label className="text-sm">
            Nombre
            <input
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder="Nombre y apellido"
              className={input}
            />
          </label>
          <SubmitButton className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white">
            Guardar nombre
          </SubmitButton>
        </form>

        <form action={saveEmail} className="mb-8 flex flex-col gap-3">
          <h2 className="font-semibold">Email de acceso</h2>
          <p className="text-sm opacity-70">
            Es el email con el que entras en la web. Si lo cambias, desde ese momento tendrás que
            entrar con el nuevo.
          </p>
          <input
            type="email"
            name="email"
            required
            defaultValue={profile.email}
            autoComplete="email"
            className={input}
          />
          <ConfirmButton
            message="Ojo: a partir de ahora tendrás que entrar en la web con el email nuevo (la contraseña no cambia). ¿Seguro que quieres cambiarlo?"
            className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white"
          >
            Guardar email
          </ConfirmButton>
        </form>

        <form action={savePassword} className="flex flex-col gap-3">
          <h2 className="font-semibold">Contraseña</h2>
          <p className="text-sm opacity-70">
            Para entrar con tu email y contraseña. Si entrabas con enlace, créala aquí.
          </p>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            placeholder="Nueva contraseña (mín. 6)"
            autoComplete="new-password"
            className={input}
          />
          <input
            type="password"
            name="password2"
            required
            minLength={6}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className={input}
          />
          <SubmitButton className="rounded-lg bg-gray-800 px-3 py-2 font-semibold text-white">
            Guardar contraseña
          </SubmitButton>
        </form>
      </main>
    </>
  );
}
