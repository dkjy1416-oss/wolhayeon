import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listChatOrders } from "@/lib/chat/store";
import { chatToken } from "@/lib/chat/auth";
import { CHAT_PRODUCTS } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const rows = await listChatOrders(300);
  const paid = rows.filter((r) => r.pay_status === "paid");
  const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-20 pt-8">
      <h1 className="font-display text-xl font-semibold text-ivory">카톡 분석</h1>
      <p className="mt-2 text-[0.8rem] text-ivory-dim">
        주문 {rows.length}건 · 캡처 업로드 {rows.filter((r) => r.image_count > 0).length}건 · 결제 {paid.length}건 · 매출{" "}
        {paid.reduce((a, r) => a + r.amount, 0).toLocaleString()}원 (패키지의 재회 분석은 재회 주문 쪽에 12,900원·결제수단 chat_bundle로 기록)
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.order_number} className="rounded-xl border border-gold-dim/25 bg-ink-soft px-4 py-3 text-[0.8rem] text-ivory-dim">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display tracking-wider text-gold">{r.order_number}</span>
              <span>{kst(r.created_at)}</span>
            </div>
            <p className="mt-1 text-ivory">
              {r.name || "(이름 없음)"} · {r.email} · {r.birth_year ? `${r.birth_year}년생` : ""} · {CHAT_PRODUCTS[r.product].name} {r.amount.toLocaleString()}원
            </p>
            <p className="mt-0.5">
              결제 {r.pay_status} · 캡처 {r.image_count}장{r.images_deleted_at ? "(삭제됨)" : ""} · 생성 {r.gen_status} · 메일 {r.email_sent_at ? "발송" : "-"} · 무료 유형 {r.free_type}
              {r.bundle_redeemed_order && ` · 재회 분석 ${r.bundle_redeemed_order}`}
              {r.utm && ` · 유입 ${Object.values(r.utm).filter(Boolean).join(" / ")}`}
            </p>
            <Link href={`/admin/chat/preview/${r.order_number}`} className="mr-3 mt-1 inline-block text-gold underline underline-offset-4">
              {r.result || r.preview_result ? "AI 결과 미리보기" : "AI 결과 미리 만들기"}
            </Link>
            {r.pay_status === "paid" && r.result && (
              <Link href={`/chat/result/${r.order_number}?t=${chatToken("result", r.order_number)}`} className="mt-1 inline-block text-gold underline underline-offset-4" target="_blank">
                결과 보기
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
