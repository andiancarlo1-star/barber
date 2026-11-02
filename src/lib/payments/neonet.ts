import { createHmac } from "crypto";
import type { PaymentProviderAdapter, PaymentIntent, CheckoutResult, WebhookRequest, ParsedWebhook } from "./types";
import { PaymentConfigError } from "./types";
import { safeEqual } from "./mock";
import { absoluteUrl } from "../utils";

export type NeonetConfig = {
  apiBase: string;
  checkoutUrl: string;
  affiliation: string;
  terminal: string;
  merchantId: string;
  signingKey: string;
  webhookSecret: string;
};

export function getNeonetConfig(): NeonetConfig {
  const checkoutUrl = process.env.NEONET_CHECKOUT_URL || "";
  const affiliation = process.env.NEONET_AFFILIATION || "";
  const terminal = process.env.NEONET_TERMINAL || "";
  const signingKey = process.env.NEONET_SIGNING_KEY || "";
  const webhookSecret = process.env.NEONET_WEBHOOK_SECRET || "";

  if (!checkoutUrl || !affiliation || !terminal || !signingKey || !webhookSecret) {
    throw new PaymentConfigError(
      "NeoNet no está configurado. Completa NEONET_CHECKOUT_URL, NEONET_AFFILIATION, NEONET_TERMINAL, NEONET_SIGNING_KEY y NEONET_WEBHOOK_SECRET. Consulta el README para el proceso de afiliación y certificación.",
    );
  }

  return {
    apiBase: process.env.NEONET_API_BASE || "https://epayserver.neonet.com.gt",
    checkoutUrl,
    affiliation,
    terminal,
    merchantId: process.env.NEONET_MERCHANT_ID || "",
    signingKey,
    webhookSecret,
  };
}

export function signNeonetFields(input: {
  affiliation: string;
  terminal: string;
  externalId: string;
  amountCents: number;
  currency: string;
  signingKey: string;
}): string {
  const canonical = [
    input.affiliation,
    input.terminal,
    input.externalId,
    String(input.amountCents),
    input.currency,
  ].join("|");
  return createHmac("sha256", input.signingKey).update(canonical).digest("hex");
}

export function buildNeonetCheckout(intent: PaymentIntent): {
  action: string;
  fields: Record<string, string>;
} {
  const config = getNeonetConfig();
  const signature = signNeonetFields({
    affiliation: config.affiliation,
    terminal: config.terminal,
    externalId: intent.externalId,
    amountCents: intent.amountCents,
    currency: intent.currency,
    signingKey: config.signingKey,
  });

  return {
    action: config.checkoutUrl,
    fields: {
      affiliation: config.affiliation,
      terminal: config.terminal,
      merchantId: config.merchantId,
      orderId: intent.externalId,
      reference: intent.externalId,
      description: intent.description,
      amount: (intent.amountCents / 100).toFixed(2),
      amountCents: String(intent.amountCents),
      currency: intent.currency,
      customerName: intent.customerName,
      customerEmail: intent.customerEmail,
      customerPhone: intent.customerPhone,
      responseUrl: absoluteUrl(`/pago/resultado?ref=${encodeURIComponent(intent.externalId)}`),
      webhookUrl: absoluteUrl("/api/webhooks/neonet"),
      signature,
      signatureVersion: "HMAC-SHA256-v1",
    },
  };
}

export const neonetProvider: PaymentProviderAdapter = {
  id: "NEONET",
  label: "NeoNet / NeoPay (Guatemala)",
  isConfigured() {
    try {
      getNeonetConfig();
      return true;
    } catch {
      return false;
    }
  },
  async createCheckout(intent: PaymentIntent): Promise<CheckoutResult> {
    getNeonetConfig();
    return {
      checkoutUrl: `/pago/neonet/${intent.paymentId}`,
      providerRef: intent.externalId,
      provider: "NEONET",
    };
  },
  verifyWebhook(request: WebhookRequest): boolean {
    const secret = process.env.NEONET_WEBHOOK_SECRET || "";
    if (!secret) return false;

    const header =
      request.headers.get("x-neonet-signature") ||
      request.headers.get("x-signature") ||
      request.headers.get("x-webhook-signature") ||
      "";

    if (!header) return false;
    const expected = createHmac("sha256", secret).update(request.rawBody).digest("hex");
    const provided = header.replace(/^sha256=/, "");
    return safeEqual(provided, expected);
  },
  parseWebhook(request: WebhookRequest): ParsedWebhook | null {
    const data = parseBody(request.rawBody);
    if (!data) return null;

    const externalId = firstString(data, [
      "externalId",
      "orderId",
      "reference",
      "clientReference",
      "invoiceNumber",
      "order",
    ]);
    if (!externalId) return null;

    const rawStatus = firstString(data, [
      "status",
      "transactionStatus",
      "responseCode",
      "result",
      "decision",
      "messageType",
    ]).toUpperCase();

    const paidCodes = ["00", "0", "APPROVED", "APROBADA", "PAID", "AUTHORIZED", "SUCCESS", "CAPTURED"];
    const failedCodes = ["DECLINED", "DENIED", "FAILED", "REJECTED", "ERROR", "CANCELLED", "05", "12", "51"];
    const pendingCodes = ["PENDING", "PROCESSING", "IN_PROGRESS", "AUTHORIZED_PENDING"];

    let status: ParsedWebhook["status"] = "PENDING";
    if (paidCodes.includes(rawStatus)) status = "PAID";
    else if (failedCodes.includes(rawStatus)) status = "FAILED";
    else if (pendingCodes.includes(rawStatus)) status = "PENDING";
    else if (String(data.refunded ?? "").toLowerCase() === "true") status = "REFUNDED";

    const amountRaw = firstString(data, ["amountCents", "amount", "total", "transactionAmount"]);
    let amountCents: number | undefined;
    if (amountRaw) {
      const numeric = Number(amountRaw.replace(/,/g, ""));
      if (Number.isFinite(numeric)) {
        amountCents = amountRaw.includes(".") ? Math.round(numeric * 100) : Math.round(numeric);
      }
    }

    const eventId =
      firstString(data, ["eventId", "event_id", "id", "transactionId", "auditNumber"]) ||
      `${externalId}-${rawStatus || "update"}-${firstString(data, ["authorizationNumber", "authorizationCode"])}`;

    return {
      eventId,
      externalId,
      status,
      amountCents,
      currency: firstString(data, ["currency", "currencyCode"]) || undefined,
      cardBrand: firstString(data, ["cardBrand", "brand", "cardType"]) || undefined,
      cardLast4:
        firstString(data, ["cardLast4", "last4", "lastFour", "maskedCard"]).slice(-4) || undefined,
      authorizationCode:
        firstString(data, ["authorizationCode", "authorizationNumber", "authCode"]) || undefined,
      providerRef: firstString(data, ["transactionId", "auditNumber", "referenceNumber"]) || undefined,
      rawStatus: rawStatus || undefined,
      failureReason: firstString(data, ["failureReason", "message", "responseMessage", "error"]) || undefined,
      raw: data,
    };
  },
};

function parseBody(rawBody: string): Record<string, unknown> | null {
  try {
    const json = JSON.parse(rawBody) as unknown;
    if (json && typeof json === "object") return json as Record<string, unknown>;
  } catch {
    // NeoNet también puede enviar application/x-www-form-urlencoded.
  }
  try {
    const params = new URLSearchParams(rawBody);
    const data: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) data[key] = value;
    return Object.keys(data).length > 0 ? data : null;
  } catch {
    return null;
  }
}

function firstString(data: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}
