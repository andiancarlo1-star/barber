import { NextResponse } from "next/server";
import { neonetProvider } from "@/lib/payments/neonet";
import { processPaymentUpdate } from "@/lib/payments/process";
import { setRlsContext } from "@/lib/rls";
import { clientIp, readRequestText } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`neonet-webhook:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  const rawBody = await readRequestText(request, 64 * 1024);
  if (rawBody === null) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }

  setRlsContext({ role: "SYSTEM" });
  const webhookRequest = { rawBody, headers: request.headers, url: request.url };

  if (!neonetProvider.verifyWebhook(webhookRequest)) {
    console.warn("[webhook:neonet] Firma inválida", { ip });
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
