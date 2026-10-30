import Link from "next/link";
import { CalendarPlus, Mail, Phone, Search, UserRound, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateShort, formatMoney } from "@/lib/dates";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { EmptyState, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const customers = await prisma.customer.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
        }
      : undefined,
    include: {
      appointments: {
        orderBy: { startAt: "desc" },
        select: {
          id: true,
          startAt: true,
          status: true,
          totalCents: true,
          payments: { where: { status: "PAID" }, select: { amountCents: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = await prisma.customer.count();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = await prisma.customer.count({ where: { createdAt: { gte: monthStart } } });
  const withVisits = customers.filter((customer) =>
    customer.appointments.some((appointment) => appointment.status === "COMPLETED"),
  ).length;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Historial, contacto y notas del cliente."
        action={{ href: "/admin/citas/nueva", label: "Agendar cita", icon: <CalendarPlus className="h-4 w-4" /> }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Clientes totales" value={String(total)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Nuevos este mes" value={String(newThisMonth)} tone="gold" />
        <StatCard label="Con visitas completadas" value={String(withVisits)} tone="green" />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-ink-850/60">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <form action="/admin/clientes" className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-600" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre, correo o teléfono…"
              className="h-9 w-full py-0 pl-8 text-xs sm:w-80"
            />
          </form>
          <p className="text-[10px] text-stone-600">
            {customers.length} resultado{customers.length === 1 ? "" : "s"}
          </p>
        </div>

        {customers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<UserRound className="h-8 w-8" />}
              title={query ? "Sin coincidencias" : "Aún no hay clientes"}
              description={
                query
                  ? "Prueba con otro término de búsqueda."
                  : "Los clientes se crean automáticamente al reservar o manualmente desde una cita."
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {customers.map((customer) => {
              const completed = customer.appointments.filter((a) => a.status === "COMPLETED");
              const spent = customer.appointments
                .flatMap((appointment) => appointment.payments)
                .reduce((sum, payment) => sum + payment.amountCents, 0);
              const lastVisit = completed[0]?.startAt;
              const next = customer.appointments.find(
                (appointment) =>
                  appointment.startAt > new Date() &&
                  ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status),
              );
              return (
                <Link
                  key={customer.id}
                  href={`/admin/clientes/${customer.id}`}
                  className="flex flex-col gap-2 px-4 py-3 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-gold-300">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-stone-200">{customer.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-stone-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" />
                        {customer.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />
                        {customer.phone}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-6 text-right text-[10px]">
                    <div>
                      <p className="text-stone-600">Visitas</p>
                      <p className="text-stone-300">{completed.length}</p>
                    </div>
                    <div>
                      <p className="text-stone-600">Gastado</p>
                      <p className="text-stone-300">{formatMoney(spent)}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-stone-600">Última</p>
                      <p className="text-stone-300">{lastVisit ? formatDateShort(lastVisit) : "—"}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-stone-600">Próxima</p>
                      <p className={next ? "text-gold-300" : "text-stone-600"}>
                        {next ? formatDateShort(next.startAt) : "—"}
                      </p>
                    </div>
                  </div>
                  <span className="hidden rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-stone-400 sm:inline-block">
                    Ver ficha
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
