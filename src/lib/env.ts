import { z } from "zod";

const productionSchema = z.object({
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET debe tener al menos 32 caracteres")
    .refine((value) => !/dev-only|change-me|example/i.test(value), {
      message: "AUTH_SECRET sigue usando un valor de ejemplo",
    }),
  CRON_SECRET: z
    .string()
    .min(24, "CRON_SECRET debe tener al menos 24 caracteres")
    .refine((value) => !/dev-|change-me|example/i.test(value), {
      message: "CRON_SECRET sigue usando un valor de ejemplo",
    }),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL es obligatorio")
    .refine(
      (value) => !/dev_password|dev-only|change-me|example/i.test(value),
      { message: "DATABASE_URL usa un valor de ejemplo" },
    ),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  PAYMENT_PROVIDER: z.enum(["MOCK", "NEONET"]).default("MOCK"),
  NEONET_SIGNING_KEY: z.string().optional(),
  NEONET_WEBHOOK_SECRET: z.string().optional(),
  NEONET_AFFILIATION: z.string().optional(),
  NEONET_TERMINAL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  BOOKING_RATE_LIMIT: z.coerce.number().int().positive().max(1000).default(10),
  POSTGRES_APP_PASSWORD: z
    .string()
    .min(24, "POSTGRES_APP_PASSWORD debe tener al menos 24 caracteres")
    .refine((value) => !/change-me|example|dev_password/i.test(value), {
      message: "POSTGRES_APP_PASSWORD usa un valor de ejemplo",
    })
    .optional(),
});

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const parsed = productionSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuración de producción inválida:\n${issues}`);
  }

  const appUrl = parsed.data.NEXT_PUBLIC_APP_URL;
  if (appUrl && !/^https:\/\//.test(appUrl) && !/^http:\/\/localhost(:\d+)?$/.test(appUrl)) {
    throw new Error("NEXT_PUBLIC_APP_URL debe usar HTTPS en producción");
  }

  if (parsed.data.PAYMENT_PROVIDER === "NEONET") {
    for (const key of [
      "NEONET_SIGNING_KEY",
      "NEONET_WEBHOOK_SECRET",
      "NEONET_AFFILIATION",
      "NEONET_TERMINAL",
    ] as const) {
      if (!parsed.data[key]) {
        throw new Error(`${key} es obligatorio cuando PAYMENT_PROVIDER=NEONET`);
      }
    }
  }

  if (parsed.data.PAYMENT_PROVIDER === "MOCK" && !isMockPaymentsAllowed()) {
    throw new Error("PAYMENT_PROVIDER=MOCK no está permitido en producción");
  }

  if (parsed.data.SMTP_HOST && parsed.data.SMTP_USER && !parsed.data.SMTP_PASSWORD) {
    throw new Error("SMTP_PASSWORD es obligatorio cuando SMTP_USER está configurado");
  }
}

export function isMockPaymentsAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (!configuredUrl) return false;
  try {
    const hostname = new URL(configuredUrl).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}
