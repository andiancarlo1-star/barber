import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS, STATUS_LABELS } from "@/lib/constants";

type Variant = "gold" | "outline" | "ghost" | "dark" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  gold: "bg-gold-gradient text-ink-950 shadow-gold hover:brightness-110 active:brightness-95 font-semibold",
  outline:
    "border border-gold-500/40 text-gold-200 hover:border-gold-400 hover:bg-gold-500/10",
  ghost: "text-stone-300 hover:bg-white/5 hover:text-white",
  dark: "border border-white/10 bg-ink-800 text-stone-100 hover:border-white/20 hover:bg-ink-700",
  danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  success: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-13 px-7 text-sm rounded-xl gap-2.5",
  icon: "h-10 w-10 rounded-xl",
};

export function buttonClasses(options: { variant?: Variant; size?: Size; className?: string } = {}) {
  const { variant = "gold", size = "md", className } = options;
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input-dark", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input-dark min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input-dark appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label-dark">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-stone-500">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "green" | "red" | "blue" | "amber";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-stone-300",
    gold: "border-gold-500/30 bg-gold-500/10 text-gold-200",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    blue: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "CONFIRMED" || status === "PAID"
      ? "green"
      : status === "PENDING_PAYMENT" || status === "PENDING" || status === "PROCESSING"
        ? "amber"
        : status === "COMPLETED"
          ? "blue"
          : status === "CANCELLED" || status === "FAILED" || status === "NO_SHOW"
            ? "red"
            : "neutral";
  return <Badge tone={tone}>{STATUS_LABELS[status] ?? PAYMENT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card-dark", className)}>{children}</div>;
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "error" | "warning";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-sky-500/25 bg-sky-500/10 text-sky-200",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    error: "border-red-500/25 bg-red-500/10 text-red-200",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1", "text-[13px] opacity-90")}>{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-stone-500">{icon}</div> : null}
      <p className="font-display text-xl text-stone-200">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm text-stone-500">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
      {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
      <h2 className="text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">{title}</h2>
      {description ? <p className="mt-5 text-base leading-relaxed text-stone-400">{description}</p> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("hairline", className)} />;
}
