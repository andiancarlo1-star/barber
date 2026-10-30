import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, Search, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { PaymentStatus, Prisma } from "@prisma/client";
import {
  addDaysToKey,
  formatDateShort,
  formatDateTime,
  formatMoney,
  todayKey,
  zonedToUtc,
} from "@/lib/dates";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { EmptyState, Input, Select, StatusBadge, buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "7 días" },
  { key: "mes", label: "30 días" },
  { key: "todos", label: "Todo" },
] as const;

const STATUSES: PaymentStatus[] = ["PENDING", "PROCESSING", "PAID", "FAILED", "REFUNDED", "CANCELLED"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; estado?: string; proveedor?: string; q?: string }>;
}) {
  const params = await searchParams;
  const range = RANGES.some((item) => item.key === params.rango) ? params.rango! : "semana";
  const status = STATUSES.includes(params.estado as PaymentStatus) ? (params.estado as PaymentStatus) : undefined;
  const provider = ["MOCK", "NEONET"].includes(params.proveedor ?? "") ? params.proveedor : undefined;
  const query = params.q?.trim() ?? "";

  const key = todayKey();
  const rangeStart =
    range === "hoy"
      ? zonedToUtc(key, 0)
      : range === "semana"
        ? zonedToUtc(addDaysToKey(key, -6), 0)
        : range === "mes"
          ? zonedToUtc(addDaysToKey(key, -29), 0)
          : undefined;

  const where: Prisma.PaymentWhereInput = {
    ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}),
    ...(status ? { status } : {}),
    ...(provider ? { provider: provider as "MOCK" | "NEONET" } : {}),
    ...(query
      ? {
          OR: [
            { externalId: { contains: query, mode: "insensitive" } },
            { appointment: { code: { contains: query, mode: "insensitive" } } },
            { appointment: { customer: { name: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [payments, paidAgg, pendingCount, failedCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { appointment: { include: { customer: true, service: true, barber: { include: { user: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", ...(rangeStart ? { paidAt: { gte: rangeStart } } : {}) },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.payment.count({ where: { status: "PENDING", ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}) } }),
    prisma.payment.count({ where: { status: "FAILED", ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}) } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Pagos"
        description="Anticipos procesados por la pasarela, estados e intentos fallidos."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Cobrado en el rango"
          value={formatMoney(paidAgg._sum.amountCents ?? 0)}
          hint={`${paidAgg._count} pago${paidAgg._count === 1 ? "" : "s"} confirmado${paidAgg._count === 1 ? "" : "s"}`}
          icon={<Wallet className="h-4 w-4" />}
          tone="green"
        />
        <StatCard label="Pendientes" value={String(pendingCount)} icon={<CreditCard className="h-4 w-4" />} tone="gold" />
        <StatCard label="Fallidos" value={String(failedCount)} icon={<AlertTriangle className="h-4 w-4" />} tone={failedCount > 0 ? "red" : "neutral"} />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-ink-850/60">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((item) => (
              <Link
                key={item.key}
                href={`/admin/pagos?rango=${item.key}${status ? `&estado=${status}` : ""}${provider ? `&proveedor=${provider}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className={`rounded-lg px-3 py-1.5 text-[11px] transition ${
                  range === item.key
                    ? "bg-gold-500/15 font-medium text-gold-200"
                    : "text-stone-500 hover:bg-white/5 hover:text-stone-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <form action="/admin/pagos" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="rango" value={range} />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-600" />
              <Input name="q" defaultValue={query} placeholder="Referencia, código, cliente…" className="h-9 w-48 py-0 pl-8 text-xs" />
            </div>
            <Select name="estado" defaultValue={status ?? ""} className="h-9 w-32 py-0 text-xs">
              <option value="">Estado</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Select name="proveedor" defaultValue={provider ?? ""} className="h-9 w-32 py-0 text-xs">
              <option value="">Proveedor</option>
              <option value="MOCK">MOCK</option>
              <option value="NEONET">NEONET</option>
            </Select>
            <button type="submit" className={buttonClasses({ variant: "dark", size: "sm" })}>
              Filtrar
            </button>
          </form>
        </div>

        {payments.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<CreditCard className="h-8 w-8" />}
              title="Sin pagos en este filtro"
              description="Los pagos aparecen cuando un cliente inicia el checkout de una reserva."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="border-b border-white/5 text-[9px] uppercase tracking-[0.14em] text-stone-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Referencia</th>
                  <th className="px-4 py-2.5 font-medium">Cliente / cita</th>
                  <th className="px-4 py-2.5 font-medium">Proveedor</th>
                  <th className="px-4 py-2.5 font-medium">Monto</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 text-[10px] text-stone-500">
                      {formatDateShort(payment.createdAt)}
                      <p className="text-[9px] text-stone-600">{formatDateTime(payment.createdAt).split("·")[1]}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[9px] text-stone-500">{payment.externalId}</p>
                      <p className="text-[9px] text-stone-600">{payment.type === "DEPOSIT" ? "Anticipo" : "Pago total"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-200">{payment.appointment.customer.name}</p>
                      <p className="text-[9px] text-stone-500">
                        {payment.appointment.service.name} ·{" "}
                        <span className="font-mono">{payment.appointment.code}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[10px] text-stone-400">{payment.provider}</p>
                      <p className="text-[9px] text-stone-600">
                        {payment.cardBrand ? `${payment.cardBrand} ••••${payment.cardLast4}` : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-200">{formatMoney(payment.amountCents)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={payment.status} />
                      {payment.failureReason ? (
                        <p className="mt-0.5 max-w-32 truncate text-[8px] text-red-400/80" title={payment.failureReason}>
                          {payment.failureReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/citas/${payment.appointmentId}`}
                        className="text-[10px] text-gold-400 hover:text-gold-300"
                      >
                        Ver cita
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-stone-600">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        Solo se almacenan marca y últimos 4 dígitos. Nunca guardamos números completos ni CVV.
      </p>
    </div>
  );
}
