import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth-helpers";
import { formatMoneyShort, minutesToTimeLabel } from "@/lib/dates";
import { WEEKDAYS_ES } from "@/lib/constants";
import { whatsappLink } from "@/lib/utils";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-dynamic";

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80",
    alt: "Degradado preciso en Navaja Barber Studio",
    className: "col-span-2 row-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=900&q=80",
    alt: "Interior de la barbería",
    className: "",
  },
  {
    src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=80",
    alt: "Herramientas de barbero",
    className: "",
  },
  {
    src: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80",
    alt: "Barbero perfilando barba",
    className: "",
  },
  {
    src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80",
    alt: "Corte a tijera",
    className: "",
  },
  {
    src: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=900&q=80",
    alt: "Detalle de corte",
    className: "col-span-2",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "La mejor barbería de Guatemala. El ritual premium vale cada quetzal: salí como nuevo y el café es de otro nivel.",
    name: "Rodrigo A.",
    detail: "Cliente desde 2021",
  },
  {
    quote:
      "Reservé en línea en dos minutos, pagué el anticipo con tarjeta y llegué directo a mi silla. Cero espera.",
    name: "Andrés M.",
    detail: "Ritual Navaja Premium",
  },
  {
    quote:
      "Carlos entiende exactamente lo que quiero sin explicarle demasiado. Un lugar con carácter y atención impecable.",
    name: "Gabriel S.",
    detail: "Corte + barba",
  },
];

const VALUES = [
  { icon: Scissors, title: "Oficio real", text: "Barberos certificados con años de experiencia y obsesión por el detalle." },
  { icon: Sparkles, title: "Experiencia ritual", text: "Toalla caliente, productos premium y café de especialidad en cada visita." },
  { icon: CalendarDays, title: "Reserva sin fricción", text: "Elige servicio, barbero y hora. Paga tu anticipo seguro desde el móvil." },
];

