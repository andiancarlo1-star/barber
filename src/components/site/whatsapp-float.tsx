"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { whatsappLink } from "@/lib/utils";

export function WhatsAppFloat({ phone, businessName }: { phone: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 no-print">
      {open ? (
        <div className="w-72 animate-fade-up rounded-2xl border border-white/10 bg-ink-850 p-5 shadow-card">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-stone-100">{businessName}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-stone-500 hover:text-white"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-400">
            ¿Dudas con tu cita? Escríbenos por WhatsApp y te ayudamos a reservar.
          </p>
          <a
            href={whatsappLink(phone, "Hola, quiero información para reservar una cita en Navaja Barber Studio.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-xs font-semibold text-[#072b14] transition hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp
          </a>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-[#072b14] shadow-[0_12px_30px_-8px_rgba(37,211,102,0.6)] transition hover:scale-105"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
