import { requireRole } from "@/lib/auth-helpers";
import { formatDateLong } from "@/lib/dates";
import { StaffShell } from "@/components/admin/staff-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN"], "/admin");
  return (
    <StaffShell
      variant="admin"
      user={{ name: user.name, email: user.email, role: user.role }}
      todayLabel={formatDateLong(new Date())}
    >
      {children}
    </StaffShell>
  );
}
