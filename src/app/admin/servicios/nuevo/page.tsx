import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/service-form";

export default function NewServicePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Nuevo servicio" description="Agrega un servicio al catálogo público." />
      <ServiceForm
        service={{
          name: "",
          description: "",
          price: "",
          durationMin: 45,
          bufferMin: 10,
          category: "Cortes",
          imageUrl: "",
          displayOrder: 0,
          active: true,
        }}
      />
    </div>
  );
}
