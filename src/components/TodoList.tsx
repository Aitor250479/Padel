import Link from "next/link";
import type { Todo } from "@/lib/todo";

/** Tarjetas de "Lo tuyo" en la portada. */
export default function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <section className="mb-6">
      <ul className="flex flex-col gap-2">
        {todos.map((t) => (
          <li key={t.href + t.title}>
            <Link
              href={t.href}
              title={t.brief ? t.text : undefined}
              className={[
                "flex items-center gap-3 rounded-xl border-2 p-3 active:scale-[0.99]",
                t.tone === "action"
                  ? "border-lime-400 bg-lime-50 dark:bg-lime-950/40"
                  : "border-gray-200 dark:border-gray-800",
              ].join(" ")}
            >
              <span aria-hidden className="text-2xl">
                {t.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t.title}</span>
                {!t.brief && <span className="block text-sm opacity-80">{t.text}</span>}
              </span>
              <span aria-hidden className="text-xl opacity-50">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
