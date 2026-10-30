"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveServiceAction, type ActionState } from "@/app/admin/actions";
import { Alert, Field, Input, Select, Textarea, buttonClasses } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-controls";

export type ServiceFormValues = {
  id?: string;
  name: string;
  description: string;
  price: string;
  durationMin: number;
  bufferMin: number;
  category: string;
  imageUrl: string;
  displayOrder: number;
  active: boolean;
};

const CATEGORIES = ["Cortes", "Barba", "Combos", "Experiencias", "General"];

export function ServiceForm({ service }: { service: ServiceFormValues }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveServiceAction, null);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-3">
      {service.id ? <input type="hidden" name="id" value={service.id} /> : null}
      <div className="space-y-4 lg:col-span-2">
        {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
        <div className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del servicio" htmlFor="name" error={state?.fieldErrors?.name?.[0]} className="sm:col-span-2">
              <Input id="name" name="name" required defaultValue={service.name} placeholder="Ej. Corte clásico" />
            </Field>
            <Field label="Categoría" htmlFor="category" error={state?.fieldErrors?.category?.[0]}>
              <Select id="category" name="category" defaultValue={service.category}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Precio (GTQ)" htmlFor="price" error={state?.fieldErrors?.price?.[0]}>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={service.price}
                placeholder="125.00"
              />
            </Field>
            <Field label="Duración (min)" htmlFor="durationMin" error={state?.fieldErrors?.durationMin?.[0]}>
              <Input
                id="durationMin"
                name="durationMin"
                type="number"
                min={10}
                max={480}
                step={5}
                required
                defaultValue={service.durationMin}
              />
            </Field>
            <Field label="Buffer entre citas (min)" htmlFor="bufferMin" error={state?.fieldErrors?.bufferMin?.[0]}>
              <Input
                id="bufferMin"
                name="bufferMin"
                type="number"
                min={0}
                max={120}
                step={5}
                defaultValue={service.bufferMin}
              />
            </Field>
            <Field label="Descripción" htmlFor="description" error={state?.fieldErrors?.description?.[0]} className="sm:col-span-2">
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={service.description}
                placeholder="Qué incluye el servicio, técnica, productos…"
              />
            </Field>
            <Field
              label="Imagen (URL)"
              htmlFor="imageUrl"
              error={state?.fieldErrors?.imageUrl?.[0]}
              hint="Opcional. Unsplash o imagen propia."
              className="sm:col-span-2"
            >
              <Input id="imageUrl" name="imageUrl" type="url" defaultValue={service.imageUrl} placeholder="https://…" />
            </Field>
            <Field label="Orden" htmlFor="displayOrder" error={state?.fieldErrors?.displayOrder?.[0]}>
              <Input id="displayOrder" name="displayOrder" type="number" min={0} defaultValue={service.displayOrder} />
            </Field>
            <label className="flex items-center gap-2 self-end rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-stone-300">
              <input
                type="checkbox"
                name="active"
                defaultChecked={service.active}
                className="h-4 w-4 accent-gold-500"
              />
              Servicio activo y visible
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-5 text-[10px] leading-relaxed text-stone-500">
          <p className="font-semibold text-gold-200">Cómo se agenda</p>
          <p className="mt-2">
            La duración define el bloque de la cita. El buffer agrega un margen de limpieza antes de
            la siguiente reserva. Los cambios aplican a reservas nuevas; las existentes conservan su
            horario.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <SubmitButton className="w-full">{service.id ? "Guardar servicio" : "Crear servicio"}</SubmitButton>
          <Link href="/admin/servicios" className={buttonClasses({ variant: "ghost", size: "md", className: "w-full" })}>
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
