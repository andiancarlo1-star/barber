import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { BookingError, createAppointment } from "@/lib/appointments";
import { createCheckoutForAppointment, getPaymentProvider } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth-helpers";
import { setRlsContext } from "@/lib/rls";
import { clientIp, isSameOrigin } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const ip = clientIp(request);
  const limit = rateLimit(`booking:${ip}`, Number(process.env.BOOKING_RATE_LIMIT || 10), 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos de reserva. Espera unos minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa los datos ingresados", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  const provider = getPaymentProvider(settings.paymentProvider);

  if (settings.requirePayment && !provider.isConfigured()) {
    return NextResponse.json(
      {
        error:
          "El pago en línea aún no está habilitado. Escríbenos por WhatsApp para completar tu reserva.",
      },
      { status: 503 },
    );
  }

  const sessionUser = await getSessionUser();
  setRlsContext({ role: "SYSTEM" });

  try {
    const result = await createAppointment({
      serviceId: parsed.data.serviceId,
      barberId: parsed.data.barberId,
      startAt: parsed.data.startAt,
      customer: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        notes: parsed.data.notes || null,
      },
      notes: parsed.data.notes || null,
      userId: sessionUser?.id ?? null,
      createdById: sessionUser?.id ?? null,
      enforceAdvance: true,
    });

    let checkoutUrl: string | null = null;
    let paymentError: string | null = null;

    if (result.requiresPayment) {
      try {
        const checkout = await createCheckoutForAppointment(result.appointment.id, settings);
        checkoutUrl = checkout.checkoutUrl;
      } catch (error) {
        paymentError =
          error instanceof Error ? error.message : "No se pudo iniciar el pago en línea";
        await logAudit({
          userId: sessionUser?.id ?? null,
          action: "PAYMENT_CHECKOUT_FAILED",
          entity: "Appointment",
          entityId: result.appointment.id,
          metadata: { message: paymentError },
          ip,
        });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        code: result.appointment.code,
        requiresPayment: result.requiresPayment,
        totalCents: result.appointment.totalCents,
        amountDueCents: result.appointment.amountDueCents,
        checkoutUrl,
        paymentError,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[booking]", error);
    return NextResponse.json(
      { error: "No pudimos crear tu reserva. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
