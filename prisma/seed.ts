import { PrismaClient, type AppointmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDaysToKey, todayKey, zonedToUtc } from "../src/lib/dates";

const prisma = new PrismaClient({
  datasourceUrl: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
});

const SERVICES = [
  {
    slug: "corte-clasico",
    name: "Corte clásico",
    description: "Tijera y máquina, lavado y peinado con acabado a navaja.",
    priceCents: 12500,
    durationMin: 45,
    bufferMin: 10,
    category: "Cortes",
    displayOrder: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "fade-degradado",
    name: "Fade / degradado",
    description: "Degradado milimétrico con perfilado y diseño de líneas.",
    priceCents: 15000,
    durationMin: 45,
    bufferMin: 10,
    category: "Cortes",
    displayOrder: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "corte-barba",
    name: "Corte + barba",
    description: "El combo completo: corte a medida y perfilado de barba.",
    priceCents: 19500,
    durationMin: 60,
    bufferMin: 15,
    category: "Combos",
    displayOrder: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "arreglo-barba",
    name: "Arreglo de barba",
    description: "Perfilado, recorte y aceites para una barba impecable.",
    priceCents: 9000,
    durationMin: 30,
    bufferMin: 10,
    category: "Barba",
    displayOrder: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "afeitado-navaja",
    name: "Afeitado clásico a navaja",
    description: "Toalla caliente, espuma artesanal y afeitado tradicional.",
    priceCents: 11000,
    durationMin: 40,
    bufferMin: 10,
    category: "Barba",
    displayOrder: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "ritual-premium",
    name: "Ritual Navaja Premium",
    description: "Corte, barba, mascarilla facial y masaje con toalla caliente.",
    priceCents: 27500,
    durationMin: 90,
    bufferMin: 15,
    category: "Experiencias",
    displayOrder: 6,
    imageUrl:
      "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "corte-ninos",
    name: "Corte para niños",
    description: "Corte con paciencia, diseño y un detalle especial.",
    priceCents: 9500,
    durationMin: 30,
    bufferMin: 10,
    category: "Cortes",
    displayOrder: 7,
    imageUrl:
      "https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1200&q=80",
  },
];

const BARBERS = [
  {
    name: "Carlos Méndez",
    email: "carlos@navajabarber.gt",
    phone: "55551234",
    slug: "carlos-mendez",
    title: "Master Barber & fundador",
    bio: "15 años de oficio. Especialista en fades, tijera y afeitado clásico. Fundador de Navaja.",
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    displayOrder: 1,
    weekdays: [1, 2, 3, 4, 5, 6],
  },
  {
    name: "Diego Ramírez",
    email: "diego@navajabarber.gt",
    phone: "55559876",
    slug: "diego-ramirez",
    title: "Barber & especialista en barba",
    bio: "Diseño de barba, perfilados y rituales de afeitado. Amante de los detalles.",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
    displayOrder: 2,
    weekdays: [2, 3, 4, 5, 6],
  },
  {
    name: "Andrés Castillo",
    email: "andres@navajabarber.gt",
    phone: "55554321",
    slug: "andres-castillo",
    title: "Barber stylist",
    bio: "Cortes contemporáneos, texturas y color. Tu próximo look empieza aquí.",
    imageUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
    displayOrder: 3,
    weekdays: [1, 3, 4, 5, 6],
  },
];

