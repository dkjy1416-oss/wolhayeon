import type { Metadata } from "next";
import ChatResultView from "@/components/chat/ChatResultView";
import { notFound } from "next/navigation";
import { verifyChatToken, chatToken } from "@/lib/chat/auth";
import { getChatOrder } from "@/lib/chat/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "카톡 대화 분석 결과 | 월하연", robots: { index: false } };

const VIEW_DAYS = 30;

export default async function ChatResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { orderNumber } = await params;
  const { t } = await searchParams;
  if (!verifyChatToken("result", orderNumber, t)) notFound();
  const o = await getChatOrder(orderNumber);
  if (!o || o.pay_status !== "paid") notFound();
  const expired = o.paid_at && Date.now() - new Date(o.paid_at).getTime() > VIEW_DAYS * 86400000;
  const r = o.result;

  if (expired || !r)
    return (
      <main className="paper mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-[0.95rem] text-ivory">{expired ? `열람 기간(${VIEW_DAYS}일)이 지났어요.` : "결과를 준비하고 있어요. 잠시 후 다시 열어 주세요."}</p>
      </main>
    );

  const bundleHref =
    o.product === "chat_bundle" && !o.bundle_redeemed_order ? `/chat/bundle?o=${orderNumber}&t=${encodeURIComponent(chatToken("bundle", orderNumber) ?? "")}` : null;

  return (
    <main className="paper min-h-[100svh] px-5 pb-24 pt-10">
      <ChatResultView o={o} r={r} orderNumber={orderNumber} bundleHref={bundleHref} />
    </main>
  );
}
