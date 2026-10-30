"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Lock,
  Scissors,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Alert, Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { dayLabel, formatDateKeyLong, formatMoney, formatMoneyShort } from "@/lib/dates";

type ServiceOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMin: number;
  imageUrl: string | null;
  category: string;
};

type BarberOption = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  bio: string | null;
  imageUrl: string | null;
};

type Slot = { startAt: string; endAt: string; label: string };
type Day = {
  dateKey: string;
  weekday: number;
  closed: boolean;
  reason?: string;
  slots: Slot[];
};

type WizardSettings = {
  requirePayment: boolean;
  depositType: "NONE" | "PERCENT" | "FIXED";
  depositValue: number;
  minAdvanceMinutes: number;
  cancellationHours: number;
  businessName: string;
  currency: string;
  paymentProvider: "MOCK" | "NEONET";
};

const STEPS = ["Servicio", "Barbero", "Fecha y hora", "Tus datos", "Pago"] as const;

const PHONE_REGEX = /^(\+?502[\s-]?)?\d{4}[\s-]?\d{4}$/;

function computeDeposit(total: number, settings: WizardSettings): number {
  if (!settings.requirePayment || settings.depositType === "NONE") return 0;
  if (settings.depositType === "FIXED") return Math.min(settings.depositValue, total);
  return Math.round((total * Math.min(Math.max(settings.depositValue, 0), 100)) / 100);
}

