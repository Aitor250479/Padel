import Header from "@/components/Header";
import { requireProfile } from "@/lib/session";
import { saveName } from "./actions";

export default async function PerfilPage() {
  const { profile } = await requireProfile();

  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-md px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Mi perfil</h1>
        <form action={saveName} className="flex flex-col gap-3">
          <label className="text-sm">
            Nombre
            <input
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder="Nombre y apellido"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-black"
            />
          </label>
          <p className="text-sm opacity-70">Email: {profile.email}</p>
          <button className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white">
            Guardar
          </button>
        </form>
      </main>
    </>
  );
}
