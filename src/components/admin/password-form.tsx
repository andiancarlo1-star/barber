"use client";

import { useActionState } from "react";
import { changePasswordAction, type ActionState } from "@/app/admin/actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-controls";

export function PasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(changePasswordAction, null);
  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Field label="Contraseña actual" htmlFor="currentPassword">
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="Nueva contraseña" htmlFor="newPassword" hint="Mínimo 8 caracteres.">
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="Confirmar nueva contraseña" htmlFor="confirmPassword">
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <SubmitButton variant="dark" size="sm" className="w-full">
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}
