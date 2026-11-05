"use client";

import SubmitButton from "@/components/SubmitButton";

/** Botón de envío que pide confirmación antes de mandar el formulario. */
export default function ConfirmButton({
  message,
  children,
  ...rest
}: React.ComponentProps<typeof SubmitButton> & { message: string }) {
  return (
    <SubmitButton
      {...rest}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </SubmitButton>
  );
}
