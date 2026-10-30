import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { WEEKDAYS_ES } from "@/lib/constants";
import { minutesToTimeLabel } from "@/lib/dates";
import type { SettingsLike } from "@/lib/settings";

export function SiteFooter({
  settings,
  schedules,
}: {
  settings: SettingsLike;
  schedules: Array<{ weekday: number; openMinute: number; closeMinute: number; active: boolean }>;
}) {
  const hours = schedules
    .filter((s) => s.active)
    .sort((a, b) => a.weekday - b.weekday);

  return (
    <>
      <footer className="border-t border-white/10 bg-ink-900">
        <div className="container-px grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandLockup />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-stone-400">
              {settings.tagline}. Reserva en línea, paga seguro y llega directo a tu silla.
            </p>
            <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-gold-500">
              Hecho en Guatemala
            </p>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
              Explora
            </h3>
            <ul className="space-y-3 text-sm text-stone-400">
              <li><Link className="transition hover:text-gold-300" href="/#servicios">Servicios</Link></li>
              <li><Link className="transition hover:text-gold-300" href="/#barberos">Barberos</Link></li>
              <li><Link className="transition hover:text-gold-300" href="/#galeria">Galería</Link></li>
              <li><Link className="transition hover:text-gold-300" href="/reservar">Reservar cita</Link></li>
              <li><Link className="transition hover:text-gold-300" href="/ingresar">Ingresar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
              Horarios
            </h3>
            <ul className="space-y-2.5 text-sm text-stone-400">
              {hours.length === 0 ? <li>Consulta por WhatsApp</li> : null}
              {hours.map((s) => (
                <li key={s.weekday} className="flex items-center justify-between gap-3">
                  <span>{WEEKDAYS_ES[s.weekday]}</span>
                  <span className="text-stone-500">
                    {minutesToTimeLabel(s.openMinute)} – {minutesToTimeLabel(s.closeMinute)}
                  </span>
                </li>
              ))}
              {!hours.some((s) => s.weekday === 0) ? (
                <li className="flex items-center justify-between gap-3 text-stone-600">
                  <span>Domingo</span>
                  <span>Cerrado</span>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
              Contacto
            </h3>
            <ul className="space-y-4 text-sm text-stone-400">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                <span>{settings.address}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-gold-300">
                  {settings.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                <a href={`mailto:${settings.email}`} className="hover:text-gold-300">
                  {settings.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                <span>Lun – Sáb · con cita previa</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5">
          <div className="container-px flex flex-col items-center justify-between gap-4 py-6 text-[11px] text-stone-600 sm:flex-row">
            <p>© {new Date().getFullYear()} {settings.businessName}. Todos los derechos reservados.</p>
            <div className="flex items-center gap-5">
              <Link href="/politicas" className="hover:text-stone-400">Políticas de reserva</Link>
              <span>Pagos procesados de forma segura</span>
            </div>
          </div>
        </div>
      </footer>
      <WhatsAppFloat phone={settings.whatsapp} businessName={settings.businessName} />
    </>
  );
}
