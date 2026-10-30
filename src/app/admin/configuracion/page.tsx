import Link from "next/link";
import { CheckCircle2, CreditCard, ExternalLink, ShieldCheck, XCircle } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth-helpers";
import { neonetProvider } from "@/lib/payments/neonet";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { PasswordForm } from "@/components/admin/password-form";
import { Alert, Badge, buttonClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, user] = await Promise.all([getSettings(), getSessionUser()]);
  const neonetReady = neonetProvider.isConfigured();

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Identidad, reglas de reserva, anticipos y pasarela de pago."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SettingsForm
            settings={{
              businessName: settings.businessName,
              tagline: settings.tagline,
              description: settings.description ?? "",
              phone: settings.phone,
              whatsapp: settings.whatsapp,
              email: settings.email,
              address: settings.address,
              mapsUrl: settings.mapsUrl ?? "",
              mapsEmbedUrl: settings.mapsEmbedUrl ?? "",
              instagram: settings.instagram ?? "",
              facebook: settings.facebook ?? "",
              requirePayment: settings.requirePayment,
              depositType: settings.depositType,
              depositValue: settings.depositValue,
              minAdvanceMinutes: settings.minAdvanceMinutes,
              maxAdvanceDays: settings.maxAdvanceDays,
              cancellationHours: settings.cancellationHours,
              slotIntervalMin: settings.slotIntervalMin,
              paymentProvider: settings.paymentProvider,
            }}
          />
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <CreditCard className="h-4 w-4 text-gold-500" />
              Pasarela de pago
            </h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <div>
                  <p className="text-[11px] text-stone-300">MOCK</p>
                  <p className="text-[9px] text-stone-600">Pruebas locales, sin cargo real</p>
                </div>
                <Badge tone="green">
                  <CheckCircle2 className="h-3 w-3" /> Listo
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <div>
                  <p className="text-[11px] text-stone-300">NEONET</p>
                  <p className="text-[9px] text-stone-600">Requiere afiliación y credenciales</p>
                </div>
                <Badge tone={neonetReady ? "green" : "red"}>
                  {neonetReady ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {neonetReady ? "Listo" : "Sin configurar"}
                </Badge>
              </div>
            </div>
            <Alert tone={settings.paymentProvider === "NEONET" && !neonetReady ? "error" : "info"} className="mt-3 text-[10px]">
              {settings.paymentProvider === "NEONET" && !neonetReady
                ? "La pasarela activa es NEONET pero faltan variables de entorno. Las reservas con anticipo fallarán."
                : `Pasarela activa: ${settings.paymentProvider}. ${neonetReady ? "Las credenciales de NeoNet están presentes." : "Completa las variables NEONET_* para producción."}`}
            </Alert>
            <Link href="/politicas" className="mt-3 inline-flex items-center gap-1 text-[10px] text-gold-400 hover:text-gold-300">
              Ver políticas públicas
              <ExternalLink className="h-3 w-3" />
            </Link>
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
              <ShieldCheck className="h-4 w-4 text-gold-500" />
              Tu cuenta
            </h3>
            <p className="mt-1 text-[10px] text-stone-500">
              {user?.name} · {user?.email}
            </p>
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Cambiar contraseña
              </p>
              <PasswordForm />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-ink-850/60 p-5 text-[10px] leading-relaxed text-stone-500">
            <p className="font-semibold text-stone-300">Buenas prácticas</p>
            <ul className="mt-2 space-y-1.5">
              <li>· Usa una contraseña única y un gestor de contraseñas.</li>
              <li>· En producción, activa HTTPS y rota AUTH_SECRET y secretos de NeoNet.</li>
              <li>· Configura SMTP para correos reales y WhatsApp Cloud API para recordatorios.</li>
              <li>· Revisa la auditoría periódicamente.</li>
            </ul>
            <Link href="/admin/auditoria" className={buttonClasses({ variant: "ghost", size: "sm", className: "mt-3 w-full" })}>
              Ver auditoría
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
