import { PageHeader } from "@/components/admin/page-header";
import { BarberForm } from "@/components/admin/barber-form";

export default function NewBarberPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Nuevo barbero"
        description="Crea el perfil y las credenciales de acceso al panel."
      />
      <BarberForm
        barber={{
          name: "",
          email: "",
          phone: "",
          title: "",
          bio: "",
          imageUrl: "",
          displayOrder: 0,
          active: true,
          acceptsBookings: true,
        }}
      />
    </div>
  );
}
