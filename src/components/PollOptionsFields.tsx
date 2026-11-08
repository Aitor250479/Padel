"use client";

import { useState } from "react";

/** Número de respuestas de la encuesta y un campo de texto por cada una. */
export default function PollOptionsFields({ className }: { className: string }) {
  const [count, setCount] = useState(2);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Número de respuestas</span>
        <select
          name="option_count"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className={className}
        >
          {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {Array.from({ length: count }, (_, i) => (
        <input key={i} name="option" maxLength={120} placeholder={`Respuesta ${i + 1}`} className={className} />
      ))}
    </div>
  );
}