const CUSTOMERS = [
  { name: "Javier López", email: "javier.lopez@example.com", phone: "50112233" },
  { name: "María Fernández", email: "maria.fernandez@example.com", phone: "50223344" },
  { name: "Luis Pedro Girón", email: "luis.giron@example.com", phone: "50334455" },
  { name: "Ana Lucía Morales", email: "ana.morales@example.com", phone: "50445566" },
  { name: "Roberto Xicay", email: "roberto.xicay@example.com", phone: "50556677" },
  { name: "Sofía Herrera", email: "sofia.herrera@example.com", phone: "50667788" },
  { name: "Daniel Ovalle", email: "daniel.ovalle@example.com", phone: "50778899" },
  { name: "Paola Castillo", email: "paola.castillo@example.com", phone: "50889900" },
];

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Seed demo bloqueado. Solo úsalo en desarrollo con ALLOW_DEMO_SEED=true; elimina y reemplaza los datos de la base.",
    );
  }

  console.log("Limpiando datos...");
  await prisma.paymentEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.barberSchedule.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.service.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.barber.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.businessSettings.deleteMany();

  console.log("Configuración del negocio...");
  await prisma.businessSettings.create({
    data: {
      id: "default",
      businessName: "Navaja Barber Studio",
      tagline: "Cortes de autor en el corazón de Guatemala",
      description:
        "Una barbería boutique donde la tradición del oficio se encuentra con el diseño contemporáneo. Cada cita es un ritual: toalla caliente, precisión y un café de especialidad. Reserva tu turno y vive la experiencia Navaja.",
      phone: "+502 5555 1234",
      whatsapp: "50255551234",
      email: "hola@navajabarber.gt",
      address: "12 calle 3-45, Zona 14, Ciudad de Guatemala",
      mapsUrl: "https://maps.google.com/?q=Zona+14+Ciudad+de+Guatemala",
      mapsEmbedUrl:
        "https://www.google.com/maps?q=Zona%2014%2C%20Ciudad%20de%20Guatemala&output=embed",
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
      timezone: "America/Guatemala",
      currency: "GTQ",
      requirePayment: true,
      depositType: "PERCENT",
      depositValue: 30,
      minAdvanceMinutes: 120,
      maxAdvanceDays: 45,
      cancellationHours: 12,
      slotIntervalMin: 15,
      paymentProvider: "MOCK",
    },
  });

  console.log("Horarios del negocio...");
  for (let weekday = 0; weekday <= 6; weekday++) {
    const active = weekday !== 0;
    await prisma.schedule.create({
      data: {
        weekday,
        openMinute: 9 * 60,
        closeMinute: weekday === 6 ? 17 * 60 : 19 * 60,
        breakStartMinute: 13 * 60,
        breakEndMinute: 14 * 60,
        active,
      },
    });
  }

  console.log("Servicios...");
  const services = [];
  for (const service of SERVICES) {
    services.push(await prisma.service.create({ data: service }));
  }

  console.log("Usuarios y barberos...");
  const adminHash = await bcrypt.hash("Admin123!", 12);
  const barberHash = await bcrypt.hash("Barber123!", 12);
  const customerHash = await bcrypt.hash("Cliente123!", 12);

  await prisma.user.create({
    data: {
      name: "Valeria Méndez",
      email: "admin@navajabarber.gt",
      phone: "55550001",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const barbers = [];
  for (const barber of BARBERS) {
    const user = await prisma.user.create({
      data: {
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        passwordHash: barberHash,
        role: "BARBER",
        image: barber.imageUrl,
      },
    });

    const profile = await prisma.barber.create({
      data: {
        userId: user.id,
        slug: barber.slug,
        title: barber.title,
        bio: barber.bio,
        imageUrl: barber.imageUrl,
        displayOrder: barber.displayOrder,
      },
    });

    for (const weekday of barber.weekdays) {
      await prisma.barberSchedule.create({
        data: {
          barberId: profile.id,
          weekday,
          startMinute: 9 * 60,
          endMinute: weekday === 6 ? 17 * 60 : 19 * 60,
          active: true,
        },
      });
    }

    barbers.push(profile);
  }

  console.log("Clientes...");
  const customers = [];
  for (const customer of CUSTOMERS) {
    customers.push(await prisma.customer.create({ data: customer }));
  }

  const demoCustomer = await prisma.user.create({
    data: {
      name: "Cliente Demo",
      email: "cliente@demo.gt",
      phone: "55557777",
      passwordHash: customerHash,
      role: "CUSTOMER",
    },
  });
  const demoProfile = await prisma.customer.create({
    data: {
      userId: demoCustomer.id,
      name: "Cliente Demo",
      email: "cliente@demo.gt",
      phone: "55557777",
    },
  });
  customers.unshift(demoProfile);

  console.log("Citas de ejemplo...");
  const today = todayKey();
  const slots = [10 * 60, 11 * 60 + 30, 15 * 60, 16 * 60 + 30];
  let appointmentIndex = 0;

  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const dateKey = addDaysToKey(today, dayOffset);
    const weekday = zonedToUtc(dateKey, 12 * 60).getUTCDay();
    if (weekday === 0) continue;

    for (let b = 0; b < barbers.length; b++) {
      const barber = barbers[b];
      const barberWeekdays = BARBERS[b].weekdays;
      if (!barberWeekdays.includes(weekday)) continue;

      const count = dayOffset === 0 ? 2 : 3;
      const daySlots = weekday === 6 ? slots.slice(0, 2) : slots;
      for (let s = 0; s < Math.min(count, daySlots.length); s++) {
        const minute = daySlots[(s + b) % daySlots.length];
        const startAt = zonedToUtc(dateKey, minute);
        if (startAt.getTime() < Date.now() - 2 * 60 * 60 * 1000) continue;

        const service = services[(appointmentIndex + b + s) % services.length];
        const customer = customers[(appointmentIndex + b) % customers.length];
        const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
        const isPast = startAt.getTime() < Date.now();
        const isToday = dayOffset === 0;

        let status: AppointmentStatus = "CONFIRMED";
        if (isPast) status = "COMPLETED";
        else if (isToday && s === 0) status = "CONFIRMED";
        else if (dayOffset === 2 && s === 2) status = "PENDING_PAYMENT";

        const depositCents = Math.round(service.priceCents * 0.3);
        const requiresPayment = status !== "COMPLETED" && status !== "CONFIRMED";
        const code = `NVJ-${String(1000 + appointmentIndex).padStart(4, "0")}${String.fromCharCode(65 + b)}`;

        const appointment = await prisma.appointment.create({
          data: {
            code,
            customerId: customer.id,
            barberId: barber.id,
            serviceId: service.id,
            startAt,
            endAt,
            status,
            totalCents: service.priceCents,
            depositCents,
            amountDueCents: requiresPayment ? depositCents : 0,
            currency: "GTQ",
            completedAt: status === "COMPLETED" ? endAt : null,
            createdAt: new Date(startAt.getTime() - 2 * 24 * 60 * 60 * 1000),
          },
        });

        if (status === "CONFIRMED" || status === "COMPLETED") {
          await prisma.payment.create({
            data: {
              appointmentId: appointment.id,
              provider: "MOCK",
              externalId: `SEED-PAY-${code}`,
              idempotencyKey: `seed-${code}`,
              providerRef: `SEED-${code}`,
              type: "DEPOSIT",
              status: "PAID",
              amountCents: depositCents,
              currency: "GTQ",
              cardBrand: "VISA",
              cardLast4: "4242",
              authorizationCode: `AUTH${100000 + appointmentIndex}`,
              paidAt: new Date(startAt.getTime() - 24 * 60 * 60 * 1000),
              receiptUrl: `/reserva/${code}/comprobante`,
              createdAt: new Date(startAt.getTime() - 2 * 24 * 60 * 60 * 1000),
            },
          });
        } else if (status === "PENDING_PAYMENT") {
          await prisma.payment.create({
            data: {
              appointmentId: appointment.id,
              provider: "MOCK",
              externalId: `SEED-PAY-${code}`,
              idempotencyKey: `seed-${code}`,
              providerRef: `SEED-${code}`,
              type: "DEPOSIT",
              status: "PENDING",
              amountCents: depositCents,
              currency: "GTQ",
              checkoutUrl: null,
            },
          });
        }

        appointmentIndex++;
      }
    }
  }

  console.log("Bloqueo de ejemplo (vacaciones)...");
  const vacationStart = zonedToUtc(addDaysToKey(today, 12), 0);
  const vacationEnd = zonedToUtc(addDaysToKey(today, 14), 0);
  await prisma.availability.create({
    data: {
      barberId: barbers[1].id,
      startAt: vacationStart,
      endAt: vacationEnd,
      allDay: true,
      type: "VACATION",
      reason: "Vacaciones familiares",
    },
  });

  console.log("Notificaciones de ejemplo...");
  const firstAppointment = await prisma.appointment.findFirst({
    where: { status: "CONFIRMED" },
    include: { customer: true },
    orderBy: { startAt: "asc" },
  });
  if (firstAppointment) {
    await prisma.notification.create({
      data: {
        appointmentId: firstAppointment.id,
        customerId: firstAppointment.customerId,
        channel: "EMAIL",
        type: "PAYMENT_CONFIRMED",
        recipient: firstAppointment.customer.email,
        subject: "Pago recibido · Navaja Barber Studio",
        body: "Recibimos tu pago y tu cita quedó confirmada.",
        status: "SKIPPED",
        error: "SMTP no configurado (modo desarrollo)",
        sentAt: new Date(),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: (await prisma.user.findUnique({ where: { email: "admin@navajabarber.gt" } }))?.id,
      action: "SEED_INITIALIZED",
      entity: "System",
      metadata: { services: services.length, barbers: barbers.length, appointments: appointmentIndex },
    },
  });

  console.log("✔ Seed completado");
  console.log("  Admin:    admin@navajabarber.gt / Admin123!");
  console.log("  Barbero:  carlos@navajabarber.gt / Barber123!");
  console.log("  Cliente:  cliente@demo.gt / Cliente123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
