import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth-helpers";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const [settings, schedules] = await Promise.all([
    getSettings(),
    prisma.schedule.findMany({ orderBy: { weekday: "asc" } }).catch(() => []),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        businessName={settings.businessName}
        user={user ? { name: user.name, role: user.role } : null}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} schedules={schedules} />
    </div>
  );
}
