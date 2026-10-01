import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getLatestPromo } from "@/lib/promo-report";
import PromoBoard from "@/components/admin/PromoBoard";

export const dynamic = "force-dynamic";

/** /admin/promo — 데이터 기반 홍보 제안 (하루 1번 자동 갱신) + 추적 링크 */
export default async function AdminPromoPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const latest = await getLatestPromo();
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-24 pt-8 text-ivory">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-xl font-semibold">홍보 제안</h1>
        <Link href="/admin/marketing" className="text-[0.78rem] text-gold underline underline-offset-4">
          마케팅 숫자 보기 →
        </Link>
      </div>
      <p className="mb-6 mt-2 text-[0.74rem] text-ivory-dim">
        최근 14일 방문·신청·결제 데이터를 월화 AI가 읽고, 누구에게 어디서 어떻게 홍보할지 제안해요. 하루에 한 번 자동으로 새로 만들어져요.
      </p>
      <PromoBoard initial={latest} />
    </main>
  );
}
