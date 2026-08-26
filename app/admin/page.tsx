import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminIndex() {
  redirect((await isAdminAuthenticated()) ? "/admin/orders" : "/admin/login");
}
