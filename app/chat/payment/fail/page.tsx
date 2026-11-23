import Link from "next/link";
import { CHAT_ORDER_RE } from "@/lib/chat/types";
import { redirect } from "next/navigation";
import { getChatOrder } from "@/lib/chat/store";
import { createContinueToken } from "@/lib/cs-auth";

export default async function ChatPayFail({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; orderId?: string; t?: string; message?: string; code?: string }>;
}) {
  const p = await searchParams;
  /* 11/23: 재회 결제 시트의 묶음 결제를 취소 → 그 미리보기로 돌아가 결제 시트·월화 팝업 */
  const oid = (p as { orderId?: string }).orderId ?? p.order;
  if (oid && CHAT_ORDER_RE.test(oid)) {
    const co = await getChatOrder(oid);
    const ct = co?.combo_ritual_order ? createContinueToken(co.combo_ritual_order) : null;
    if (co?.combo_ritual_order && ct)
      redirect(`/apply/preview?order=${co.combo_ritual_order}&ct=${encodeURIComponent(ct)}&cancelled=1&pay=combo`);
  }
  const back = p.order && CHAT_ORDER_RE.test(p.order) && p.t ? `/chat/order/${p.order}?t=${encodeURIComponent(p.t)}` : "/chat";
  const cancel = p.code === "PAY_PROCESS_CANCELED" || p.code === "USER_CANCEL";
  return (
    <main className="fx-grain bg-[#0e0b0d] mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-[1.3rem] font-semibold text-ivory">{cancel ? "결제를 취소했어요" : "결제가 완료되지 않았어요"}</h1>
      <p className="mt-4 text-[0.9rem] leading-[1.9] text-ivory-dim">
        올린 캡처와 답변은 그대로 있어요. 다시 결제할 수 있어요.
        {!cancel && p.message ? (
          <>
            <br />
            <span className="text-[0.8rem]">({p.message.slice(0, 80)})</span>
          </>
        ) : null}
      </p>
      <Link href={back} className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-semibold text-ivory">
        다시 결제하기
      </Link>
    </main>
  );
}
