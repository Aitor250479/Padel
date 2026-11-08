"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Mode = "entrar" | "registro" | "olvido";

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "Email o contraseña incorrectos.",
  "User already registered": "Ese email ya tiene cuenta. Entra con tu contraseña o pulsa \"He olvidado mi contraseña\".",
  "Email not confirmed": "Todavía no has confirmado tu email. Busca el correo de confirmación.",
};

function translate(message: string) {
  if (ERRORS[message]) return ERRORS[message];
  if (message.includes("at least 6 characters")) return "La contraseña debe tener al menos 6 caracteres.";
  return message;
}

const input = "rounded-lg border border-gray-300 px-3 py-2 text-black";

export function LoginForm({ initialMode = "entrar", banner }: { initialMode?: Mode; banner?: React.ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ?? "");
  const [info, setInfo] = useState("");

  function switchTo(m: Mode) {
    setMode(m);
    setError("");
    setInfo("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    const supabase = createClient();
    const origin = window.location.origin;

    if (mode === "registro" && password !== password2) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setError(translate(error.message));
        router.replace("/");
        router.refresh();
      } else if (mode === "registro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/auth/callback` },
        });
        if (error) return setError(translate(error.message));
        if (data.session) {
          if (name.trim() && data.user) {
            await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", data.user.id);
          }
          router.replace("/");
          router.refresh();
        } else {
          setInfo(
            "Cuenta creada. Te hemos enviado un email para confirmarla (solo esta vez). Después entra con tu email y contraseña.",
          );
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/perfil?nueva=1")}`,
        });
        if (error) return setError(translate(error.message));
        setInfo("Te hemos enviado un email con un enlace para crear una contraseña nueva.");
      }
    } finally {
      setBusy(false);
    }
  }

  const title = { entrar: "Entrar", registro: "Crear cuenta", olvido: "Recuperar contraseña" }[mode];
  const action = {
    entrar: busy ? "Entrando…" : "Entrar",
    registro: busy ? "Creando…" : "Crear cuenta",
    olvido: busy ? "Enviando…" : "Enviarme el enlace",
  }[mode];

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
      {banner ?? (
        <Image
          src="/logo.png"
          alt="Logo del Torneo Pádel Loyola"
          width={192}
          height={192}
          className="mx-auto mb-4 h-48 w-48 object-contain"
          priority
        />
      )}
      <h1 className="mb-6 text-center text-3xl font-bold">Torneo Pádel Loyola</h1>

      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      {mode === "registro" && (
        <p className="mb-3 text-sm opacity-70">
          Solo la primera vez. Después entrarás con tu email y esta contraseña.
        </p>
      )}
      {mode === "olvido" && (
        <p className="mb-3 text-sm opacity-70">
          Te enviaremos un enlace para crear una contraseña nueva. Sirve también si entrabas antes
          con enlace y aún no tienes contraseña.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "registro" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y apellido"
            autoComplete="name"
            className={input}
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          autoComplete="email"
          className={input}
        />
        {mode !== "olvido" && (
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "registro" ? "Crea una contraseña (mín. 6)" : "Contraseña"}
            autoComplete={mode === "registro" ? "new-password" : "current-password"}
            className={input}
          />
        )}
        {mode === "registro" && (
          <input
            type="password"
            required
            minLength={6}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className={input}
          />
        )}
        <button
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
        >
          {action}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-900">{info}</p>}
      </form>

      <div className="mt-6 flex flex-col gap-2 text-center text-sm">
        {mode !== "entrar" && (
          <button onClick={() => switchTo("entrar")} className="underline">
            Ya tengo cuenta: entrar
          </button>
        )}
        {mode !== "registro" && (
          <button onClick={() => switchTo("registro")} className="underline">
            Es mi primera vez: crear cuenta
          </button>
        )}
        {mode !== "olvido" && (
          <button onClick={() => switchTo("olvido")} className="underline opacity-70">
            He olvidado mi contraseña
          </button>
        )}
      </div>
    </main>
  );
}
