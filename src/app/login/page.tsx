"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    params.get("error") ? "error" : "idle",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-2 text-3xl font-bold">🎾 Torneo de pádel</h1>
      <p className="mb-6 text-sm opacity-70">
        Escribe tu email y te enviaremos un enlace para entrar. No hace falta contraseña.
      </p>

      {status === "sent" ? (
        <p className="rounded-lg bg-green-100 p-4 text-green-900">
          Revisa tu correo <b>{email}</b> y pulsa el enlace para entrar. Ábrelo en este mismo
          navegador.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="rounded-lg border border-gray-300 px-3 py-2 text-black"
          />
          <button
            disabled={status === "sending"}
            className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            {status === "sending" ? "Enviando…" : "Enviarme el enlace"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-600">No se pudo entrar. Prueba otra vez.</p>
          )}
        </form>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
