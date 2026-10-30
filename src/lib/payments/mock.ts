import { createHmac, timingSafeEqual } from "crypto";
import type { PaymentProviderAdapter, PaymentIntent, CheckoutResult, WebhookRequest, ParsedWebhook } from "./types";

export const mockProvider: PaymentProviderAdapter = {
  id: "MOCK",
  label: "Simulador de pagos (solo desarrollo)",
  isConfigured() {
    return true;
  },
  async createCheckout(intent: PaymentIntent): Promise<CheckoutResult> {
    return {
      checkoutUrl: `/pago/mock/${intent.paymentId}`,
      providerRef: `MOCK-${intent.paymentId}`,
      provider: "MOCK",
    };
  },
  verifyWebhook(request: WebhookRequest): boolean {
    const secret = process.env.AUTH_SECRET || "";
    const signature = request.headers.get("x-mock-signature") || "";
    if (!secret || !signature) return false;
    const expected = createHmac("sha256", secret).update(request.rawBody).digest("hex");
    return safeEqual(signature, expected);
  },
  parseWebhook(request: WebhookRequest): ParsedWebhook | null {
    try {
      const data = JSON.parse(request.rawBody) as Record<string, unknown>;
      const externalId = String(data.externalId ?? "");
      if (!externalId) return null;
      const approved = data.status === "PAID" || data.status === "APPROVED";
      return {
        eventId: String(data.eventId ?? `${externalId}-${Date.now()}`),
        externalId,
        status: approved ? "PAID" : "FAILED",
        amountCents: Number(data.amountCents ?? 0) || undefined,
        cardBrand: data.cardBrand ? String(data.cardBrand) : undefined,
        cardLast4: data.cardLast4 ? String(data.cardLast4) : undefined,
        authorizationCode: data.authorizationCode ? String(data.authorizationCode) : undefined,
        raw: data,
      };
    } catch {
      return null;
    }
  },
};

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}


