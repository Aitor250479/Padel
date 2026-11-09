"use client";

import { Children, useRef, useState, type ReactNode } from "react";

/** Carteles que se pasan con el dedo, con puntitos debajo. */
export default function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const items = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (items.length === 1) return <>{items[0]}</>;

  function go(i: number) {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div aria-roledescription="carrusel" aria-label={label}>
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div key={i} className="w-full shrink-0 snap-center" aria-label={`${i + 1} de ${items.length}`}>
            {item}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Ver ${i + 1} de ${items.length}`}
            className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-lime-600" : "w-2 bg-gray-300 dark:bg-neutral-700"}`}
          />
        ))}
      </div>
    </div>
  );
}
