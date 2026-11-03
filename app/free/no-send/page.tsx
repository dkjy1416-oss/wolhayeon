import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/** 11/3 — 무료 가이드 (경쟁사 학습: 무료 칼럼·PDF로 먼저 신뢰 → 이후 상품). 인스타 댓글 DM·인포크·결제 안 한 손님 안내용 */
export const metadata: Metadata = {
  title: "재회 전에 보내면 안 되는 메시지 7가지 | 월하연 무료 가이드",
  description: "마음은 진심이어도 부담으로 먼저 도착하는 문장들. 대신 보낼 수 있는 가벼운 문장까지 무료로 정리했어요.",
  openGraph: {
    title: "재회 전에 보내면 안 되는 메시지 7가지 · 무료",
    description: "대신 보낼 수 있는 가벼운 문장까지 정리했어요.",
    images: [{ url: "/og/book.jpg", width: 1200, height: 630 }],
  },
};

const ITEMS: { no: string; why: string; instead: string }[] = [
  {
    no: "새벽이나 술 마신 날의 장문",
    why: "마음은 진심이어도, 감정이 가장 높을 때의 문장은 상대에게 ‘부담’으로 먼저 도착하기 쉬워요. 읽는 사람은 내용보다 무게를 먼저 느껴요.",
    instead: "보내고 싶은 말은 메모장에 쓰고, 다음 날 낮에 다시 읽어 보기",
  },
  {
    no: "“우리 얘기 좀 해” — 관계를 지금 정하자는 말",
    why: "상대가 아직 결정할 준비가 안 됐을 때 이 말은 ‘대답해야 하는 숙제’가 돼요. 숙제가 된 대화는 피하고 싶어져요.",
    instead: "결정이 필요 없는 가벼운 근황·정보 한 줄",
  },
  {
    no: "사과와 해명이 섞인 긴 메시지",
    why: "“내가 다 잘못했어… 근데 너도…”처럼 사과 뒤에 해명이 붙으면 사과가 지워지고 다툼이 다시 시작되기 쉬워요.",
    instead: "사과가 필요하다면 한 문장만, 조건 없이",
  },
  {
    no: "스토리·근황을 본 티 내기",
    why: "“스토리 봤어, 누구야?” 같은 말은 관심보다 감시처럼 느껴져요. 상대는 지켜지고 있다는 압박을 받아요.",
    instead: "상대의 근황이 아니라, 둘 다 아는 가벼운 소재로",
  },
  {
    no: "답이 없을 때 재촉하는 연속 메시지",
    why: "“읽었으면 답 좀 해”, “왜 답 안 해?”가 이어지면, 답하지 않은 이유보다 재촉받은 기억이 더 크게 남아요.",
    instead: "한 번 보냈다면, 답이 올 때까지 다음 메시지는 쉬기",
  },
  {
    no: "일방적인 선물·편지·찾아가기",
    why: "상대가 원하지 않은 방식의 다가감은 경계를 넘는 행동으로 받아들여질 수 있어요. 관계보다 거리를 먼저 지켜야 해요.",
    instead: "상대가 정한 거리를 존중하는 것 자체가 메시지예요",
  },
  {
    no: "“친구로라도 지내자”는 협상",
    why: "이별 직후의 협상은 대부분 ‘아직 못 놓았다’는 신호로 읽혀요. 상대가 더 조심스러워질 수 있어요.",
    instead: "지금은 내 하루를 다시 세우는 쪽으로 힘을 쓰기",
  },
];

export default function NoSendGuide() {
  return (
    <div className="min-h-screen bg-[#0a0809]">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-[#120e10]">
        <Header ctaLabel="무료 미리보기" />
        <main className="px-5 pb-16 pt-24">
          <p className="text-[0.74rem] tracking-[0.2em] text-gold">월하연 무료 가이드</p>
          <h1 className="font-display mt-2 text-[1.75rem] font-bold leading-snug text-ivory">
            재회 전에
            <br />
            보내면 안 되는 메시지 7가지
          </h1>
          <p className="mt-3 text-[0.94rem] leading-[1.85] text-ivory-dim">
            보내기 직전, 1분만 읽어 주세요. 마음은 진심이어도 부담으로 먼저 도착하는 문장들이 있어요.
          </p>

          <ol className="mt-7 flex flex-col gap-4">
            {ITEMS.map((it, i) => (
              <li key={it.no} className="rounded-2xl border border-gold-dim/30 bg-ink-soft px-5 py-5">
                <p className="font-display text-[1.05rem] font-bold text-ivory">
                  <span className="mr-2 text-[#e46b8a]">{i + 1}</span>
                  {it.no}
                </p>
                <p className="mt-2 text-[0.9rem] leading-[1.85] text-ivory-dim">{it.why}</p>
                <p className="mt-3 rounded-xl bg-[#e46b8a]/10 px-3.5 py-2.5 text-[0.88rem] leading-[1.7] text-ivory">
                  <b className="text-[#e46b8a]">대신</b> · {it.instead}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl border border-[#e46b8a]/40 bg-[#1b1316] px-5 py-5">
            <p className="font-display text-[1.15rem] font-bold text-ivory">그래서 “내 상황”에선 뭘 보내야 할까요?</p>
            <p className="mt-2 text-[0.88rem] leading-[1.8] text-ivory-dim">
              위 7가지는 누구에게나 해당하는 기본이에요. 언제, 어떤 문장으로 다시 시작할지는 두 사람의 사연과 대화에 따라 달라져요.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link href="/apply?utm_source=guide&utm_medium=free&utm_content=no_send" className="cta-glow inline-flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#a83a57] to-burgundy-deep px-5 text-[0.98rem] font-bold text-[#fbf7f2]">
                사연 3분 · 무료 미리보기 받기
              </Link>
              <Link href="/chat?utm_source=guide&utm_medium=free&utm_content=no_send" className="inline-flex min-h-13 w-full items-center justify-center rounded-full border border-[#e46b8a]/60 px-5 py-3 text-[0.94rem] font-semibold text-[#e46b8a]">
                💬 그 사람 카톡으로 1분 무료 분석
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center text-[0.74rem] leading-[1.7] text-ivory-dim">
            월하연의 콘텐츠는 상대의 마음·연락·재회를 보장하지 않아요. 관계를 돌아보기 위한 참고 자료예요.
          </p>
        </main>
        <Footer />
      </div>
    </div>
  );
}