export default async function HomePage() {
  await getSessionUser();
  const [settings, services, barbers, schedules] = await Promise.all([
    getSettings(),
    prisma.service.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.barber.findMany({
      where: { active: true },
      include: { user: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.schedule.findMany({ orderBy: { weekday: "asc" } }),
  ]);

  const heroService = services[0];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gold" />
        <div className="absolute inset-0 noise opacity-60" />
        <div className="container-px relative grid min-h-[calc(100svh-5rem)] items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-up">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-gold-500/[0.07] px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-300">
                Barbería boutique · Zona 14
              </span>
            </div>

            <h1 className="max-w-2xl text-[2.9rem] leading-[0.98] sm:text-6xl lg:text-[4.6rem]">
              El arte del corte,
              <span className="gold-text block italic">sin prisa.</span>
            </h1>

            <p className="mt-7 max-w-lg text-base leading-relaxed text-stone-400 sm:text-lg">
              {settings.description}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/reservar" size="lg" className="group">
                Reservar mi cita
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink href="#servicios" variant="outline" size="lg">
                Ver servicios y precios
              </ButtonLink>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {barbers.slice(0, 3).map((barber) => (
                    <div
                      key={barber.id}
                      className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-ink-950 bg-ink-800"
                    >
                      {barber.imageUrl ? (
                        <Image src={barber.imageUrl} alt={barber.user.name} fill sizes="36px" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] text-gold-300">
                          {barber.user.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-xs leading-tight text-stone-400">
                  <div className="flex items-center gap-1 text-gold-300">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                  <span>+1,200 clientes felices</span>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Award className="h-4 w-4 text-gold-500" />
                <span>15 años de oficio</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Check className="h-4 w-4 text-gold-500" />
                <span>Pago seguro en línea</span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gold-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=85"
                  alt="Barbero trabajando en Navaja Barber Studio"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent" />
              </div>

              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 rounded-2xl border border-white/10 bg-ink-950/75 p-4 backdrop-blur-xl">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-gold-400">Desde</p>
                  <p className="mt-1 font-display text-2xl text-white">
                    {heroService ? formatMoneyShort(heroService.priceCents) : "Q95"}
                  </p>
                  <p className="text-[11px] text-stone-400">{heroService?.name ?? "Corte clásico"}</p>
                </div>
                <Link
                  href={heroService ? `/reservar?service=${heroService.slug}` : "/reservar"}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient text-ink-950 transition hover:brightness-110"
                  aria-label="Reservar corte clásico"
                >
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <div className="absolute -left-4 top-8 hidden rounded-xl border border-white/10 bg-ink-900/90 px-4 py-3 backdrop-blur-md sm:block">
              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Hoy</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-stone-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Cupos disponibles
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE / VALUES */}
      <section className="border-y border-white/5 bg-ink-900/60">
        <div className="container-px grid divide-y divide-white/5 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {VALUES.map((value) => (
            <div key={value.title} className="flex items-start gap-4 px-0 py-7 sm:px-8 first:pl-0 last:pr-0">
              <value.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-500" />
              <div>
                <p className="text-sm font-semibold text-stone-100">{value.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">{value.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="servicios" className="section scroll-mt-24">
        <div className="container-px">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <Reveal>
              <SectionHeading
                eyebrow="Carta de servicios"
                title={
                  <>
                    Precisión que se nota.
                    <br />
                    <span className="text-stone-500">Precios claros, sin sorpresas.</span>
                  </>
                }
                description="Cada servicio incluye asesoría de estilo, lavado y acabado. Elige el tuyo y reserva en menos de dos minutos."
              />
            </Reveal>
            <Reveal delay={100}>
              <ButtonLink href="/reservar" variant="outline">
                Reservar ahora
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal key={service.id} delay={Math.min(index * 60, 300)}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-850 transition-all duration-300 hover:-translate-y-1 hover:border-gold-500/30 hover:shadow-card">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {service.imageUrl ? (
                      <Image
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-ink-800">
                        <Scissors className="h-8 w-8 text-gold-500/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-ink-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-300 backdrop-blur">
                      {service.category}
                    </span>
                    <span className="absolute bottom-4 right-4 rounded-full bg-gold-gradient px-3.5 py-1.5 text-sm font-bold text-ink-950">
                      {formatMoneyShort(service.priceCents)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-xl">{service.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-400">
                      {service.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                      <span className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <Clock className="h-3.5 w-3.5" />
                        {service.durationMin} min
                      </span>
                      <Link
                        href={`/reservar?service=${service.slug}`}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gold-300 transition hover:text-gold-200"
                      >
                        Reservar
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-stone-600">
            Precios en quetzales (GTQ). Anticipo configurable al reservar. Aceptamos tarjetas de crédito y débito.
          </p>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section className="relative overflow-hidden border-y border-white/5 bg-ink-900">
        <div className="container-px grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
          <Reveal className="relative order-2 lg:order-1">
            <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80"
                alt="Interior de Navaja Barber Studio"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-ink-950/60 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-4 hidden rounded-2xl border border-gold-500/25 bg-ink-950/95 p-5 shadow-card sm:block">
              <p className="font-display text-3xl text-gold-300">4.9</p>
              <div className="mt-1 flex gap-0.5 text-gold-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-stone-500">
                320+ reseñas
              </p>
            </div>
          </Reveal>

          <Reveal delay={100} className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="La experiencia Navaja"
              title={
                <>
                  No es solo un corte.
                  <br />
                  <span className="text-stone-500">Es tu momento.</span>
                </>
              }
              description="Diseñamos un espacio donde el tiempo se detiene. Luz cálida, cuero, acero y el sonido de una buena conversación. Cada detalle está pensado para que salgas sintiéndote mejor de lo que entraste."
            />
            <ul className="mt-8 space-y-4">
              {[
                "Diagnóstico de estilo antes de tomar la máquina",
                "Toalla caliente y productos de cuidado profesional",
                "Café de especialidad o whisky de cortesía",
                "Reserva puntual: tu silla te espera a tu hora",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-stone-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10">
                    <Check className="h-3 w-3 text-gold-400" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-9">
              <ButtonLink href="/reservar" variant="gold">
                Vivir la experiencia
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* GALLERY */}
      <section id="galeria" className="section scroll-mt-24">
        <div className="container-px">
          <Reveal>
            <SectionHeading
              eyebrow="Galería"
              title="El trabajo habla por sí solo."
              description="Una selección de cortes, barbas y momentos capturados en la silla de Navaja."
              align="center"
            />
          </Reveal>

          <div className="mt-14 grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] lg:grid-cols-4">
            {GALLERY.map((image, index) => (
              <Reveal key={image.src} delay={index * 50} className={image.className}>
                <div className="group relative h-full w-full overflow-hidden rounded-xl border border-white/10">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* BARBERS */}
      <section id="barberos" className="section scroll-mt-24 border-y border-white/5 bg-ink-900/50">
        <div className="container-px">
          <Reveal>
            <SectionHeading
              eyebrow="El equipo"
              title="Manos que dominan el oficio."
              description="Elige a tu barbero. Cada uno tiene su estilo, su agenda y su silla reservada para ti."
            />
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((barber, index) => (
              <Reveal key={barber.id} delay={index * 80}>
                <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-850">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {barber.imageUrl ? (
                      <Image
                        src={barber.imageUrl}
                        alt={barber.user.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-ink-800">
                        <Scissors className="h-10 w-10 text-gold-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-gold-400">
                        {barber.title ?? "Barber"}
                      </p>
                      <h3 className="mt-1.5 text-2xl">{barber.user.name}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-400">
                        {barber.bio}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <Link
                          href={`/reservar?barber=${barber.slug}`}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gold-300 hover:text-gold-200"
                        >
                          Reservar con {barber.user.name.split(" ")[0]}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <div className="flex gap-2">
                          {barber.user.phone ? (
                            <a
                              href={whatsappLink(barber.user.phone, `Hola ${barber.user.name}, quiero reservar una cita.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`WhatsApp de ${barber.user.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ink-950/60 text-stone-300 transition hover:border-[#25D366]/40 hover:text-[#25D366]"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                          <a
                            href={settings.instagram ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ink-950/60 text-stone-300 transition hover:border-gold-500/40 hover:text-gold-300"
                          >
                            <Instagram className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section">
        <div className="container-px">
          <Reveal>
            <SectionHeading
              eyebrow="Voces de la silla"
              title="Lo que dicen nuestros clientes."
              align="center"
            />
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, index) => (
              <Reveal key={testimonial.name} delay={index * 80}>
                <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-ink-850 p-6">
                  <div className="flex gap-0.5 text-gold-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 text-sm leading-relaxed text-stone-300">
                    “{testimonial.quote}”
                  </blockquote>
                  <figcaption className="mt-6 border-t border-white/5 pt-4">
                    <p className="text-sm font-semibold text-stone-100">{testimonial.name}</p>
                    <p className="text-[11px] text-stone-500">{testimonial.detail}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOURS + LOCATION */}
      <section id="horarios" className="section scroll-mt-24 border-y border-white/5 bg-ink-900/50">
        <div className="container-px grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <SectionHeading
              eyebrow="Horarios"
              title="Tu silla te espera."
              description="Atendemos con cita previa para garantizar que cada cliente reciba el tiempo que merece."
            />
            <div className="mt-9 overflow-hidden rounded-2xl border border-white/10">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between border-b border-white/5 px-5 py-3.5 last:border-0"
                >
                  <span className="text-sm text-stone-300">{WEEKDAYS_ES[schedule.weekday]}</span>
                  {schedule.active ? (
                    <span className="text-xs text-stone-400">
                      {minutesToTimeLabel(schedule.openMinute)} – {minutesToTimeLabel(schedule.closeMinute)}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-600">Cerrado</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold-500/20 bg-gold-500/[0.06] p-4 text-xs leading-relaxed text-gold-100/80">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
              <p>
                Reserva con al menos 2 horas de anticipación. Puedes cancelar sin costo hasta 12 horas antes de tu cita.
              </p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div id="contacto" className="scroll-mt-28">
              <SectionHeading
                eyebrow="Encuéntranos"
                title="Zona 14, Ciudad de Guatemala."
              />
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-ink-850">
                <iframe
                  title="Ubicación de Navaja Barber Studio"
                  src={settings.mapsEmbedUrl ?? "https://www.google.com/maps?q=Zona+14+Ciudad+de+Guatemala&output=embed"}
                  className="h-64 w-full grayscale-[35%] contrast-[1.05] sm:h-72"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <a
                    href={settings.mapsUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition hover:border-gold-500/30"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                    <div>
                      <p className="text-xs font-semibold text-stone-200">Dirección</p>
                      <p className="mt-0.5 text-[11px] text-stone-500">{settings.address}</p>
                    </div>
                  </a>
                  <a
                    href={`tel:${settings.phone.replace(/\s/g, "")}`}
                    className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition hover:border-gold-500/30"
                  >
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                    <div>
                      <p className="text-xs font-semibold text-stone-200">Teléfono</p>
                      <p className="mt-0.5 text-[11px] text-stone-500">{settings.phone}</p>
                    </div>
                  </a>
                </div>
                <div className="border-t border-white/5 p-5 pt-4">
                  <a
                    href={whatsappLink(settings.whatsapp, "Hola, quiero reservar una cita en Navaja Barber Studio.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-xs font-semibold text-[#072b14] transition hover:brightness-110"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Escríbenos por WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1800&q=80"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ink-950/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-ink-950/30" />
        </div>
        <div className="container-px relative py-24 sm:py-32">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Último paso</p>
            <h2 className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Tu próximo corte
              <span className="gold-text block italic">empieza aquí.</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-stone-300 sm:text-base">
              Elige servicio, barbero y hora. Confirma con tu anticipo y recibe tu comprobante al instante.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/reservar" size="lg">
                <CalendarDays className="h-4 w-4" />
                Reservar cita ahora
              </ButtonLink>
              <ButtonLink
                href={whatsappLink(settings.whatsapp, "Hola, quiero reservar una cita en Navaja Barber Studio.")}
                variant="outline"
                size="lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                Preguntar por WhatsApp
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-[11px] text-stone-500">
              <Check className="h-3.5 w-3.5 text-gold-500" />
              Pago seguro · No almacenamos datos de tu tarjeta
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
