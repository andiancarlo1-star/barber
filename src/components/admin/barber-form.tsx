"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveBarberAction, type ActionState } from "@/app/admin/actions";
import { Alert, Field, Input, Textarea, buttonClasses } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-controls";

export function BarberForm({
  barber,
}: {
  barber: {
    id?: string;
    name: string;
    email: string;
    phone: string;
    title: string;
    bio: string;
    imageUrl: string;
    displayOrder: number;
    active: boolean;
    acceptsBookings: boolean;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveBarberAction, null);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-3">
      {barber.id ? <input type="hidden" name="id" value={barber.id} /> : null}
      <div className="space-y-4 lg:col-span-2">
        {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
        <div className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" htmlFor="name" error={state?.fieldErrors?.name?.[0]}>
              <Input id="name" name="name" required defaultValue={barber.name} />
            </Field>
            <Field label="Correo de acceso" htmlFor="email" error={state?.fieldErrors?.email?.[0]}>
              <Input id="email" name="email" type="email" required defaultValue={barber.email} />
            </Field>
            <Field label="Teléfono" htmlFor="phone" error={state?.fieldErrors?.phone?.[0]}>
              <Input id="phone" name="phone" type="tel" defaultValue={barber.phone} placeholder="5555 1234" />
            </Field>
            <Field
              label={barber.id ? "Nueva contraseña (opcional)" : "Contraseña"}
              htmlFor="password"
              error={state?.fieldErrors?.password?.[0]}
              hint={barber.id ? "Déjala vacía para conservar la actual." : "Mínimo 8 caracteres."}
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required={!barber.id}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Cargo / título" htmlFor="title" error={state?.fieldErrors?.title?.[0]} className="sm:col-span-2">
              <Input id="title" name="title" defaultValue={barber.title} placeholder="Master Barber & fundador" />
            </Field>
            <Field label="Biografía" htmlFor="bio" error={state?.fieldErrors?.bio?.[0]} className="sm:col-span-2">
              <Textarea id="bio" name="bio" rows={3} defaultValue={barber.bio} placeholder="Especialidades, años de experiencia…" />
            </Field>
            <Field
              label="Foto (URL)"
              htmlFor="imageUrl"
              error={state?.fieldErrors?.imageUrl?.[0]}
              className="sm:col-span-2"
            >
              <Input id="imageUrl" name="imageUrl" type="url" defaultValue={barber.imageUrl} placeholder="https://…" />
            </Field>
            <Field label="Orden en el sitio" htmlFor="displayOrder" error={state?.fieldErrors?.displayOrder?.[0]}>
              <Input id="displayOrder" name="displayOrder" type="number" min={0} defaultValue={barber.displayOrder} />
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 rounded-xl border border-white/10 bg-ink-850/60 p-5">
          <p className="text-xs font-semibold text-stone-200">Visibilidad</p>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-stone-300">
            <input type="checkbox" name="active" defaultChecked={barber.active} className="h-4 w-4 accent-gold-500" />
            Cuenta activa (puede ingresar)
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-stone-300">
            <input
              type="checkbox"
              name="acceptsBookings"
              defaultChecked={barber.acceptsBookings}
              className="h-4 w-4 accent-gold-500"
            />
            Acepta reservas en línea
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <SubmitButton className="w-full">{barber.id ? "Guardar barbero" : "Crear barbero"}</SubmitButton>
          <Link href="/admin/barberos" className={buttonClasses({ variant: "ghost", size: "md", className: "w-full" })}>
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
