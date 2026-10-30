"use client";

import { useActionState } from "react";
import { saveSettingsAction, type ActionState } from "@/app/admin/actions";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-controls";

export function SettingsForm({
  settings,
}: {
  settings: {
    businessName: string;
    tagline: string;
    description: string;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapsUrl: string;
    mapsEmbedUrl: string;
    instagram: string;
    facebook: string;
    requirePayment: boolean;
    depositType: string;
    depositValue: number;
    minAdvanceMinutes: number;
    maxAdvanceDays: number;
    cancellationHours: number;
    slotIntervalMin: number;
    paymentProvider: string;
  };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveSettingsAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
        <h3 className="text-sm font-semibold text-stone-200">Identidad del negocio</h3>
        <p className="mt-0.5 text-[10px] text-stone-600">Se muestra en el sitio, correos y comprobantes.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del negocio" htmlFor="businessName" error={state?.fieldErrors?.businessName?.[0]}>
            <Input id="businessName" name="businessName" defaultValue={settings.businessName} required />
          </Field>
          <Field label="Frase corta" htmlFor="tagline" error={state?.fieldErrors?.tagline?.[0]}>
            <Input id="tagline" name="tagline" defaultValue={settings.tagline} required />
          </Field>
          <Field label="Descripción" htmlFor="description" error={state?.fieldErrors?.description?.[0]} className="sm:col-span-2">
            <Textarea id="description" name="description" rows={3} defaultValue={settings.description} />
          </Field>
          <Field label="Teléfono" htmlFor="phone" error={state?.fieldErrors?.phone?.[0]}>
            <Input id="phone" name="phone" defaultValue={settings.phone} required />
          </Field>
          <Field label="WhatsApp (solo dígitos)" htmlFor="whatsapp" error={state?.fieldErrors?.whatsapp?.[0]}>
            <Input id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp} required />
          </Field>
          <Field label="Correo" htmlFor="email" error={state?.fieldErrors?.email?.[0]}>
            <Input id="email" name="email" type="email" defaultValue={settings.email} required />
          </Field>
          <Field label="Dirección" htmlFor="address" error={state?.fieldErrors?.address?.[0]}>
            <Input id="address" name="address" defaultValue={settings.address} required />
          </Field>
          <Field label="Google Maps (URL)" htmlFor="mapsUrl" error={state?.fieldErrors?.mapsUrl?.[0]}>
            <Input id="mapsUrl" name="mapsUrl" type="url" defaultValue={settings.mapsUrl} />
          </Field>
          <Field label="Google Maps embed (URL)" htmlFor="mapsEmbedUrl" error={state?.fieldErrors?.mapsEmbedUrl?.[0]}>
            <Input id="mapsEmbedUrl" name="mapsEmbedUrl" type="url" defaultValue={settings.mapsEmbedUrl} />
          </Field>
          <Field label="Instagram" htmlFor="instagram" error={state?.fieldErrors?.instagram?.[0]}>
            <Input id="instagram" name="instagram" type="url" defaultValue={settings.instagram} />
          </Field>
          <Field label="Facebook" htmlFor="facebook" error={state?.fieldErrors?.facebook?.[0]}>
            <Input id="facebook" name="facebook" type="url" defaultValue={settings.facebook} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
        <h3 className="text-sm font-semibold text-stone-200">Reservas y pagos</h3>
        <p className="mt-0.5 text-[10px] text-stone-600">
          Reglas que aplican a la disponibilidad pública y al checkout.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-stone-300 sm:col-span-2">
            <input
              type="checkbox"
              name="requirePayment"
              defaultChecked={settings.requirePayment}
              className="h-4 w-4 accent-gold-500"
            />
            Requerir anticipo para confirmar la cita
          </label>
          <Field label="Tipo de anticipo" htmlFor="depositType">
            <Select id="depositType" name="depositType" defaultValue={settings.depositType}>
              <option value="PERCENT">Porcentaje del servicio</option>
              <option value="FIXED">Monto fijo (centavos)</option>
              <option value="NONE">Sin anticipo</option>
            </Select>
          </Field>
          <Field label="Valor del anticipo" htmlFor="depositValue" hint="Porcentaje (0–100) o centavos si es fijo.">
            <Input id="depositValue" name="depositValue" type="number" min={0} defaultValue={settings.depositValue} />
          </Field>
          <Field label="Anticipación mínima (min)" htmlFor="minAdvanceMinutes" hint={`${Math.round(settings.minAdvanceMinutes / 60)} horas actualmente.`}>
            <Input id="minAdvanceMinutes" name="minAdvanceMinutes" type="number" min={0} defaultValue={settings.minAdvanceMinutes} />
          </Field>
          <Field label="Máximo de días al futuro" htmlFor="maxAdvanceDays">
            <Input id="maxAdvanceDays" name="maxAdvanceDays" type="number" min={1} max={365} defaultValue={settings.maxAdvanceDays} />
          </Field>
          <Field label="Cancelación sin costo (horas)" htmlFor="cancellationHours">
            <Input id="cancellationHours" name="cancellationHours" type="number" min={0} max={168} defaultValue={settings.cancellationHours} />
          </Field>
          <Field label="Intervalo de slots (min)" htmlFor="slotIntervalMin">
            <Input id="slotIntervalMin" name="slotIntervalMin" type="number" min={5} max={60} step={5} defaultValue={settings.slotIntervalMin} />
          </Field>
          <Field label="Pasarela de pago" htmlFor="paymentProvider" className="sm:col-span-2">
            <Select id="paymentProvider" name="paymentProvider" defaultValue={settings.paymentProvider}>
              <option value="MOCK">MOCK — pruebas locales</option>
              <option value="NEONET">NEONET — producción (requiere credenciales)</option>
            </Select>
          </Field>
        </div>
      </section>

      <SubmitButton>Guardar configuración</SubmitButton>
    </form>
  );
}
