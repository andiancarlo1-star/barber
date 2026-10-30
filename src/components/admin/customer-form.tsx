"use client";

import { useActionState } from "react";
import { saveCustomerAction, type ActionState } from "@/app/admin/actions";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-controls";

export function CustomerForm({
  customer,
}: {
  customer: { id: string; name: string; email: string; phone: string; notes: string | null };
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveCustomerAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={customer.id} />
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Field label="Nombre" htmlFor="name" error={state?.fieldErrors?.name?.[0]}>
        <Input id="name" name="name" defaultValue={customer.name} required />
      </Field>
      <Field label="Correo" htmlFor="email" error={state?.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" defaultValue={customer.email} required />
      </Field>
      <Field label="Teléfono" htmlFor="phone" error={state?.fieldErrors?.phone?.[0]}>
        <Input id="phone" name="phone" type="tel" defaultValue={customer.phone} required />
      </Field>
      <Field label="Notas del cliente" htmlFor="notes" error={state?.fieldErrors?.notes?.[0]}>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={customer.notes ?? ""}
          placeholder="Preferencias, alergias, historial…"
        />
      </Field>
      <SubmitButton variant="dark" size="sm" className="w-full">
        Guardar cambios
      </SubmitButton>
    </form>
  );
}
