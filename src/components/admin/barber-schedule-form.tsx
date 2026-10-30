import { WEEKDAYS_ES } from "@/lib/constants";
import { minutesToInput } from "@/lib/dates";
import { buttonClasses } from "@/components/ui";
import { saveBarberSchedulesAction } from "@/app/admin/actions";

export function BarberScheduleForm({
  barberId,
  redirectTo,
  schedules,
}: {
  barberId: string;
  redirectTo: string;
  schedules: Array<{ weekday: number; startMinute: number; endMinute: number }>;
}) {
  const byDay = new Map(schedules.map((schedule) => [schedule.weekday, schedule]));

  return (
    <form action={saveBarberSchedulesAction} className="space-y-3">
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-2">
        {WEEKDAYS_ES.map((label, weekday) => {
          const schedule = byDay.get(weekday);
          return (
            <div
              key={weekday}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <label className="flex w-28 items-center gap-2 text-[11px] text-stone-300">
                <input
                  type="checkbox"
                  name={`active-${weekday}`}
                  defaultChecked={Boolean(schedule)}
                  className="h-3.5 w-3.5 accent-gold-500"
                />
                {label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  name={`start-${weekday}`}
                  defaultValue={minutesToInput(schedule?.startMinute ?? 540)}
                  step={900}
                  className="input-dark h-8 w-28 py-0 text-[11px]"
                  aria-label={`Inicio ${label}`}
                />
                <span className="text-[10px] text-stone-600">a</span>
                <input
                  type="time"
                  name={`end-${weekday}`}
                  defaultValue={minutesToInput(schedule?.endMinute ?? 1140)}
                  step={900}
                  className="input-dark h-8 w-28 py-0 text-[11px]"
                  aria-label={`Fin ${label}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button type="submit" className={buttonClasses({ variant: "dark", size: "sm", className: "w-full" })}>
        Guardar horario semanal
      </button>
      <p className="text-[9px] leading-relaxed text-stone-600">
        El horario del barbero se recorta al horario del negocio y respeta el descanso configurado.
      </p>
    </form>
  );
}
