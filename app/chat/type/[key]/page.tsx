import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CHAT_TYPES } from "@/lib/chat/questions";

/** 공유받은 사람이 보는 '카톡 대화 유형' 페이지 (11/3). 개인 답변 없음 — 유형 설명 + 나도 해 보기 */
export function generateStaticParams() {
  return Object.keys(CHAT_TYPES).map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const t = CHAT_TYPES[key];
  if (!t) return {};
  return {
    title: `카톡 대화 유형: ${t.name} | 월하연`,
    description: `${t.line} — 내 카톡 유형도 1분 무료로 확인해 보세요.`,
    openGraph: {
      title: `내 카톡 대화 유형은 ‘${t.name}’`,
      description: `${t.line} · 너도 1분 무료로 확인해 봐`,
      images: [{ url: "/og/chat.jpg", width: 1200, height: 630 }],
    },
  };
}

export default async function ChatTypePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const t = CHAT_TYPES[key];
  if (!t) notFound();
  const others = Object.values(CHAT_TYPES).filter((x) => x.key !== key);
  return (
    <div className="min-h-screen bg-[#0a0809]">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-[#120e10]">
        <Header ctaLabel="무료 미리보기" />
        <main className="px-5 pb-16 pt-24">
          <p className="text-[0.74rem] tracking-[0.2em] text-gold">친구가 공유한 카톡 대화 유형</p>
          <h1 className="font-display mt-2 text-[1.75rem] font-bold leading-snug text-ivory">{t.name}</h1>
          <p className="mt-1 text-[0.94rem] text-[#e46b8a]">{t.line}</p>
          <p className="mt-4 rounded-2xl border border-gold-dim/30 bg-ink-soft px-5 py-4 text-[0.94rem] leading-[1.85] text-ivory">{t.desc}</p>

          <div className="mt-7 rounded-2xl border border-[#e46b8a]/40 bg-[#1b1316] px-5 py-5">
            <p className="font-display text-[1.15rem] font-bold text-ivory">나와 그 사람의 카톡은 어떤 유형일까?</p>
            <p className="mt-2 text-[0.88rem] leading-[1.8] text-ivory-dim">질문 몇 개에 답하면 1분 안에 무료로 알려 드려요. 가입·결제 없이 바로 볼 수 있어요.</p>
            <Link
              href={`/chat?start=quiz&utm_source=share&utm_medium=friend&utm_content=type_${t.key}`}
              className="cta-glow mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#a83a57] to-burgundy-deep px-5 text-[0.98rem] font-bold text-[#fbf7f2]"
            >
              내 카톡 유형 무료로 보기
            </Link>
          </div>

          <p className="mt-8 text-[0.8rem] font-semibold text-gold">다른 유형들</p>
          <ul className="mt-2 flex flex-col gap-2">
            {others.map((o) => (
              <li key={o.key} className="rounded-xl border border-gold-dim/25 px-4 py-3">
                <p className="text-[0.92rem] font-semibold text-ivory">{o.name}</p>
                <p className="mt-0.5 text-[0.8rem] text-ivory-dim">{o.line}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-[0.74rem] leading-[1.7] text-ivory-dim">
            유형은 고른 답을 바탕으로 한 참고용이에요. 상대의 마음이나 관계의 결과를 보장하지 않아요.
          </p>
        </main>
        <Footer />
      </div>
    </div>
  );
}
