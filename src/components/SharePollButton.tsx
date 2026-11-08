"use client";

import { useState } from "react";

/**
 * Comparte el cartel de la encuesta. En el móvil abre el menú de compartir
 * (para elegir WhatsApp) con la imagen y el texto. Donde no se puede compartir
 * una imagen (ordenador), la descarga, copia el texto y abre WhatsApp.
 */
export default function SharePollButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [hint, setHint] = useState("");

  async function share() {
    setStatus("busy");
    setHint("");
    try {
      const res = await fetch("/admin/bienvenida/cartel", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const file = new File([blob], "encuesta.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          setStatus("done");
        } catch {
          setStatus("idle"); // cancelado
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "encuesta.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {}
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      setHint(
        `Imagen descargada${copied ? " y texto copiado" : ""}. Adjunta la imagen en el chat de WhatsApp que se ha abierto.`,
      );
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={share}
        disabled={status === "busy"}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-[#25D366] px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        <span aria-hidden>{status === "busy" ? "⏳" : "📲"}</span>
        {status === "busy" ? "Preparando el cartel…" : "Compartir la encuesta por WhatsApp"}
      </button>
      {hint && <p className="text-xs opacity-70">{hint}</p>}
      {status === "error" && <p className="text-xs text-red-600">No se ha podido preparar el cartel. Vuelve a intentarlo.</p>}
    </div>
  );
}
