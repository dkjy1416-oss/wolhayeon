import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listChatOrders } from "@/lib/chat/store";
import { chatToken } from "@/lib/chat/auth";
import { CHAT_PRODUCTS } from "@/lib/chat/types";
import { getChatFunnel } from "@/lib/chat/funnel";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const [rows, fn] = await Promise.all([listChatOrders(300), getChatFunnel(7)]);
  const paid = rows.filter((r) => r.pay_status === "paid");
  const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-20 pt-8">
      <h1 className="font-display text-xl font-semibold text-ivory">카톡 분석</h1>
      <p className="mt-2 text-[0.8rem] text-ivory-dim">
        주문 {rows.length}건 · 캡처 업로드 {rows.filter((r) => r.image_count > 0).length}건 · 결제 {paid.length}건 · 매출{" "}
        {paid.reduce((a, r) => a + r.amount, 0).toLocaleString()}원 (패키지의 재회 분석은 재회 주문 쪽에 12,900원·결제수단 chat_bundle로 기록)
      </p>
      {fn && (
        <section className="mt-5 rounded-2xl border border-gold-dim/30 bg-ink-soft px-4 py-4 text-[0.82rem] text-ivory-dim">
          <h2 className="text-[0.95rem] font-semibold text-ivory">최근 {fn.days}일 카톡 분석 흐름 (방문자 기준, 중복 없음)</h2>
          <ol className="mt-3 flex flex-col gap-1.5">
            {fn.steps.map((st, i) => {
              const prev = i ? fn.steps[i - 1].n : 0;
              return (
                <li key={st.label} className="flex items-center justify-between gap-3">
                  <span>{i + 1}. {st.label}</span>
                  <span className="text-ivory">
                    {st.n}명{i > 0 && prev > 0 ? <span className={st.n / prev < 0.4 ? " text-thread" : ""}> ({Math.round((st.n / prev) * 100)}%)</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2">시작 방식: 파일 {fn.startMode.file}명 · 질문 {fn.startMode.quiz}명 · 붉은 % = 앞 단계의 40% 미만만 넘어온 곳 · 기록 시작 11/3(시작·신청서 단계), 나머지는 10/31부터</p>
          {fn.bySource.length > 0 && (
            <table className="mt-3 w-full text-left">
              <thead><tr className="text-ivory"><th className="py-1 font-medium">유입</th><th>방문</th><th>시작</th><th>무료 결과</th><th>주문</th></tr></thead>
              <tbody>
                {fn.bySource.map((b) => (
                  <tr key={b.source}><td className="py-1">{b.source}</td><td>{b.visit}</td><td>{b.start}</td><td>{b.free}</td><td>{b.order}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
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
