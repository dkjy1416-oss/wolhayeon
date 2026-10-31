import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getChatOrder } from "@/lib/chat/store";
import { CHAT_ORDER_RE } from "@/lib/chat/types";
import ChatResultView from "@/components/chat/ChatResultView";
import ChatPreviewButton from "@/components/admin/ChatPreviewButton";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function AdminChatPreview({ params }: { params: Promise<{ orderNumber: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const { orderNumber } = await params;
  if (!CHAT_ORDER_RE.test(orderNumber)) redirect("/admin/chat");
  const o = await getChatOrder(orderNumber);
  if (!o) redirect("/admin/chat");
  const r = o.result ?? o.preview_result ?? null;
  return (
    <main className="paper min-h-[100svh] px-5 pb-24 pt-8">
      <div className="mx-auto max-w-[620px]">
        <Link href="/admin/chat" className="text-xs text-ivory-dim">← 카톡 분석 목록</Link>
        <div className="mt-3 rounded-xl border border-thread/40 bg-thread/5 px-4 py-3 text-[0.8rem] leading-[1.7] text-ivory">
          관리자 미리보기 · {orderNumber} · {o.pay_status === "paid" ? "결제 완료 주문의 실제 결과" : "결제 전 — 손님에게는 보이지 않아요"}
          <br />
          {o.source === "file" ? "대화 파일" : "캡처"}로 분석 · AI 호출 1번마다 API 비용이 들어요.
          {o.preview_at && ` 마지막 생성 ${new Date(o.preview_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
        </div>
        {o.pay_status !== "paid" && (
          <div className="mt-3">
            <ChatPreviewButton orderNumber={orderNumber} again={!!o.preview_result} />
          </div>
        )}
      </div>
      {r ? (
        <div className="mt-8">
          <ChatResultView o={o} r={r} orderNumber={orderNumber} bundleHref={null} />
        </div>
      ) : (
        <p className="mx-auto mt-10 max-w-[620px] text-[0.9rem] text-ivory-dim">아직 만든 결과가 없어요. 위 버튼을 눌러 주세요.</p>
      )}
    </main>
  );
}
