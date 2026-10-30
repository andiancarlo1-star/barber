"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  variant = "gold",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "gold" | "outline" | "ghost" | "dark" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function ConfirmButton({
  children,
  confirm,
  name,
  value,
  variant = "dark",
  className,
  title,
}: {
  children: React.ReactNode;
  confirm: string;
  name?: string;
  value?: string;
  variant?: "gold" | "outline" | "ghost" | "dark" | "danger" | "success";
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name={name}
      value={value}
      variant={variant}
      size="sm"
      className={className}
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </Button>
  );
}
