"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/polls";

/** Cuenta atrás tipo marcador. Al llegar a cero recarga la página (sale el resultado). */
export default function Countdown({ until }: { until: number }) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) {
        clearInterval(id);
        setTimeout(() => router.refresh(), 1500);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [until, router]);

  const p = countdownParts(now === null ? until - Date.now() : until - now);
  const tiles: [number, string][] = [
    [p.days, "DÍAS"],
    [p.hours, "HORAS"],
    [p.minutes, "MIN"],
    [p.seconds, "SEG"],
  ];
  return (
    <div className="mt-3">
      <div className="flex gap-1.5" role="timer" aria-label={`Quedan ${p.days} días, ${p.hours} horas, ${p.minutes} minutos y ${p.seconds} segundos`}>
        {tiles.map(([n, label]) => (
          <div key={label} className="flex-1 rounded-lg bg-neutral-950 py-2 text-center">
            <span className="block text-3xl font-black tabular-nums text-lime-400" suppressHydrationWarning>
              {String(n).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-bold tracking-widest text-white">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-sm opacity-70">para que se cierre la encuesta</p>
    </div>
  );
}
