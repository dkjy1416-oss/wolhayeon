import Link from "next/link";
import { after } from "next/server";
import { confirmChatPayment, processChatOrder } from "@/lib/chat/process";
import { chatToken } from "@/lib/chat/auth";
import ChatProcessing from "@/components/chat/ChatProcessing";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ChatPaySuccess({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const p = await searchParams;
  const r = await confirmChatPayment(p);
  if (r.status !== "paid") {
    return (
      <main className="fx-grain bg-[#0e0b0d] mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-[1.3rem] font-semibold text-ivory">결제를 완료하지 못했어요</h1>
        <p className="mt-4 text-[0.9rem] leading-[1.9] text-ivory-dim">
          {r.status === "failed" ? r.message : "결제 정보를 확인할 수 없어요."}
          <br />
          금액이 빠져나갔다면 자동으로 취소되거나, 고객센터로 알려 주시면 바로 확인해 드려요.
        </p>
        <Link href="/chat" className="mt-8 text-[0.9rem] text-[#e46b8a] underline underline-offset-4">
          처음으로
        </Link>
      </main>
    );
  }
  /* 손님이 창을 닫아도 서버에서 분석 시작 */
  after(() => processChatOrder(r.orderNumber).then(() => undefined));
  return (
    <main className="fx-grain bg-[#0e0b0d] min-h-[100svh]">
      <ChatProcessing orderNumber={r.orderNumber} token={chatToken("order", r.orderNumber) ?? ""} />
    </main>
  );
}
