import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin/orders");
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6">
      <p className="text-xs tracking-[0.35em] text-gold/90">月下緣 ADMIN</p>
      <h1 className="font-display mb-10 mt-4 text-xl font-semibold text-ivory">
        관리자 로그인
      </h1>
      <LoginForm />
    </main>
  );
}
