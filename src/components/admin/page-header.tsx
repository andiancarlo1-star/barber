import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string; icon?: ReactNode } | ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h2 className="font-display text-2xl text-stone-50 sm:text-3xl">{title}</h2>
        {description ? <p className="mt-1.5 text-xs text-stone-500">{description}</p> : null}
      </div>
      {action ? (
        <div className="shrink-0">
          {action && typeof action === "object" && "href" in action ? (
            <Link href={action.href} className={buttonClasses({ variant: "gold", size: "sm" })}>
              {action.icon}
              {action.label}
            </Link>
          ) : (
            action
          )}
        </div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "gold" | "green" | "red" | "blue";
}) {
  const tones = {
    neutral: "text-stone-300",
    gold: "text-gold-300",
    green: "text-emerald-300",
    red: "text-red-300",
    blue: "text-sky-300",
  };
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850/70 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">{label}</p>
        {icon ? <span className="text-stone-600">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 font-display text-2xl", tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-stone-600">{hint}</p> : null}
    </div>
  );
}