export function BookingWizard({
  services,
  barbers,
  prefill,
  isLoggedIn,
  initialServiceSlug,
  initialBarberSlug,
  today,
  settings,
}: {
  services: ServiceOption[];
  barbers: BarberOption[];
  prefill: { name: string; email: string; phone: string };
  isLoggedIn: boolean;
  initialServiceSlug?: string;
  initialBarberSlug?: string;
  today: string;
  settings: WizardSettings;
}) {
  const router = useRouter();
  const initialService = services.find((s) => s.slug === initialServiceSlug);
  const initialBarber = barbers.find((b) => b.slug === initialBarberSlug);

  const [step, setStep] = useState(initialService && initialBarber ? 3 : initialService ? 2 : 1);
  const [serviceId, setServiceId] = useState(initialService?.id ?? "");
  const [barberId, setBarberId] = useState(initialBarber?.id ?? "");
  const [days, setDays] = useState<Day[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({
    name: prefill.name,
    email: prefill.email,
    phone: prefill.phone,
    notes: "",
    acceptPolicy: false,
  });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const barber = useMemo(() => barbers.find((b) => b.id === barberId), [barbers, barberId]);
  const total = service?.priceCents ?? 0;
  const deposit = computeDeposit(total, settings);
  const balance = Math.max(total - deposit, 0);
  const requiresPayment = settings.requirePayment && deposit > 0;

  const selectedDay = days.find((d) => d.dateKey === selectedDate);

  useEffect(() => {
    if (!serviceId || !barberId) return;
    const controller = new AbortController();
    setLoadingSlots(true);
    setSlotError(null);

    fetch(
      `/api/availability?serviceId=${encodeURIComponent(serviceId)}&barberId=${encodeURIComponent(barberId)}&from=${today}&days=21`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No pudimos cargar la disponibilidad");
        return data;
      })
      .then((data: { days: Day[] }) => {
        setDays(data.days);
        setSelectedDate((current) => {
          const currentDay = data.days.find((d) => d.dateKey === current);
          if (currentDay && !currentDay.closed && currentDay.slots.length > 0) return current;
          return data.days.find((d) => !d.closed && d.slots.length > 0)?.dateKey ?? null;
        });
        setSelectedSlot((current) => {
          if (!current) return null;
          const match = data.days
            .flatMap((d) => d.slots)
            .find((slot) => slot.startAt === current.startAt);
          return match ?? null;
        });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setSlotError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });

    return () => controller.abort();
  }, [serviceId, barberId, today]);

  const formErrors = {
    name: form.name.trim().length < 2 ? "Ingresa tu nombre completo" : "",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "" : "Ingresa un correo válido",
    phone: PHONE_REGEX.test(form.phone.trim()) ? "" : "Ingresa un teléfono válido (8 dígitos)",
    policy: form.acceptPolicy ? "" : "Debes aceptar la política de reserva",
  };

  function canContinue(): boolean {
    if (step === 1) return Boolean(serviceId);
    if (step === 2) return Boolean(barberId);
    if (step === 3) return Boolean(selectedSlot);
    if (step === 4)
      return !formErrors.name && !formErrors.email && !formErrors.phone && form.acceptPolicy;
    return true;
  }

  function next() {
    if (step === 4) setTouched(true);
    if (!canContinue()) return;
    if (step < 5) setStep(step + 1);
  }

  function back() {
    setSubmitError(null);
    if (step > 1) setStep(step - 1);
  }

  async function submit() {
    if (!service || !barber || !selectedSlot) return;
    setTouched(true);
    if (formErrors.name || formErrors.email || formErrors.phone || !form.acceptPolicy) {
      setStep(4);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          barberId: barber.id,
          startAt: selectedSlot.startAt,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          notes: form.notes.trim(),
          acceptPolicy: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setStep(3);
          setSelectedSlot(null);
          setSubmitError(data.error ?? "Ese horario ya no está disponible.");
          return;
        }
        throw new Error(data.error ?? "No pudimos crear tu reserva");
      }

      if (data.checkoutUrl) {
        setRedirecting(true);
        window.location.assign(data.checkoutUrl);
        return;
      }

      router.push(`/reserva/${data.code}?confirmada=1`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (redirecting) {
    return (
      <div className="card-dark flex flex-col items-center justify-center px-6 py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
        <p className="mt-5 font-display text-2xl">Te estamos llevando al pago seguro…</p>
        <p className="mt-2 text-sm text-stone-400">
          No cierres esta ventana. Serás redirigido a la pasarela de pagos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em]">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const done = number < step;
              const active = number === step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (number < step) setStep(number);
                  }}
                  disabled={number > step}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 border-b-2 pb-3 transition",
                    active
                      ? "border-gold-400 text-gold-300"
                      : done
                        ? "border-gold-500/30 text-stone-400 hover:text-gold-300"
                        : "border-white/10 text-stone-600",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                      active
                        ? "border-gold-400 bg-gold-400 text-ink-950"
                        : done
                          ? "border-gold-500/40 bg-gold-500/10 text-gold-300"
                          : "border-white/10 text-stone-600",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : number}
                  </span>
                  <span className="hidden sm:block">{label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-stone-500 sm:hidden">
            Paso {step} de 5 · {STEPS[step - 1]}
          </p>
        </div>

        <div className="card-dark p-5 sm:p-7">
          {step === 1 ? (
            <section className="animate-fade-in">
              <StepTitle
                eyebrow="Paso 1"
                title="¿Qué te vas a hacer hoy?"
                description="Selecciona el servicio. El precio y la duración se aplican automáticamente."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {services.map((item) => {
                  const selected = item.id === serviceId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setServiceId(item.id);
                        setSelectedSlot(null);
                        setSelectedDate(null);
                      }}
                      className={cn(
                        "group flex items-stretch gap-3 rounded-xl border p-3 text-left transition",
                        selected
                          ? "border-gold-500/60 bg-gold-500/[0.08] shadow-[0_0_0_1px_rgba(207,166,75,0.25)]"
                          : "border-white/10 bg-ink-900 hover:border-white/20 hover:bg-ink-800",
                      )}
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Scissors className="h-5 w-5 text-gold-500/50" />
                          </div>
                        )}
                        {selected ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/50">
                            <CheckCircle2 className="h-6 w-6 text-gold-300" />
                          </div>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-stone-100">{item.name}</p>
                          <span className="shrink-0 text-sm font-bold text-gold-300">
                            {formatMoneyShort(item.priceCents)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-500">
                          {item.description}
                        </p>
                        <p className="mt-2 flex items-center gap-1 text-[10px] text-stone-500">
                          <Clock className="h-3 w-3" />
                          {item.durationMin} min · {item.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="animate-fade-in">
              <StepTitle
                eyebrow="Paso 2"
                title="Elige a tu barbero"
                description="Cada barbero tiene su estilo y su agenda. Puedes cambiar de barbero más adelante."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {barbers.map((item) => {
                  const selected = item.id === barberId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setBarberId(item.id);
                        setSelectedSlot(null);
                        setSelectedDate(null);
                      }}
                      className={cn(
                        "group flex items-center gap-4 rounded-xl border p-3 text-left transition",
                        selected
                          ? "border-gold-500/60 bg-gold-500/[0.08]"
                          : "border-white/10 bg-ink-900 hover:border-white/20 hover:bg-ink-800",
                      )}
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-ink-800">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <UserRound className="h-6 w-6 text-gold-500/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-100">{item.name}</p>
                        <p className="text-[11px] text-gold-400/90">{item.title}</p>
                        <p className="mt-1 line-clamp-1 text-[11px] text-stone-500">{item.bio}</p>
                      </div>
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                          selected
                            ? "border-gold-400 bg-gold-400 text-ink-950"
                            : "border-white/15 text-transparent",
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="animate-fade-in">
              <StepTitle
                eyebrow="Paso 3"
                title="Fecha y hora"
                description="Los horarios ocupados se bloquean automáticamente. Hora de Guatemala (GMT-6)."
              />

              {slotError ? <Alert tone="error" className="mt-5">{slotError}</Alert> : null}

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                    Próximos 21 días
                  </p>
                  {loadingSlots ? (
                    <span className="flex items-center gap-2 text-[11px] text-stone-500">
                      <Spinner className="h-3 w-3" /> Cargando…
                    </span>
                  ) : null}
                </div>

                <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
                  {(days.length > 0 ? days : placeholderDays(today, 21)).map((day) => {
                    const info = dayLabel(day.dateKey);
                    const selected = day.dateKey === selectedDate;
                    const disabled = day.closed || day.slots.length === 0 || loadingSlots;
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDate(day.dateKey);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "flex w-[68px] shrink-0 flex-col items-center rounded-xl border px-2 py-3 transition",
                          selected
                            ? "border-gold-400 bg-gold-400 text-ink-950"
                            : disabled
                              ? "cursor-not-allowed border-white/5 bg-white/[0.015] text-stone-600"
                              : "border-white/10 bg-ink-900 text-stone-300 hover:border-gold-500/40",
                        )}
                      >
                        <span className="text-[10px] uppercase tracking-wide">{info.weekday}</span>
                        <span className="mt-1 font-display text-xl">{info.day}</span>
                        <span className="text-[9px] uppercase tracking-wide opacity-70">{info.month.slice(0, 3)}</span>
                        <span
                          className={cn(
                            "mt-1.5 h-1 w-1 rounded-full",
                            selected ? "bg-ink-950" : disabled ? "bg-transparent" : "bg-emerald-400",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                {loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-11 animate-pulse rounded-lg bg-white/5" />
                    ))}
                  </div>
                ) : selectedDay && selectedDay.slots.length > 0 ? (
                  <>
                    <p className="mb-3 text-xs text-stone-400">
                      {formatDateKeyLong(selectedDay.dateKey)} ·{" "}
                      <span className="text-gold-300">{selectedDay.slots.length} horarios</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {selectedDay.slots.map((slot) => {
                        const selected = selectedSlot?.startAt === slot.startAt;
                        return (
                          <button
                            key={slot.startAt}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "h-11 rounded-lg border text-xs font-medium transition",
                              selected
                                ? "border-gold-400 bg-gold-400 text-ink-950"
                                : "border-white/10 bg-ink-900 text-stone-300 hover:border-gold-500/50 hover:text-gold-200",
                            )}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                    <CalendarDays className="mx-auto h-6 w-6 text-stone-600" />
                    <p className="mt-3 text-sm text-stone-400">
                      {selectedDate ? "No hay horarios disponibles este día." : "Selecciona un día disponible."}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      Prueba con otra fecha o elige otro barbero.
                    </p>
                  </div>
                )}
              </div>

              <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-stone-500">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
                Reserva con al menos {Math.round(settings.minAdvanceMinutes / 60)} horas de anticipación.
                Tu horario queda bloqueado al confirmar el pago.
              </p>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="animate-fade-in">
              <StepTitle
                eyebrow="Paso 4"
                title="Tus datos"
                description="Usaremos estos datos para confirmar tu cita y enviarte el comprobante."
              />

              {isLoggedIn ? (
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sesión iniciada. Puedes editar los datos si lo necesitas.
                </div>
              ) : (
                <div className="mt-5 text-[11px] text-stone-500">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/ingresar?callbackUrl=/reservar" className="link-gold">
                    Inicia sesión
                  </Link>{" "}
                  para autocompletar tus datos.
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="label-dark">Nombre completo *</label>
                  <input
                    id="name"
                    className="input-dark"
                    value={form.name}
                    autoComplete="name"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                  {touched && formErrors.name ? (
                    <p className="mt-1.5 text-xs text-red-400">{formErrors.name}</p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="email" className="label-dark">Correo electrónico *</label>
                  <input
                    id="email"
                    type="email"
                    className="input-dark"
                    value={form.email}
                    autoComplete="email"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="tu@correo.com"
                  />
                  {touched && formErrors.email ? (
                    <p className="mt-1.5 text-xs text-red-400">{formErrors.email}</p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="phone" className="label-dark">Teléfono / WhatsApp *</label>
                  <input
                    id="phone"
                    type="tel"
                    className="input-dark"
                    value={form.phone}
                    autoComplete="tel"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="5555 1234"
                  />
                  {touched && formErrors.phone ? (
                    <p className="mt-1.5 text-xs text-red-400">{formErrors.phone}</p>
                  ) : null}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="label-dark">Notas para tu barbero (opcional)</label>
                  <textarea
                    id="notes"
                    className="input-dark min-h-24 resize-y"
                    value={form.notes}
                    maxLength={500}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ej. Quiero un fade bajo con línea marcada."
                  />
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <input
                  type="checkbox"
                  checked={form.acceptPolicy}
                  onChange={(e) => setForm({ ...form, acceptPolicy: e.target.checked })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#cfa64b]"
                />
                <span className="text-[11px] leading-relaxed text-stone-400">
                  Acepto la política de reserva y cancelación. Puedo cancelar sin costo hasta{" "}
                  {settings.cancellationHours} horas antes. Entiendo que el anticipo asegura mi
                  horario y se aplica al total del servicio.
                </span>
              </label>
              {touched && !form.acceptPolicy ? (
                <p className="mt-1.5 text-xs text-red-400">{formErrors.policy}</p>
              ) : null}
            </section>
          ) : null}

          {step === 5 ? (
            <section className="animate-fade-in">
              <StepTitle
                eyebrow="Paso 5"
                title="Confirma y paga"
                description="Revisa tu reserva. Al confirmar, te llevaremos a la pasarela segura de pagos."
              />

              <div className="mt-6 space-y-3">
                <SummaryRow label="Servicio" value={service?.name ?? "—"} />
                <SummaryRow label="Barbero" value={barber?.name ?? "—"} />
                <SummaryRow
                  label="Fecha"
                  value={selectedSlot ? formatDateKeyLong(selectedDate ?? today) : "—"}
                />
                <SummaryRow label="Hora" value={selectedSlot?.label ?? "—"} />
                <SummaryRow label="Duración" value={`${service?.durationMin ?? 0} minutos`} />
                <SummaryRow label="Cliente" value={form.name} />
                <SummaryRow label="Correo" value={form.email} />
                <SummaryRow label="Teléfono" value={form.phone} />
                {form.notes ? <SummaryRow label="Notas" value={form.notes} /> : null}
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-ink-900 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">Total del servicio</span>
                  <span className="font-semibold text-stone-100">{formatMoney(total)}</span>
                </div>
                {requiresPayment ? (
                  <>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-stone-400">
                        Anticipo a pagar ahora
                        {settings.depositType === "PERCENT" ? ` (${settings.depositValue}%)` : ""}
                      </span>
                      <span className="font-semibold text-gold-300">{formatMoney(deposit)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-stone-500">Saldo en el local</span>
                      <span className="text-stone-400">{formatMoney(balance)}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-stone-500">
                    No se requiere pago en línea. Pagas directamente en la barbería.
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold-500/20 bg-gold-500/[0.05] p-4">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <p className="text-[11px] leading-relaxed text-gold-100/75">
                  Pago procesado por una pasarela certificada. Navaja nunca almacena el número
                  completo de tu tarjeta ni el CVV. La cita se confirma únicamente cuando la pasarela
                  verifica el pago.
                </p>
              </div>

              {settings.paymentProvider === "MOCK" ? (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-[11px] text-amber-200/90">
                  Modo demostración activo: el pago se simula en un entorno de pruebas y no se cobra
                  dinero real.
                </div>
              ) : null}

              {submitError ? <Alert tone="error" className="mt-4">{submitError}</Alert> : null}
            </section>
          ) : null}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/5 pt-6">
            <button
              type="button"
              onClick={back}
              disabled={step === 1 || submitting}
              className={cn(
                "inline-flex items-center gap-2 text-xs font-medium text-stone-400 transition hover:text-white disabled:opacity-30",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Atrás
            </button>

            {step < 5 ? (
              <Button type="button" onClick={next} disabled={!canContinue() && step !== 4}>
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={submit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando…
                  </>
                ) : requiresPayment ? (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pagar {formatMoney(deposit)} y confirmar
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmar reserva
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary sidebar */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-850">
          <div className="border-b border-white/5 bg-gradient-to-br from-gold-500/10 to-transparent px-5 py-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold-400">Tu reserva</p>
            <p className="mt-1 font-display text-lg text-stone-100">{settings.businessName}</p>
          </div>

          <div className="space-y-4 px-5 py-5">
            <SidebarRow icon={<Scissors className="h-3.5 w-3.5" />} label="Servicio">
              {service ? (
                <span className="text-stone-200">
                  {service.name}
                  <span className="mt-0.5 block text-[10px] text-stone-500">
                    {service.durationMin} min
                  </span>
                </span>
              ) : (
                <span className="text-stone-600">Por elegir</span>
              )}
            </SidebarRow>

            <SidebarRow icon={<UserRound className="h-3.5 w-3.5" />} label="Barbero">
              {barber ? (
                <span className="text-stone-200">{barber.name}</span>
              ) : (
                <span className="text-stone-600">Por elegir</span>
              )}
            </SidebarRow>

            <SidebarRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Fecha y hora">
              {selectedSlot ? (
                <span className="text-stone-200">
                  {formatDateKeyLong(selectedDate ?? today)}
                  <span className="mt-0.5 block text-[11px] text-gold-300">{selectedSlot.label}</span>
                </span>
              ) : (
                <span className="text-stone-600">Por elegir</span>
              )}
            </SidebarRow>
          </div>

          <div className="border-t border-white/5 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-400">Total</span>
              <span className="font-semibold text-stone-100">{service ? formatMoney(total) : "—"}</span>
            </div>
            {requiresPayment && service ? (
              <>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Anticipo</span>
                  <span className="text-gold-300">{formatMoney(deposit)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Saldo en local</span>
                  <span className="text-stone-400">{formatMoney(balance)}</span>
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-2.5 border-t border-white/5 px-5 py-4">
            <p className="flex items-center gap-2 text-[10px] text-stone-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Pago cifrado y verificado por webhook
            </p>
            <p className="flex items-center gap-2 text-[10px] text-stone-500">
              <Lock className="h-3.5 w-3.5 text-gold-500" />
              No almacenamos datos de tu tarjeta
            </p>
            <p className="flex items-center gap-2 text-[10px] text-stone-500">
              <ChevronRight className="h-3.5 w-3.5 text-gold-500" />
              Cancelación gratuita hasta {settings.cancellationHours} h antes
            </p>
          </div>
        </div>

        <p className="mt-4 px-1 text-[10px] leading-relaxed text-stone-600">
          Al confirmar aceptas nuestras políticas. Recibirás la confirmación por correo y un
          recordatorio antes de tu cita.
        </p>
      </aside>
    </div>
  );
}

function StepTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl">{title}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{description}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 text-sm last:border-0">
      <span className="text-stone-500">{label}</span>
      <span className="max-w-[60%] text-right text-stone-200">{value}</span>
    </div>
  );
}

function SidebarRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-900 text-gold-400">
        {icon}
      </span>
      <div className="min-w-0 text-xs">
        <p className="text-[9px] uppercase tracking-[0.16em] text-stone-600">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function placeholderDays(today: string, count: number): Day[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + i);
    const dateKey = date.toISOString().slice(0, 10);
    return { dateKey, weekday: date.getDay(), closed: true, slots: [] };
  });
}
