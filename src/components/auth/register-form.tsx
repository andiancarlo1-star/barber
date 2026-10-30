"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        const detail = data.details
          ? Object.values(data.details).flat().join(" · ")
          : data.error;
        throw new Error(detail || "No pudimos crear tu cuenta");
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        window.location.assign("/ingresar");
        return;
      }
      window.location.assign("/post-login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="eyebrow">Primera vez aquí</p>
      <h1 className="mt-2 text-3xl">Crea tu cuenta</h1>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Guarda tus datos, consulta tus citas y recibe recordatorios.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <Field label="Nombre completo" htmlFor="name">
          <Input
            id="name"
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. Juan Pérez"
          />
        </Field>

        <Field label="Correo electrónico" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="tu@correo.com"
          />
        </Field>

        <Field label="Teléfono / WhatsApp" htmlFor="phone" hint="8 dígitos, con o sin +502">
          <Input
            id="phone"
            type="tel"
            required
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="5555 1234"
          />
        </Field>

        <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-stone-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="link-gold">
          Inicia sesión
        </Link>
      </p>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-stone-600">
        Al registrarte aceptas nuestras{" "}
        <Link href="/politicas" className="underline decoration-stone-700 underline-offset-2 hover:text-stone-400">
          políticas de reserva y privacidad
        </Link>
        . No compartimos tus datos con terceros.
      </p>
    </div>
  );
}
