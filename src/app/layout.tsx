import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Navaja Barber Studio · Reserva tu cita en Guatemala",
    template: "%s · Navaja Barber Studio",
  },
  description:
    "Barbería boutique en Zona 14, Ciudad de Guatemala. Reserva tu corte, barba o ritual premium en línea y paga con tarjeta de forma segura.",
  keywords: [
    "barbería Guatemala",
    "reservar cita barbería",
    "corte de cabello Guatemala",
    "barber shop Zona 14",
    "Navaja Barber Studio",
  ],
  openGraph: {
    title: "Navaja Barber Studio",
    description: "Cortes de autor en el corazón de Guatemala. Reserva en línea.",
    type: "website",
    locale: "es_GT",
    siteName: "Navaja Barber Studio",
    images: [
      {
        url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Navaja Barber Studio",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070707",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-ink-950 font-sans antialiased">{children}</body>
    </html>
  );
}
