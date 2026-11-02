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
# Edita .env y define AUTH_SECRET, CRON_SECRET, POSTGRES_PASSWORD y POSTGRES_APP_PASSWORD.
# Genera secretos con: openssl rand -base64 48
docker compose up -d --build
docker compose run --rm -e ALLOW_DEMO_SEED=true migrate npx tsx prisma/seed.ts
```

Abre `http://localhost:3000`. La app, PostgreSQL, el rol de aplicación y las migraciones se levantan juntos; el seed demo es opcional, solo para una base local vacía, y borra todos sus datos antes de cargar ejemplos.

### Desarrollo local

```bash
npm install
cp .env.example .env
# Define los mismos secretos que en el paso de Docker.
docker compose up -d db db-init
npm run db:deploy
ALLOW_DEMO_SEED=true npm run db:seed
npm run dev
```

`DATABASE_URL` usa el rol limitado `navaja_app`; `MIGRATE_DATABASE_URL` usa el dueño de la base y solo se emplea para migraciones/seed. La app no necesita privilegios de dueño.

### Variables de entorno

Copia `.env.example` a `.env` y ajusta como mínimo:

```env
DATABASE_URL="postgresql://navaja_app:<app-password>@localhost:5433/navaja?schema=public"
MIGRATE_DATABASE_URL="postgresql://navaja:<owner-password>@localhost:5433/navaja?schema=public"
POSTGRES_APP_USER="navaja_app"
POSTGRES_APP_PASSWORD="<app-password>"
AUTH_SECRET="<openssl rand -base64 48>"
CRON_SECRET="<otro-secreto-largo>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BUSINESS_TIMEZONE="America/Guatemala"
PAYMENT_PROVIDER="MOCK"
```

En producción usa HTTPS, secretos nuevos, credenciales SMTP reales y `PAYMENT_PROVIDER="NEONET"` solo cuando la afiliación esté aprobada. La app valida la configuración al arrancar y se niega a iniciar con secretos de ejemplo, `PAYMENT_PROVIDER="MOCK"` o `DATABASE_URL` insegura.

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

