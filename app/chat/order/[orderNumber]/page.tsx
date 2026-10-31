import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { verifyChatToken } from "@/lib/chat/auth";
import { getChatOrder, listChatImages } from "@/lib/chat/store";
import { CHAT_PRODUCTS } from "@/lib/chat/types";
import ChatUpload from "@/components/chat/ChatUpload";
import InAppBrowserNotice from "@/components/pay/InAppBrowserNotice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "캡처 올리기 | 월하연 카톡 분석", robots: { index: false } };

export default async function ChatOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { orderNumber } = await params;
  const { t } = await searchParams;
  if (!verifyChatToken("order", orderNumber, t)) notFound();
  const o = await getChatOrder(orderNumber);
  if (!o) notFound();
  if (o.pay_status === "paid") redirect(`/chat/payment/success?orderId=${orderNumber}&paymentKey=${encodeURIComponent(o.payment_key ?? "")}&amount=${o.amount}`);
  const p = CHAT_PRODUCTS[o.product];
  const imageCount = (await listChatImages(orderNumber)).length;
  return (
    <main className="fx-grain bg-[#0e0b0d] min-h-[100svh] px-5 pb-28 pt-10">
      <div className="mx-auto max-w-[560px]">
        <p className="text-[0.74rem] tracking-[0.2em] text-gold">月下緣 · 카톡 대화 분석</p>
        <h1 className="font-display mt-2 text-[1.4rem] font-bold text-ivory">{o.name ? `${o.name}님, ` : ""}대화를 보여 주세요</h1>
        <p className="mt-2 text-[0.9rem] leading-[1.8] text-ivory-dim">
          {p.name} · <b className="text-[#e46b8a]">{o.amount.toLocaleString()}원</b> · 1회 결제 · 정기결제 없음
        </p>
        <div className="mt-6">
          <div className="paper rounded-xl">
            <InAppBrowserNotice orderNumber={orderNumber} />
          </div>
          <ChatUpload
            orderNumber={orderNumber}
            token={t as string}
            initialCount={imageCount}
            fileReady={o.source === "file"}
            clientKey={process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() || null}
            amount={o.amount}
            orderName={p.orderName}
          />
        </div>
        <p className="mt-6 text-center text-[0.74rem] leading-[1.8] text-ivory-dim">
          캡처는 분석 직후 삭제돼요 · 결제하지 않으면 48시간 안에 삭제돼요
          <br />
          결과를 열어보기 전이면 7일 안에 전액 환불 · 주문번호 {orderNumber}
        </p>
      </div>
    </main>
  );
}
