"use client";

import { useActionState } from "react";
import { saveBusinessSchedulesAction, type ActionState } from "@/app/admin/actions";
import { WEEKDAYS_ES } from "@/lib/constants";
import { minutesToInput } from "@/lib/dates";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/admin/form-controls";

export function BusinessScheduleForm({
  schedules,
}: {
  schedules: Array<{
    weekday: number;
    openMinute: number;
    closeMinute: number;
    breakStartMinute: number | null;
    breakEndMinute: number | null;
    active: boolean;
  }>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveBusinessSchedulesAction,
    null,
  );
  const byDay = new Map(schedules.map((schedule) => [schedule.weekday, schedule]));

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[11px]">
          <thead className="border-b border-white/5 text-[8px] uppercase tracking-wide text-stone-600">
            <tr>
              <th className="py-2 pr-3 font-medium">Día</th>
              <th className="py-2 pr-3 font-medium">Apertura</th>
              <th className="py-2 pr-3 font-medium">Cierre</th>
              <th className="py-2 pr-3 font-medium">Descanso</th>
              <th className="py-2 pr-3 font-medium">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {WEEKDAYS_ES.map((label, weekday) => {
              const schedule = byDay.get(weekday);
              return (
                <tr key={weekday}>
                  <td className="py-2 pr-3 text-stone-300">{label}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      name={`open-${weekday}`}
                      defaultValue={minutesToInput(schedule?.openMinute ?? 540)}
                      step={900}
                      className="input-dark h-8 w-24 py-0 text-[11px]"
                      aria-label={`Apertura ${label}`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      name={`close-${weekday}`}
                      defaultValue={minutesToInput(schedule?.closeMinute ?? 1140)}
                      step={900}
                      className="input-dark h-8 w-24 py-0 text-[11px]"
                      aria-label={`Cierre ${label}`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        name={`breakStart-${weekday}`}
                        defaultValue={schedule?.breakStartMinute != null ? minutesToInput(schedule.breakStartMinute) : ""}
                        step={900}
                        className="input-dark h-8 w-20 py-0 text-[10px]"
                        aria-label={`Inicio descanso ${label}`}
                      />
                      <span className="text-[9px] text-stone-600">–</span>
                      <input
                        type="time"
                        name={`breakEnd-${weekday}`}
                        defaultValue={schedule?.breakEndMinute != null ? minutesToInput(schedule.breakEndMinute) : ""}
                        step={900}
                        className="input-dark h-8 w-20 py-0 text-[10px]"
                        aria-label={`Fin descanso ${label}`}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      name={`active-${weekday}`}
                      defaultChecked={schedule?.active ?? weekday !== 0}
                      className="h-4 w-4 accent-gold-500"
                      aria-label={`Activo ${label}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SubmitButton size="sm">Guardar horarios</SubmitButton>
    </form>
  );
}
