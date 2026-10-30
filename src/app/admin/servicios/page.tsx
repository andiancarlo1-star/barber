import Link from "next/link";
import { Clock, Plus, Scissors, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { durationLabel, formatMoney } from "@/lib/dates";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Badge, EmptyState, buttonClasses } from "@/components/ui";
import { toggleServiceAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { displayOrder: "asc" } });
  const active = services.filter((service) => service.active);
  const avg =
    active.length > 0
      ? Math.round(active.reduce((sum, service) => sum + service.priceCents, 0) / active.length)
      : 0;
  const categories = new Set(services.map((service) => service.category));

  return (
    <div>
      <PageHeader
        title="Servicios"
        description="Catálogo, precios y duración de cada servicio."
        action={{ href: "/admin/servicios/nuevo", label: "Nuevo servicio", icon: <Plus className="h-4 w-4" /> }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Servicios activos" value={String(active.length)} hint={`${services.length} en total`} icon={<Sparkles className="h-4 w-4" />} tone="gold" />
        <StatCard label="Precio promedio" value={formatMoney(avg)} tone="green" />
        <StatCard label="Categorías" value={String(categories.size)} icon={<Scissors className="h-4 w-4" />} />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-ink-850/60">
        <div className="border-b border-white/5 px-5 py-4">
          <h3 className="text-sm font-semibold text-stone-200">Catálogo</h3>
        </div>
        {services.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Scissors className="h-8 w-8" />}
              title="Sin servicios"
              description="Crea el primer servicio para empezar a recibir reservas."
              action={
                <Link href="/admin/servicios/nuevo" className={buttonClasses({ variant: "gold", size: "sm" })}>
                  Nuevo servicio
                </Link>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {services.map((service) => (
              <div key={service.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-900 text-gold-400">
                  <Scissors className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-stone-200">{service.name}</p>
                    <Badge tone={service.active ? "green" : "neutral"}>
                      {service.active ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge tone="neutral">{service.category}</Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-stone-500">
                    {service.description ?? "Sin descripción"}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[9px] text-stone-600">
                    <Clock className="h-2.5 w-2.5" />
                    {durationLabel(service.durationMin)} · buffer {service.bufferMin} min · orden{" "}
                    {service.displayOrder}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-sm font-semibold text-stone-200">{formatMoney(service.priceCents)}</p>
                  <p className="text-[9px] text-stone-600">{service.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/admin/servicios/${service.id}`}
                    className={buttonClasses({ variant: "dark", size: "sm" })}
                  >
                    Editar
                  </Link>
                  <form action={toggleServiceAction}>
                    <input type="hidden" name="id" value={service.id} />
                    <button
                      type="submit"
                      className={`rounded-lg border px-2.5 py-1.5 text-[10px] transition ${
                        service.active
                          ? "border-red-500/20 text-red-300 hover:bg-red-500/10"
                          : "border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      {service.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
