"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** A partir de este tiempo se considera que el guardado se ha quedado colgado. */
const SLOW_MS = 15_000;

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
 * Si tarda más de 15 segundos, se desbloquea y avisa para recargar, de modo
 * que nunca se quede colgado en "Guardando…".
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
  const [slow, setSlow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef(false);
  const locked = pending && !slow;

  useEffect(() => {
    pendingRef.current = pending;
    // Ojo: al cambiar `slow`, React puede dar `pending` por terminado aunque la
    // petición siga en marcha; por eso el aviso de "tarda" no depende de `pending`.
    if (!pending && !slow) {
      clearTimeout(timer.current);
      setClicked(false);
    }
  }, [pending, slow]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    // "inert" bloquea todo el formulario (clics, teclado y foco) sin tocar
    // el estado de cada campo, y aria-busy avisa a los lectores de pantalla.
    form.inert = locked;
    form.toggleAttribute("aria-busy", locked);
    // Si el botón desaparece a mitad de guardado, el formulario no se queda bloqueado.
    return () => {
      form.inert = false;
      form.removeAttribute("aria-busy");
    };
  }, [locked]);

  const busy = locked && clicked;

  return (
    <>
      <button
        ref={ref}
        type="submit"
        {...rest}
        disabled={disabled || locked}
        aria-disabled={locked || undefined}
        className={[className, "disabled:cursor-wait"].filter(Boolean).join(" ")}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          setClicked(true);
          setSlow(false);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            if (pendingRef.current) setSlow(true);
          }, SLOW_MS);
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
      {slow && clicked && (
        <span role="status" className="basis-full text-sm text-amber-700">
          Está tardando más de lo normal.{" "}
          <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
            Recarga la página
          </button>{" "}
          para comprobar si se ha guardado.
        </span>
      )}
    </>
  );
}
