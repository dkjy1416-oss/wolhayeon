import type { Metadata } from "next";
import ChatResultView from "@/components/chat/ChatResultView";
import { notFound } from "next/navigation";
import { verifyChatToken, chatToken } from "@/lib/chat/auth";
import { getChatOrder } from "@/lib/chat/store";
import ChatAsk from "@/components/chat/ChatAsk";
import AddToHome from "@/components/chat/AddToHome";
import ResultTools from "@/components/chat/ResultTools";
import { askLeft, askPayOrderId } from "@/lib/chat/ask";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "카톡 대화 분석 결과 | 월하연", robots: { index: false } };

const VIEW_DAYS = 30;

export default async function ChatResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string; asked?: string }>;
}) {
  const { orderNumber } = await params;
  const { t, asked } = await searchParams;
  if (!verifyChatToken("result", orderNumber, t)) notFound();
  const o = await getChatOrder(orderNumber);
  if (!o || o.pay_status !== "paid") notFound();
  const expired = o.paid_at && Date.now() - new Date(o.paid_at).getTime() > VIEW_DAYS * 86400000;
  const r = o.result;

  if (expired || !r)
    return (
      <main className="fx-grain bg-[#0e0b0d] mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="text-[0.95rem] text-ivory">{expired ? `열람 기간(${VIEW_DAYS}일)이 지났어요.` : "결과를 준비하고 있어요. 잠시 후 다시 열어 주세요."}</p>
      </main>
    );

  const bundleHref =
    o.product === "chat_bundle" && !o.bundle_redeemed_order ? `/chat/bundle?o=${orderNumber}&t=${encodeURIComponent(chatToken("bundle", orderNumber) ?? "")}` : null;

  return (
    <main className="fx-grain bg-[#0e0b0d] min-h-[100svh] px-5 pb-24 pt-10">
      <AddToHome />
      <ChatResultView o={o} r={r} orderNumber={orderNumber} bundleHref={bundleHref} />
      <ResultTools />
      {/* 11/28: 리포트 뒤 월화에게 묻기 (무료 1 + 3번 4,900원) */}
      <ChatAsk
        orderNumber={orderNumber}
        token={t as string}
        partner={o.partner_label || "그 사람"}
        initialAsks={o.asks ?? []}
        initialLeft={askLeft(o)}
        clientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() || null}
        payOrderId={askPayOrderId(o)}
        justPaid={asked === "1"}
      />
    </main>
  );
}
