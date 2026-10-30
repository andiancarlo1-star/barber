"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";

const DEMO = [
  { label: "Admin", email: "admin@navajabarber.gt", password: "Admin123!" },
  { label: "Barbero", email: "carlos@navajabarber.gt", password: "Barber123!" },
  { label: "Cliente", email: "cliente@demo.gt", password: "Cliente123!" },
];

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Correo o contraseña incorrectos. Verifica tus datos.");
      setLoading(false);
      return;
    }

    const target =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/post-login";
    window.location.assign(target);
  }

  return (
    <div>
      <p className="eyebrow">Bienvenido de nuevo</p>
      <h1 className="mt-2 text-3xl">Ingresa a tu cuenta</h1>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Gestiona tus citas, revisa tus pagos o administra la barbería.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <Field label="Correo electrónico" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
        </Field>

        <Field label="Contraseña" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-stone-500">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="link-gold">
          Crear una cuenta
        </Link>
      </p>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Acceso de demostración
        </p>
        <p className="mt-1 text-[10px] text-stone-600">
          Solo para el entorno local. Cambia estas contraseñas antes de producción.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map((demo) => (
            <button
              key={demo.label}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
                setError(null);
              }}
              className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[10px] text-stone-300 transition hover:border-gold-500/40 hover:text-gold-200"
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-[10px] text-stone-600">
        Al ingresar aceptas nuestras{" "}
        <Link href="/politicas" className="underline decoration-stone-700 underline-offset-2 hover:text-stone-400">
          políticas de uso
        </Link>
        .
      </p>
    </div>
  );
}
