import Header from "@/components/Header";
import Notice from "@/components/Notice";
import { requireProfile } from "@/lib/session";
import { saveName, savePassword } from "./actions";

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
          <p className="text-sm opacity-70">Email: {profile.email}</p>
          <button className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white">
            Guardar nombre
          </button>
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
          <button className="rounded-lg bg-gray-800 px-3 py-2 font-semibold text-white">
            Guardar contraseña
          </button>
        </form>
      </main>
    </>
  );
}
