# Navaja Barber Studio

Plataforma de reservas, pagos y administración para barbería en Guatemala. Incluye sitio público, agenda multi-paso, anticipos con tarjeta, cuenta de cliente, panel administrativo y panel de barbero.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 3
- PostgreSQL + Prisma 6
- Auth.js v5 (Credentials, JWT) + bcrypt
- Zod para validación
- date-fns + date-fns-tz (`America/Guatemala`)
- Nodemailer (SMTP) y WhatsApp Cloud API (opcionales)
- NeoNet / NeoPay (Guatemala) + proveedor MOCK para desarrollo

## Requisitos

- Node.js 20+
- PostgreSQL 15+ (o Docker)
- npm 10+

## Inicio rápido

### Todo con Docker (recomendado)

```bash
cp .env.example .env
docker compose up -d --build
docker compose run --rm migrate npx tsx prisma/seed.ts
```

Abre `http://localhost:3000`. La app, PostgreSQL y las migraciones se levantan juntos; el seed solo es necesario la primera vez.

### Desarrollo local

```bash
npm install
cp .env.example .env
docker compose up -d db
npm run db:deploy
npm run db:seed
npm run dev
```

### Variables de entorno

Copia `.env.example` a `.env` y ajusta como mínimo:

```env
DATABASE_URL="postgresql://navaja:navaja_dev_password@localhost:5433/navaja?schema=public"
AUTH_SECRET="<openssl rand -base64 32>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BUSINESS_TIMEZONE="America/Guatemala"
PAYMENT_PROVIDER="MOCK"
```

En producción usa HTTPS, un `AUTH_SECRET` nuevo, credenciales SMTP reales y `PAYMENT_PROVIDER="NEONET"` solo cuando la afiliación esté aprobada.

