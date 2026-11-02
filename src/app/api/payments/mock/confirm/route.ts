import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmMockPayment } from "@/lib/payments";
import { setRlsContext } from "@/lib/rls";
import { clientIp, isSameOrigin } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  paymentId: z.string().min(1),
  outcome: z.enum(["APPROVED", "DECLINED"]),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const limit = rateLimit(`mock-pay:${clientIp(request)}`, 20, 5 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });

  setRlsContext({ role: "SYSTEM" });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const result = await confirmMockPayment(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: 400 });
  }

  return NextResponse.json(result);
}
