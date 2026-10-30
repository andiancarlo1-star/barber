import { requireBarber } from "@/lib/auth-helpers";
import { formatDateLong } from "@/lib/dates";
import { StaffShell } from "@/components/admin/staff-shell";

export const dynamic = "force-dynamic";

export default async function BarberLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireBarber();
  return (
    <StaffShell
      variant="barber"
      user={{ name: user.name, email: user.email, role: user.role }}
      todayLabel={formatDateLong(new Date())}
    >
      {children}
    </StaffShell>
  );
}
