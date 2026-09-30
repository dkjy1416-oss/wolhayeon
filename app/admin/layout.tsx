import type { Metadata } from "next";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";

/** 관리자 화면 전체: 검색엔진 색인 금지 */
export const metadata: Metadata = {
  title: "월하연 관리자",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authed = await isAdminAuthenticated();
  return (
    <>
      {authed && <AdminNav />}
      {children}
    </>
  );
}
