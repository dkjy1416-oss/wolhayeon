import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import RemindConsole from "@/components/admin/RemindConsole";

export const dynamic = "force-dynamic";

/** /admin/remind — 미결제 리마인드 메일 (관리자 로그인 필요) */
export default async function AdminRemindPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return <RemindConsole />;
}
