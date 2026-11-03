import Image from "next/image";
import Link from "next/link";
import { displayName, type Profile } from "@/lib/session";

export default function Header({ profile }: { profile: Profile }) {
  const links = [
    { href: "/disponibilidad", label: "Disponibilidad" },
    { href: "/partidos", label: "Partidos" },
    { href: "/clasificacion", label: "Clasificación" },
    { href: "/perfil", label: "Mi perfil" },
    ...(profile.is_organizer ? [{ href: "/admin/parejas", label: "Parejas" }] : []),
  ];

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
            <Image
              src="/logo.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain"
              priority
            />
            <span className="leading-tight">Torneo Pádel Loyola y CIA</span>
          </Link>
          <div className="ml-auto flex shrink-0 flex-col items-end text-xs sm:flex-row sm:items-center sm:gap-3 sm:text-sm">
            <span className="opacity-70">{displayName(profile)}</span>
            <form action="/auth/signout" method="post">
              <button className="underline">Salir</button>
            </form>
          </div>
        </div>
        <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
