import { NextResponse } from "next/server";
import { neonetProvider } from "@/lib/payments/neonet";
import { processPaymentUpdate } from "@/lib/payments/process";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const webhookRequest = { rawBody, headers: request.headers, url: request.url };

  if (!neonetProvider.verifyWebhook(webhookRequest)) {
    await logAudit({
      action: "WEBHOOK_INVALID_SIGNATURE",
      entity: "Payment",
      metadata: { provider: "NEONET", ip: clientIp(request) },
    });
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const parsed = neonetProvider.parseWebhook(webhookRequest);
  if (!parsed) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  try {
    const result = await processPaymentUpdate(parsed, "NEONET");
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("[webhook:neonet]", error);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "NEONET" });
}
