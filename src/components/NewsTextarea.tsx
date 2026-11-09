"use client";

import { useState } from "react";
import { NEWS_MAX } from "@/lib/news";

/** Texto de una noticia con el contador de caracteres. */
export default function NewsTextarea({ defaultValue = "", className }: { defaultValue?: string; className: string }) {
  const [length, setLength] = useState([...defaultValue].length);
  return (
    <div className="flex flex-col gap-1">
      <textarea
        name="body"
        defaultValue={defaultValue}
        maxLength={NEWS_MAX}
        rows={5}
        required
        placeholder="Escribe la noticia"
        onChange={(e) => setLength([...e.target.value].length)}
        className={className}
      />
      <span className={`self-end text-xs ${length > NEWS_MAX ? "text-red-600" : "opacity-60"}`}>
        {length}/{NEWS_MAX}
      </span>
    </div>
  );
}
