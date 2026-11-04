"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; also?: string[] };

function PillContent({ icon, label }: { icon: string; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      <span aria-hidden className={pending ? "inline-block animate-spin" : undefined}>
        {pending ? "⏳" : icon}
      </span>
      {label}
    </>
  );
}

export default function NavPills({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="mt-3 flex flex-wrap justify-center gap-2 pb-3">
      {items.map((i) => {
        const active = [i.href, ...(i.also ?? [])].some(
          (h) => pathname === h || pathname.startsWith(`${h}/`),
        );
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors active:scale-95",
              active
                ? "bg-lime-400 text-neutral-950"
                : "bg-white/10 text-white hover:bg-white/20",
            ].join(" ")}
          >
            <PillContent icon={i.icon} label={i.label} />
          </Link>
        );
      })}
    </nav>
  );
}