`PAYMENT_PROVIDER="MOCK"` permite probar el flujo local sin cargo real. Está bloqueado en producción; el panel mock confirma pagos únicamente en desarrollo.

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
- RLS de PostgreSQL activado en todas las tablas. La app usa `navaja_app` (sin privilegios de dueño); migraciones y seed usan el dueño desde `MIGRATE_DATABASE_URL`.
- Contexto RLS por petición (`SYSTEM`, `ADMIN`, `BARBER`, `CUSTOMER`, `ANON`) con `app.user_id`, `app.customer_id` y `app.barber_id`; el cliente Prisma abre una transacción por consulta y aplica `set_config(..., true)`.
- Políticas de mínimo privilegio: catálogo público, citas/pagos propios para clientes, agenda propia para barberos y acceso total solo para `ADMIN`/`SYSTEM`.
- Cabeceras de seguridad (`nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS en producción) y cookies de sesión `HttpOnly`/`SameSite=Lax`, con `Secure` cuando el sitio usa HTTPS.
- Validación de entorno al arrancar: rechaza secretos de ejemplo, `DATABASE_URL` débil y configuración incompleta de NeoNet/SMTP.
- Registro de auditoría en `AuditLog` para acciones sensibles.
- Rate limiting básico en reservas (en memoria; para multi-instancia usar Redis/Upstash).
- Los códigos de reserva nuevos tienen 120 bits aleatorios; la migración `20261102003000_rotate_weak_public_tokens` también renueva los códigos antiguos cortos y actualiza sus enlaces almacenados.
- Configura el proxy de borde para reemplazar o añadir de forma confiable `X-Forwarded-For`; la app usa el último salto para limitar consultas.
- En Compose, la app y PostgreSQL solo publican puertos en `127.0.0.1`; expón el sitio a Internet mediante un proxy HTTPS que sobrescriba o añada `X-Forwarded-For` de forma confiable.
- El webhook NeoNet requiere HMAC-SHA256 del cuerpo sin modificar en `x-neonet-signature`, `x-signature` o `x-webhook-signature`; no se acepta un secreto en la URL.
- Nunca se almacenan números completos de tarjeta ni CVV.

### RLS y roles de base de datos

- `navaja_app`: rol de ejecución de la app. No es dueño de las tablas y está sujeto a RLS.
- Dueño (`POSTGRES_USER`): aplica migraciones y seed; no lo uses en `DATABASE_URL` de la app.
- El script `docker/init-app-role.sh` crea/actualiza `navaja_app` y sus grants en Docker.
- En PostgreSQL administrado, crea el rol manualmente y ejecuta los grants del script antes de desplegar. No actives `FORCE ROW LEVEL SECURITY` sobre el dueño: el seed y las migraciones deben seguir funcionando.
- Prueba de humo: sin contexto, `SELECT count(*) FROM "Customer"` como `navaja_app` debe devolver `0`; con `SET app.user_role = 'SYSTEM'` debe devolver las filas.

## Docker

`docker compose` levanta cuatro servicios:

| Servicio | Función |
| --- | --- |
| `db` | PostgreSQL 16 con volumen persistente |
| `db-init` | Crea/actualiza el rol `navaja_app` y sus grants |
| `migrate` | Aplica `prisma migrate deploy` con el dueño y termina |
| `app` | Next.js en modo standalone, conectado como `navaja_app`, puerto `3000` |

Comandos útiles:

```bash
docker compose up -d --build          # construir y levantar todo
docker compose logs -f app            # logs de la app
docker compose ps                     # estado y salud
docker compose down                   # detener (conserva datos)
docker compose down -v                # detener y borrar la base
docker compose run --rm -e ALLOW_DEMO_SEED=true migrate npx tsx prisma/seed.ts   # solo base local vacía; elimina datos
docker compose run --rm migrate npx prisma migrate deploy # migrar manualmente
```

La app expone `GET /api/health` para healthchecks. El contenedor usa un usuario no root y `output: "standalone"`.

### Variables para producción

Antes de construir la imagen, define en `.env`:

```env
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
NEXTAUTH_URL="https://tu-dominio.com"
AUTH_SECRET="<secreto-largo-y-único>"
CRON_SECRET="<secreto-largo-y-único>"
DATABASE_URL="postgresql://navaja_app:<app-password>@db:5432/navaja?schema=public"
MIGRATE_DATABASE_URL="postgresql://navaja:<owner-password>@db:5432/navaja?schema=public"
POSTGRES_PASSWORD="<contraseña-fuerte>"
POSTGRES_APP_PASSWORD="<contraseña-fuerte-app>"
```

No reutilices la contraseña del dueño para la app. Si cambias `AUTH_SECRET`, todas las sesiones activas se invalidan.

`NEXT_PUBLIC_APP_URL` se incrusta en el build; si cambia el dominio, reconstruye con `docker compose up -d --build`.

## Despliegue

### Opción Docker (VPS, Render, Railway, Fly.io, Coolify)

1. Sube el repositorio a GitHub.
2. Crea el servicio usando el `Dockerfile` incluido.
3. Configura las variables de entorno de producción (incluye `MIGRATE_DATABASE_URL` y el rol `navaja_app`).
4. Crea el rol de app y ejecuta los grants de `docker/init-app-role.sh` (en Docker Compose se hace automáticamente con `db-init`).
5. Ejecuta las migraciones (`docker compose run --rm migrate npx prisma migrate deploy` o el comando equivalente del proveedor).
6. Si es la primera vez, ejecuta el seed o crea el administrador manualmente.
7. Configura HTTPS, dominio y `NEXT_PUBLIC_APP_URL`.
8. Verifica `/api/health`, webhooks de pago y cron de recordatorios.
9. Cambia las contraseñas demo y revisa `/admin/auditoria`.

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
