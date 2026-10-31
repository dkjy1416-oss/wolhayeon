import type { Metadata } from "next";
import Header from "@/components/Header";
import ChatFunnel from "@/components/chat/ChatFunnel";

export const metadata: Metadata = {
  title: "카톡 대화 분석 | 월하연 月下緣",
  description: "그 사람 카톡, 캡처만 올리세요. 대화 온도·답장이 식은 지점·지금 보내면 안 되는 말·다음 메시지까지. 질문 10개 무료 유형 진단.",
};

export default function ChatPage() {
  return (
    <>
      <Header ctaHref="/chat" ctaLabel="무료 유형 보기" />
      <main className="paper min-h-[100svh]">
        <ChatFunnel />
      </main>
    </>
  );
}
