import { addMinutes } from "date-fns";
import type { Appointment, BarberSchedule, Schedule, Service } from "@prisma/client";
import { prisma } from "./prisma";
import { getSettings, type SettingsLike } from "./settings";
import {
  addDaysToKey,
  calendarDays,
  minutesToTimeLabel,
  todayKey,
  weekdayOfKey,
  zonedToUtc,
} from "./dates";
import { ACTIVE_APPOINTMENT_STATUSES } from "./constants";

export type Slot = {
  startAt: string;
  endAt: string;
  label: string;
};

export type DayAvailability = {
  dateKey: string;
  weekday: number;
  closed: boolean;
  reason?: string;
  slots: Slot[];
};

type Interval = { start: number; end: number };

function subtractBreak(intervals: Interval[], breakStart?: number | null, breakEnd?: number | null): Interval[] {
  if (breakStart == null || breakEnd == null || breakEnd <= breakStart) return intervals;
  const result: Interval[] = [];
  for (const interval of intervals) {
    if (breakEnd <= interval.start || breakStart >= interval.end) {
      result.push(interval);
      continue;
    }
    if (breakStart > interval.start) result.push({ start: interval.start, end: breakStart });
    if (breakEnd < interval.end) result.push({ start: breakEnd, end: interval.end });
  }
  return result;
}

function barberIntervals(
  business: Schedule,
  barberSchedules: BarberSchedule[],
): Interval[] {
  const base: Interval = {
    start: business.openMinute,
    end: business.closeMinute,
  };
  const segments =
    barberSchedules.length > 0
      ? barberSchedules.map((s) => ({ start: s.startMinute, end: s.endMinute }))
      : [base];

  const clipped = segments
    .map((s) => ({
      start: Math.max(s.start, business.openMinute),
      end: Math.min(s.end, business.closeMinute),
    }))
    .filter((s) => s.end > s.start);

  return subtractBreak(clipped, business.breakStartMinute, business.breakEndMinute).sort(
    (a, b) => a.start - b.start,
  );
}

export async function getAvailabilityRange(options: {
  service: Pick<Service, "id" | "durationMin" | "bufferMin">;
  barberId: string;
  fromKey?: string;
  days?: number;
  settings?: SettingsLike;
  excludeAppointmentId?: string;
}): Promise<DayAvailability[]> {
  const settings = options.settings ?? (await getSettings());
  const fromKey = options.fromKey ?? todayKey();
  const days = Math.min(Math.max(options.days ?? 14, 1), 31);
  const dateKeys = calendarDays(fromKey, days);

  const rangeStart = zonedToUtc(dateKeys[0], 0);
  const rangeEnd = zonedToUtc(addDaysToKey(dateKeys[dateKeys.length - 1], 1), 0);

  const [schedules, barberSchedules, blocks, appointments] = await Promise.all([
    prisma.schedule.findMany({ where: { active: true } }),
    prisma.barberSchedule.findMany({
      where: { barberId: options.barberId, active: true },
      orderBy: { startMinute: "asc" },
    }),
    prisma.availability.findMany({
      where: {
        OR: [{ barberId: options.barberId }, { barberId: null }],
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
      },
    }),
    prisma.appointment.findMany({
      where: {
        barberId: options.barberId,
        status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        startAt: { lt: rangeEnd },
        endAt: { gt: rangeStart },
        ...(options.excludeAppointmentId ? { id: { not: options.excludeAppointmentId } } : {}),
      },
    }),
  ]);

  const now = new Date();
  const minStart = addMinutes(now, settings.minAdvanceMinutes);
  const maxKey = addDaysToKey(todayKey(), settings.maxAdvanceDays);
  const step = Math.max(5, settings.slotIntervalMin);

  return dateKeys.map((dateKey) => {
    const weekday = weekdayOfKey(dateKey);
    const business = schedules.find((s) => s.weekday === weekday);

    if (!business) {
      return { dateKey, weekday, closed: true, reason: "Cerrado", slots: [] };
    }
    if (dateKey > maxKey) {
      return {
        dateKey,
        weekday,
        closed: true,
        reason: `Reservas hasta ${settings.maxAdvanceDays} días de anticipación`,
        slots: [],
      };
    }

    const dayBlocks = blocks.filter((b) => {
      if (b.allDay) {
        const blockKey = b.startAt.toISOString().slice(0, 10);
        return blockKey === dateKey || (b.startAt < zonedToUtc(dateKey, 0) && b.endAt > zonedToUtc(dateKey, 0));
      }
      return b.startAt < zonedToUtc(dateKey, 24 * 60) && b.endAt > zonedToUtc(dateKey, 0);
    });

    const daySchedules = barberSchedules.filter((s) => s.weekday === weekday);
    const intervals = barberIntervals(business, daySchedules);

    const dayAppointments = appointments.filter(
      (a) => a.startAt < zonedToUtc(dateKey, 24 * 60) && a.endAt > zonedToUtc(dateKey, 0),
    );

    const slots: Slot[] = [];

    for (const interval of intervals) {
      for (let minute = interval.start; minute + options.service.durationMin <= interval.end; minute += step) {
        const start = zonedToUtc(dateKey, minute);
        const end = zonedToUtc(dateKey, minute + options.service.durationMin);

        if (start < minStart) continue;

        const blocked = dayBlocks.some((block) => {
          if (block.allDay) return true;
          return block.startAt < end && block.endAt > start;
        });
        if (blocked) continue;

        const overlaps = dayAppointments.some((appointment) => {
          const busyEnd = addMinutes(appointment.endAt, 5);
          const paddedStart = start;
          const paddedEnd = addMinutes(end, options.service.bufferMin);
          return paddedStart < busyEnd && paddedEnd > appointment.startAt;
        });
        if (overlaps) continue;

        slots.push({
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          label: minutesToTimeLabel(minute),
        });
      }
    }

    if (slots.length === 0) {
      const reason = dayBlocks.length > 0 ? "No disponible" : "Sin horarios disponibles";
      return { dateKey, weekday, closed: true, reason, slots: [] };
    }

    return { dateKey, weekday, closed: false, slots };
  });
}

export async function isSlotFree(options: {
  barberId: string;
  startAt: Date;
  endAt: Date;
  bufferMin?: number;
  excludeAppointmentId?: string;
  db?: Pick<typeof prisma, "appointment" | "availability">;
}): Promise<boolean> {
  const { barberId, startAt, endAt, bufferMin = 0, excludeAppointmentId } = options;
  const db = options.db ?? prisma;

  const [overlap, block] = await Promise.all([
    db.appointment.findFirst({
      where: {
        barberId,
        status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
        startAt: { lt: addMinutes(endAt, bufferMin) },
        endAt: { gt: startAt },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { id: true },
    }),
    db.availability.findFirst({
      where: {
        OR: [{ barberId }, { barberId: null }],
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true },
    }),
  ]);
  return !overlap && !block;
}

export async function getAvailableSlotsForDate(options: {
  service: Pick<Service, "id" | "durationMin" | "bufferMin">;
  barberId: string;
  dateKey: string;
  excludeAppointmentId?: string;
}): Promise<Slot[]> {
  const days = await getAvailabilityRange({
    service: options.service,
    barberId: options.barberId,
    fromKey: options.dateKey,
    days: 1,
    excludeAppointmentId: options.excludeAppointmentId,
  });
  return days[0]?.slots ?? [];
}

export function nextAvailableDate(days: DayAvailability[]): string | null {
  return days.find((day) => !day.closed && day.slots.length > 0)?.dateKey ?? null;
}

export type { Appointment };
