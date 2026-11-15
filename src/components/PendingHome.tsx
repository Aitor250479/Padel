import Link from "next/link";
import Header from "@/components/Header";
import type { Profile } from "@/lib/session";

/** Inicio de quien entró con la invitación genérica de una liga y aún no tiene categoría. */
export default function PendingHome({ profile, hasLevel }: { profile: Profile; hasLevel: boolean }) {
  return (
    <>
      <Header profile={profile} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <h1 className="mb-1 text-xl font-bold">⏳ ¡Bienvenido! Estás pendiente de categoría</h1>
          <p className="text-sm">
            Un organizador de la liga te asignará enseguida la categoría en la que vas a jugar. En cuanto lo haga,
            verás aquí tus partidos, la clasificación y la disponibilidad.
          </p>
        </section>
        <Link
          href="/nivel"
          className="mt-4 flex items-center justify-between rounded-xl bg-neutral-950 p-4 font-semibold text-white hover:bg-neutral-800"
        >
          <span>
            🎯 {hasLevel ? "Tu nivel de jugador" : "Mientras tanto, calcula tu nivel"}
            {!hasLevel && (
              <span className="block text-sm font-normal opacity-80">
                Contesta 8 preguntas rápidas: ayuda al organizador a elegir tu categoría.
              </span>
            )}
          </span>
          <span aria-hidden className="text-lime-400">›</span>
        </Link>
        <Link
          href="/perfil"
          className="mt-3 flex items-center justify-between rounded-xl border border-gray-200 p-4 font-semibold dark:border-gray-800"
        >
          <span>👤 Mi perfil</span>
          <span aria-hidden>›</span>
        </Link>
      </main>
    </>
  );
}
