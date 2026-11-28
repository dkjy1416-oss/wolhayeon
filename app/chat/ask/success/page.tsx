import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmAskPayment } from "@/lib/chat/ask";
import { chatToken } from "@/lib/chat/auth";

export const dynamic = "force-dynamic";

/** 11/28: '월화에게 묻기' 추가 결제 승인 → 결과 화면의 질문 칸으로 */
export default async function ChatAskPaySuccess({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const r = await confirmAskPayment(await searchParams);
  if (r.ok) redirect(`/chat/result/${r.orderNumber}?t=${encodeURIComponent(chatToken("result", r.orderNumber) ?? "")}&asked=1#ask`);
  return (
    <main className="fx-grain bg-[#0e0b0d] mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-[1.3rem] font-semibold text-ivory">결제를 완료하지 못했어요</h1>
      <p className="mt-4 text-[0.9rem] leading-[1.9] text-ivory-dim">
        {r.ok ? "" : r.message}
        <br />
        금액이 빠져나갔다면 자동으로 취소되거나, 고객센터로 알려 주시면 바로 확인해 드려요.
      </p>
      <Link href="/chat" className="mt-8 text-[0.9rem] text-[#e46b8a] underline underline-offset-4">
        처음으로
      </Link>
    </main>
  );
}
