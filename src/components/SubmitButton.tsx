"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Texto mientras se guarda. Por defecto "Guardando…". */
  pendingText?: string;
};

/**
 * Botón de envío para formularios con acción de servidor.
 * Mientras se guarda:
 *  - el botón pulsado muestra "Guardando…" con un icono girando,
 *  - todo el formulario queda bloqueado (no se puede pulsar otra vez,
 *    ni cambiar otras opciones, ni darle a otro botón del mismo formulario).
 */
export default function SubmitButton({
  pendingText = "Guardando…",
  children,
  className,
  onClick,
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  const ref = useRef<HTMLButtonElement>(null);
  // En formularios con varios botones, solo el pulsado cambia de texto.
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const form = ref.current?.form;
    if (form) {
      // "inert" bloquea todo el formulario (clics, teclado y foco) sin tocar
      // el estado de cada campo, y aria-busy avisa a los lectores de pantalla.
      form.inert = pending;
      form.toggleAttribute("aria-busy", pending);
    }
    if (!pending) setClicked(false);
  }, [pending]);

  const busy = pending && clicked;

  return (
    <button
      ref={ref}
      type="submit"
      {...rest}
      disabled={disabled || pending}
      aria-disabled={pending || undefined}
      className={[className, "disabled:cursor-wait"].filter(Boolean).join(" ")}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) setClicked(true);
      }}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
