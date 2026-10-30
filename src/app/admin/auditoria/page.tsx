import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { formatDateTime } from "@/lib/dates";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { Badge, EmptyState, Input, Select, buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; accion?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const action = params.accion ?? "";
  const page = Math.max(1, Number(params.pagina ?? "1") || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(query
      ? {
          OR: [
            { action: { contains: query, mode: "insensitive" } },
            { entity: { contains: query, mode: "insensitive" } },
            { entityId: { contains: query, mode: "insensitive" } },
            { user: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [logs, total, actions, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    prisma.auditLog.count({ where: { userId: { not: null } } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (nextPage: number) =>
    `/admin/auditoria?pagina=${nextPage}${action ? `&accion=${encodeURIComponent(action)}` : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de acciones sensibles del sistema."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Eventos totales" value={String(total)} icon={<ShieldCheck className="h-4 w-4" />} tone="gold" />
        <StatCard label="Tipos de acción" value={String(actions.length)} />
        <StatCard label="Con usuario" value={String(users)} hint="El resto son eventos del sistema o webhooks" />
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-ink-850/60">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <form action="/admin/auditoria" className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-600" />
              <Input name="q" defaultValue={query} placeholder="Acción, entidad, usuario…" className="h-9 w-56 py-0 pl-8 text-xs" />
            </div>
            <Select name="accion" defaultValue={action} className="h-9 w-52 py-0 text-xs">
              <option value="">Todas las acciones</option>
              {actions.map((item) => (
                <option key={item.action} value={item.action}>
                  {item.action}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonClasses({ variant: "dark", size: "sm" })}>
              Filtrar
            </button>
          </form>
          <p className="text-[10px] text-stone-600">
            Página {page} de {pages}
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="Sin eventos" description="No hay registros que coincidan con el filtro." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[11px]">
              <thead className="border-b border-white/5 text-[8px] uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Fecha</th>
                  <th className="px-4 py-2.5 font-medium">Acción</th>
                  <th className="px-4 py-2.5 font-medium">Entidad</th>
                  <th className="px-4 py-2.5 font-medium">Usuario</th>
                  <th className="px-4 py-2.5 font-medium">Metadata</th>
                  <th className="px-4 py-2.5 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[10px] text-stone-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone="gold">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-stone-300">{log.entity}</p>
                      <p className="font-mono text-[8px] text-stone-600">{log.entityId ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-stone-300">{log.user?.name ?? "Sistema"}</p>
                      <p className="text-[9px] text-stone-600">{log.user?.role ?? "—"}</p>
                    </td>
                    <td className="max-w-64 px-4 py-2.5">
                      <p className="truncate font-mono text-[8px] text-stone-500" title={log.metadata ? JSON.stringify(log.metadata) : ""}>
                        {log.metadata ? JSON.stringify(log.metadata) : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[9px] text-stone-600">{log.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
          <Link
            href={buildHref(Math.max(1, page - 1))}
            className={buttonClasses({ variant: "ghost", size: "sm", className: page <= 1 ? "pointer-events-none opacity-40" : "" })}
          >
            Anterior
          </Link>
          <span className="text-[10px] text-stone-600">
            {logs.length} de {total} eventos
          </span>
          <Link
            href={buildHref(Math.min(pages, page + 1))}
            className={buttonClasses({ variant: "ghost", size: "sm", className: page >= pages ? "pointer-events-none opacity-40" : "" })}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  );
}
