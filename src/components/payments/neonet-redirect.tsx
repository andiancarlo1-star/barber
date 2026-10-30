"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";

export function NeonetRedirect({
  action,
  fields,
}: {
  action: string;
  fields: Record<string, string>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => formRef.current?.submit(), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <form ref={formRef} method="POST" action={action} className="text-center">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className="text-sm text-stone-400">Conectando con NeoNet de forma segura…</p>
      <div className="mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-shimmer bg-gold-gradient bg-[length:200%_100%]" />
      </div>
      <Button type="submit" variant="outline" className="mt-6">
        Continuar al pago
      </Button>
    </form>
  );
}
