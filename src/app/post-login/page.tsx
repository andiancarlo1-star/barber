import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-helpers";

export default async function PostLoginPage() {
  const user = await getSessionUser();
  if (!user) redirect("/ingresar");

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "BARBER") redirect("/barbero");
  redirect("/mis-citas");
}
