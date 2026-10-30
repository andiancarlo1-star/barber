import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/service-form";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/servicios"
        className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-stone-500 hover:text-gold-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a servicios
      </Link>
      <PageHeader title={service.name} description="Edita precio, duración y visibilidad." />
      <ServiceForm
        service={{
          id: service.id,
          name: service.name,
          description: service.description ?? "",
          price: (service.priceCents / 100).toFixed(2),
          durationMin: service.durationMin,
          bufferMin: service.bufferMin,
          category: service.category,
          imageUrl: service.imageUrl ?? "",
          displayOrder: service.displayOrder,
          active: service.active,
        }}
      />
    </div>
  );
}
