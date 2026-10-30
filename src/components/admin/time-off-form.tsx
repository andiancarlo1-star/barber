import { todayKey } from "@/lib/dates";
import { createTimeOffAction } from "@/app/admin/actions";
import { Field, Input, Select, Textarea, buttonClasses } from "@/components/ui";

export function TimeOffForm({
  barbers,
  defaultBarberId,
  redirectTo,
  lockBarber = false,
}: {
  barbers: Array<{ id: string; name: string }>;
  defaultBarberId?: string;
  redirectTo: string;
  lockBarber?: boolean;
}) {
  return (
    <form action={createTimeOffAction} className="space-y-3">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {lockBarber && defaultBarberId ? (
        <input type="hidden" name="barberId" value={defaultBarberId} />
      ) : (
        <Field label="Barbero" htmlFor="barberId">
          <Select id="barberId" name="barberId" defaultValue={defaultBarberId ?? ""}>
            <option value="">Todo el equipo (global)</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Desde" htmlFor="startDate">
          <Input id="startDate" name="startDate" type="date" required defaultValue={todayKey()} />
        </Field>
        <Field label="Hasta" htmlFor="endDate">
          <Input id="endDate" name="endDate" type="date" required defaultValue={todayKey()} />
        </Field>
      </div>
      <Field label="Tipo" htmlFor="type">
        <Select id="type" name="type" defaultValue="DAY_OFF">
          <option value="DAY_OFF">Día libre</option>
          <option value="VACATION">Vacaciones</option>
          <option value="BLOCK">Bloqueo puntual</option>
        </Select>
      </Field>
      <Field label="Motivo" htmlFor="reason">
        <Textarea id="reason" name="reason" rows={2} placeholder="Opcional, visible solo para el equipo" />
      </Field>
      <button type="submit" className={buttonClasses({ variant: "outline", size: "sm", className: "w-full" })}>
        Agregar bloqueo
      </button>
    </form>
  );
}
