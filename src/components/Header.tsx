import Link from "next/link";
import { displayName, type Profile } from "@/lib/session";

export default function Header({ profile }: { profile: Profile }) {
  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
        <Link href="/" className="text-base font-bold">
          🎾 Torneo
        </Link>
        <Link href="/disponibilidad">Disponibilidad</Link>
        <Link href="/partidos">Partidos</Link>
        <Link href="/clasificacion">Clasificación</Link>
        <Link href="/perfil">Mi perfil</Link>
        {profile.is_organizer && <Link href="/admin/parejas">Parejas</Link>}
        <span className="ml-auto opacity-70">{displayName(profile)}</span>
        <form action="/auth/signout" method="post">
          <button className="underline">Salir</button>
        </form>
      </nav>
    </header>
  );
}
