import { NextResponse } from "next/server";
import { queueReminders, dispatchDueNotifications } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import { setRlsContext } from "@/lib/rls";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  setRlsContext({ role: "SYSTEM" });
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const reminders = await queueReminders();
    const dispatched = await dispatchDueNotifications();
    await logAudit({
      action: "CRON_REMINDERS",
      entity: "System",
      metadata: { reminders, dispatched },
    });
    return NextResponse.json({ ok: true, reminders, dispatched });
  } catch (error) {
    console.error("[cron:reminders]", error);
    return NextResponse.json({ error: "Error ejecutando recordatorios" }, { status: 500 });
  }
}

export const POST = GET;
