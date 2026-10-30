import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Políticas de reserva y privacidad",
};

export default async function PoliciesPage() {
  const settings = await getSettings();

  const sections = [
    {
      title: "1. Reservas y confirmación",
      body: `Las reservas se realizan en línea a través de ${settings.businessName}. Tu horario queda bloqueado al iniciar el proceso, pero la cita se considera confirmada únicamente cuando la pasarela de pagos notifica la aprobación del anticipo a nuestro servidor. No confirmamos reservas con base en mensajes del navegador.`,
    },
    {
      title: "2. Anticipos y pagos",
      body: "El anticipo se aplica al total del servicio y el saldo restante se paga en la barbería. Los pagos con tarjeta son procesados por una pasarela certificada (NeoNet en producción). No almacenamos números completos de tarjeta, códigos CVV ni credenciales financieras. Los comprobantes incluyen únicamente la marca y los últimos cuatro dígitos de la tarjeta.",
    },
    {
      title: "3. Cancelaciones y reprogramaciones",
      body: `Puedes cancelar sin costo hasta ${settings.cancellationHours} horas antes de tu cita desde la página de tu reserva o escribiéndonos por WhatsApp. Las cancelaciones dentro de la ventana pueden estar sujetas a la retención del anticipo según la política del negocio. Las reprogramaciones están sujetas a disponibilidad.`,
    },
    {
      title: "4. Puntualidad y no asistencia",
      body: "Te recomendamos llegar 5 minutos antes. Si llegas más de 15 minutos tarde, el barbero puede ajustar el servicio para no afectar a otros clientes. La no asistencia sin aviso puede implicar la pérdida del anticipo.",
    },
    {
      title: "5. Datos personales",
      body: "Recopilamos nombre, correo, teléfono y notas de la cita con la única finalidad de gestionar tu reserva, enviar confirmaciones y recordatorios, y mejorar el servicio. No vendemos tus datos. Puedes solicitar su eliminación escribiendo a nuestro correo de contacto.",
    },
    {
      title: "6. Comunicaciones",
      body: "Al reservar aceptas recibir correos transaccionales de confirmación, pago, recordatorio y cancelación. La integración con WhatsApp es opcional y se utiliza para las mismas finalidades. No enviamos publicidad sin tu consentimiento.",
    },
    {
      title: "7. Seguridad",
      body: "Las rutas administrativas están protegidas por autenticación y roles. Las acciones sensibles se registran en una bitácora de auditoría. Las credenciales y secretos se gestionan mediante variables de entorno y nunca se incluyen en el código fuente.",
    },
    {
      title: "8. Contacto",
      body: `Para consultas sobre reservas, pagos, privacidad o facturación: ${settings.email} · ${settings.phone} · ${settings.address}.`,
    },
  ];

  return (
    <div className="container-px py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="Transparencia"
          title="Políticas de reserva y privacidad"
          description="Queremos que tu experiencia sea clara de principio a fin. Estas son las reglas que aplican a las reservas y pagos en línea."
        />

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg text-stone-100">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-white/10 bg-ink-850 p-6">
          <p className="text-sm text-stone-300">
            ¿Tienes una duda que no está aquí?{" "}
            <Link href="/#contacto" className="link-gold">
              Contáctanos
            </Link>{" "}
            o escríbenos por WhatsApp.
          </p>
          <p className="mt-3 text-[11px] text-stone-600">
            Última actualización: {new Date().toLocaleDateString("es-GT", { year: "numeric", month: "long" })}
          </p>
        </div>
      </div>
    </div>
  );
}
