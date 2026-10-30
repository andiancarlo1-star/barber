import type { PaymentProvider as ProviderEnum } from "@prisma/client";

export type PaymentIntent = {
  paymentId: string;
  appointmentId: string;
  externalId: string;
  amountCents: number;
  currency: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export type CheckoutResult = {
  checkoutUrl: string;
  providerRef?: string;
  provider: ProviderEnum;
};

export type ParsedWebhook = {
  eventId: string;
  externalId: string;
  status: "PAID" | "FAILED" | "PENDING" | "REFUNDED";
  amountCents?: number;
  currency?: string;
  cardBrand?: string;
  cardLast4?: string;
  authorizationCode?: string;
  providerRef?: string;
  rawStatus?: string;
  failureReason?: string;
  raw: unknown;
};

export type WebhookRequest = {
  rawBody: string;
  headers: Headers;
  url: string;
};

export interface PaymentProviderAdapter {
  id: ProviderEnum;
  label: string;
  isConfigured(): boolean;
  createCheckout(intent: PaymentIntent): Promise<CheckoutResult>;
  verifyWebhook(request: WebhookRequest): boolean;
  parseWebhook(request: WebhookRequest): ParsedWebhook | null;
}

export class PaymentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConfigError";
  }
}