## Credenciales demo (seed)

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@navajabarber.gt` | `Admin123!` |
| Barbero | `carlos@navajabarber.gt` | `Barber123!` |
| Cliente | `cliente@demo.gt` | `Cliente123!` |

Cambia estas contraseñas antes de publicar.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run db:generate` | Genera Prisma Client |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:seed` | Carga datos demo |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Reinicia la base y vuelve a sembrar |

## Rutas principales

### Público
- `/` — landing
- `/reservar` — reserva multi-paso
- `/reserva/[code]` — detalle de reserva
- `/reserva/[code]/comprobante` — recibo imprimible
- `/mis-citas` — citas del cliente autenticado
- `/ingresar`, `/registro` — autenticación
- `/politicas` — términos, privacidad y cancelaciones

### Administración
- `/admin` — dashboard
- `/admin/citas`, `/admin/citas/nueva`, `/admin/citas/[id]`
- `/admin/calendario`
- `/admin/clientes`, `/admin/clientes/[id]`
- `/admin/servicios`, `/admin/servicios/nuevo`, `/admin/servicios/[id]`
- `/admin/barberos`, `/admin/barberos/nuevo`, `/admin/barberos/[id]`
- `/admin/horarios`
- `/admin/pagos`
- `/admin/configuracion`
- `/admin/auditoria`

### Barbero
- `/barbero` — dashboard
- `/barbero/agenda`
- `/barbero/disponibilidad`

## Pagos

El flujo está diseñado para que los datos de tarjeta **nunca** pasen por el servidor de la aplicación:

1. Se crea una `Payment` y una `Appointment` en estado `PENDING_PAYMENT`.
2. El proveedor devuelve una URL de checkout alojado.
3. El cliente paga en el dominio del proveedor.
4. El webhook firmado confirma el pago y actualiza la cita a `CONFIRMED`.
5. Los webhooks son idempotentes por `PaymentEvent.eventId`.

### MOCK

`PAYMENT_PROVIDER="MOCK"` permite probar todo el flujo sin cargo real. El panel mock confirma el pago desde `/pago/mock/[paymentId]`.

### NeoNet

La integración vive en `src/lib/payments/neonet.ts` y requiere:

- Contrato/afiliación comercial con NeoNet.
- Terminal y credenciales (`NEONET_*`).
- Certificación del sitio y URL de webhook pública HTTPS.
- Validación de firma HMAC y conciliación de montos.

Completa `NEONET_CHECKOUT_URL`, `NEONET_AFFILIATION`, `NEONET_TERMINAL`, `NEONET_SIGNING_KEY` y `NEONET_WEBHOOK_SECRET`. El estado se muestra en `/admin/configuracion`.

> La integración NeoNet incluida es una base configurable. Antes de producción debe certificarse contra la documentación y el entorno de NeoNet.

## Recordatorios

`GET /api/cron/reminders` encola y despacha recordatorios. Protege el endpoint con:

```http
Authorization: Bearer <CRON_SECRET>
```

Configura un cron (Vercel Cron, GitHub Actions, cron-job.org, etc.) cada 5–15 minutos. Sin SMTP/WhatsApp configurados, las notificaciones quedan registradas en base de datos y consola.

## Seguridad

- Anticipos y confirmaciones solo se aceptan desde el servidor o webhooks verificados.
- Firma HMAC y comparación en tiempo constante para webhooks.
- Idempotencia de eventos de pago.
- Verificación de monto contra la cita.
- Bloqueo de doble reserva con transacción + advisory lock + constraint `EXCLUDE` en PostgreSQL.
- Roles `ADMIN`, `BARBER`, `CUSTOMER`; acciones administrativas con `requireRole`/`requireBarber`.
- Registro de auditoría en `AuditLog` para acciones sensibles.
- Rate limiting básico en reservas (en memoria; para multi-instancia usar Redis/Upstash).
- Nunca se almacenan números completos de tarjeta ni CVV.

## Docker

`docker compose` levanta tres servicios:

| Servicio | Función |
| --- | --- |
| `db` | PostgreSQL 16 con volumen persistente |
| `migrate` | Aplica `prisma migrate deploy` y termina |
| `app` | Next.js en modo standalone, puerto `3000` |

Comandos útiles:

```bash
docker compose up -d --build          # construir y levantar todo
docker compose logs -f app            # logs de la app
docker compose ps                     # estado y salud
docker compose down                   # detener (conserva datos)
docker compose down -v                # detener y borrar la base
docker compose run --rm migrate npx tsx prisma/seed.ts   # datos demo
docker compose run --rm migrate npx prisma migrate deploy # migrar manualmente
```

La app expone `GET /api/health` para healthchecks. El contenedor usa un usuario no root y `output: "standalone"`.

### Variables para producción

Antes de construir la imagen, define en `.env`:

```env
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
NEXTAUTH_URL="https://tu-dominio.com"
AUTH_SECRET="<secreto-largo-y-único>"
POSTGRES_PASSWORD="<contraseña-fuerte>"
```

`NEXT_PUBLIC_APP_URL` se incrusta en el build; si cambia el dominio, reconstruye con `docker compose up -d --build`.

## Despliegue

### Opción Docker (VPS, Render, Railway, Fly.io, Coolify)

1. Sube el repositorio a GitHub.
2. Crea el servicio usando el `Dockerfile` incluido.
3. Configura las variables de entorno de producción.
4. Ejecuta las migraciones (`docker compose run --rm migrate npx prisma migrate deploy` o el comando equivalente del proveedor).
5. Si es la primera vez, ejecuta el seed o crea el administrador manualmente.
6. Configura HTTPS, dominio y `NEXT_PUBLIC_APP_URL`.
7. Verifica `/api/health`, webhooks de pago y cron de recordatorios.
8. Cambia las contraseñas demo y revisa `/admin/auditoria`.

### Opción Node directo

1. Provisiona PostgreSQL administrado.
2. Configura todas las variables de entorno.
3. Ejecuta `npm run db:deploy` y, si es la primera vez, `npm run db:seed`.
4. `npm run build` y `npm start` (o despliega en Vercel/Render/Fly.io).
5. Configura HTTPS, dominio y `NEXT_PUBLIC_APP_URL`.
6. Verifica webhooks de pago y cron de recordatorios.
7. Cambia las contraseñas demo y revisa `/admin/auditoria`.

## Estructura

```text
prisma/                 esquema, migraciones y seed
src/app/                rutas App Router
  (site)/               sitio público
  (auth)/               login y registro
  admin/                panel administrativo + server actions
  barbero/              panel de barbero
  api/                  endpoints REST y webhooks
src/components/         UI, booking, admin, payments
src/lib/                lógica de negocio, pagos, fechas, auth
```
