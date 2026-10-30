import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("h-10 w-10", className)}
    >
      <circle cx="24" cy="24" r="22" stroke="url(#brand-gold)" strokeWidth="1.4" />
      <path
        d="M15 33V15h3.2l11.4 12.9V15H33v18h-3.1L18.4 20.1V33H15Z"
        fill="url(#brand-gold)"
      />
      <path d="M12 38.5h24" stroke="url(#brand-gold)" strokeWidth="1" opacity="0.7" />
      <defs>
        <linearGradient id="brand-gold" x1="8" y1="8" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f4ead2" />
          <stop offset="0.5" stopColor="#cfa64b" />
          <stop offset="1" stopColor="#a6752e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandLockup({
  name = "Navaja",
  sub = "Barber Studio",
  className,
}: {
  name?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <BrandMark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg tracking-[0.18em] text-stone-50 uppercase">{name}</span>
        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.38em] text-gold-400">
          {sub}
        </span>
      </span>
    </span>
  );
}
