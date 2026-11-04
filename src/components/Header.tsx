import Image from "next/image";
import Link from "next/link";
import NavPills from "@/components/NavPills";
import { displayName, type Profile } from "@/lib/session";

export default function Header({ profile }: { profile: Profile }) {
  const items = [
    { href: "/disponibilidad", label: "Disponibilidad", icon: "📅" },
    { href: "/partidos", label: "Partidos", icon: "🎾" },
    { href: "/clasificacion", label: "Clasificación", icon: "🏆" },
    { href: "/perfil", label: "Mi perfil", icon: "👤" },
    ...(profile.is_organizer
      ? [
          { href: "/admin/parejas", label: "Parejas", icon: "👥", also: ["/admin/jugadores"] },
          { href: "/admin/bienvenida", label: "Texto de Bienvenida", icon: "✍️" },
        ]
      : []),
  ];

  return (
    <header className="bg-neutral-950 text-white shadow-lg">
      <div className="mx-auto max-w-3xl px-4 pt-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 object-contain"
              priority
            />
            <span className="min-w-0">
              <span className="block text-lg font-extrabold leading-tight tracking-tight">
                Torneo Pádel Loyola
              </span>
              <span className="block text-xs text-lime-300">Hola, {displayName(profile)}</span>
            </span>
          </Link>
          <form action="/auth/signout" method="post" className="ml-auto shrink-0">
            <button className="rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10">
              Salir
            </button>
          </form>
        </div>
        <NavPills items={items} />
      </div>
      <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-lime-400" />
    </header>
  );
}
