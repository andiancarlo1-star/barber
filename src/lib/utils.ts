import { randomBytes } from "crypto";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(prefix = "NVJ"): string {
  // 24 base32 characters provide 120 bits of entropy for the public lookup URL.
  const bytes = randomBytes(24);
  let code = "";
  for (let i = 0; i < bytes.length; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `${prefix}-${code}`;
}

export function generateExternalId(prefix = "PAY"): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(16).toString("hex").toUpperCase()}`;
}

export function absoluteUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function whatsappLink(phone: string, message?: string): string {
  const clean = normalizePhone(phone).replace(/^\+/, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${clean}${text}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) return false;
    try {
      return new URL(referer).host === request.headers.get("host");
    } catch {
      return false;
    }
  }
  try {
    const host = request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(headersOrRequest: { get(name: string): string | null } | { headers: Headers }): string {
  const headers = "headers" in headersOrRequest ? headersOrRequest.headers : headersOrRequest;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // A trusted edge proxy should append/replace this header. Taking the final
    // hop prevents clients from bypassing limits by prepending fake addresses.
    const hops = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return "unknown";
}

export async function readRequestText(request: Request, maxBytes: number): Promise<string | null> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
