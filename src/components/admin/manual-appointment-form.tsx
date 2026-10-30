"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CalendarPlus, UserRound } from "lucide-react";
import { createManualAppointmentAction, type ActionState } from "@/app/admin/actions";
import { Alert, Field, Input, Select, Textarea, buttonClasses } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-controls";

type Option = { id: string; name: string; meta: string };

export function ManualAppointmentForm({
  services,
  barbers,
  today,
}: {
  services: Option[];
  barbers: Option[];
  today: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createManualAppointmentAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {state?.error ? <Alert tone="error">{state.error}</Alert> : null}

        <div className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-stone-200">
            <CalendarPlus className="h-4 w-4 text-gold-500" />
            Servicio y horario
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Servicio" htmlFor="serviceId" error={state?.fieldErrors?.serviceId?.[0]} className="sm:col-span-2">
              <Select id="serviceId" name="serviceId" required defaultValue="">
                <option value="" disabled>
                  Selecciona un servicio
                </option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {service.meta}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Barbero" htmlFor="barberId" error={state?.fieldErrors?.barberId?.[0]}>
              <Select id="barberId" name="barberId" required defaultValue="">
                <option value="" disabled>
                  Selecciona un barbero
                </option>
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name} — {barber.meta}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" htmlFor="date" error={state?.fieldErrors?.date?.[0]}>
                <Input id="date" name="date" type="date" required defaultValue={today} min={today} />
              </Field>
              <Field label="Hora" htmlFor="time" error={state?.fieldErrors?.time?.[0]}>
                <Input id="time" name="time" type="time" required defaultValue="10:00" step={900} />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
          <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-stone-200">
            <UserRound className="h-4 w-4 text-gold-500" />
            Datos del cliente
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" htmlFor="name" error={state?.fieldErrors?.name?.[0]}>
              <Input id="name" name="name" required placeholder="Ej. Juan Pérez" />
            </Field>
            <Field label="Teléfono" htmlFor="phone" error={state?.fieldErrors?.phone?.[0]}>
              <Input id="phone" name="phone" type="tel" required placeholder="5555 1234" />
            </Field>
            <Field label="Correo" htmlFor="email" error={state?.fieldErrors?.email?.[0]} className="sm:col-span-2">
              <Input id="email" name="email" type="email" required placeholder="cliente@correo.com" />
            </Field>
            <Field label="Notas" htmlFor="notes" error={state?.fieldErrors?.notes?.[0]} className="sm:col-span-2">
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Preferencias, alergias, referencia del corte…"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-5">
          <p className="text-xs font-semibold text-gold-200">Estado inicial</p>
          <div className="mt-3">
            <Field label="Estado" htmlFor="status">
              <Select id="status" name="status" defaultValue="CONFIRMED">
                <option value="CONFIRMED">Confirmada (cobro en local)</option>
                <option value="COMPLETED">Completada (cobro en local)</option>
              </Select>
            </Field>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-stone-500">
            Las citas creadas manualmente no pasan por la pasarela. El monto total queda registrado
            para cobro en el local.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-ink-850/60 p-5 text-[10px] leading-relaxed text-stone-500">
          <p className="font-semibold text-stone-300">Verificaciones automáticas</p>
          <ul className="mt-2 space-y-1.5">
            <li>· Choque con otras citas del barbero</li>
            <li>· Bloqueos y vacaciones</li>
            <li>· Horario de atención del negocio</li>
            <li>· Duración y buffer del servicio</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <SubmitButton className="w-full" pendingLabel="Creando cita…">
            Crear cita
          </SubmitButton>
          <Link href="/admin/citas" className={buttonClasses({ variant: "ghost", size: "md", className: "w-full" })}>
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  );
}
