"use client";

import SubmitButton from "@/components/SubmitButton";

/** Botón de envío que pide confirmación antes de mandar el formulario. */
export default function ConfirmButton({
  message,
  className,
  pendingText,
  children,
}: {
  message: string;
  className?: string;
  pendingText?: string;
  children: React.ReactNode;
}) {
  return (
    <SubmitButton
      className={className}
      pendingText={pendingText}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </SubmitButton>
  );
}
