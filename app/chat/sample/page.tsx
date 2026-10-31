import type { Metadata } from "next";
import Link from "next/link";
import ChatResultView from "@/components/chat/ChatResultView";
import type { ChatOrder, ChatResult } from "@/lib/chat/types";

export const metadata: Metadata = { title: "카톡 분석 결과 예시 | 월하연 月下緣" };

/* 가상 대화로 만든 예시 결과 — 실제 손님 결과가 아님 */
const R: ChatResult = {
  summary: "마음이 식었다기보다, 대화를 이어 갈 힘이 줄어든 흐름이에요. 지금은 확인보다 '답하기 쉬운 한 줄'이 필요한 때예요.",
  type_label: "다가갈수록 멀어지는 추격형 대화",
  temperature: { me: 80, partner: 38, note: "말의 길이·답장 속도·먼저 연락한 횟수로 본 상대적인 온도예요. 점수가 아니라 흐름을 보는 지표예요." },
  balance: {
    first_contact: "6시간 넘게 쉬었다가 먼저 말을 건 건 나 17번, 그 사람 9번이에요.",
    length: "내 메시지가 평균 2.4배 길어요. 그 사람은 'ㅇㅇ', '그래' 같은 짧은 답이 늘었어요.",
    reply_speed: "그 사람 답장은 앞 기간 12분 → 9/15 이후 2시간대로 늘었어요.",
  },
  turning_points: [
    { when: "9/15 무렵", what: "약속 얘기에 “글쎄 아직”이라는 답이 온 뒤로 그 사람이 먼저 말 거는 횟수가 4회 → 1회로 줄었어요." },
    { when: "9/23 밤", what: "“우리 요즘 왜 이래?” 뒤로 대화가 3일 멈췄어요. 확인 질문이 부담으로 도착한 지점이에요." },
  ],
  partner_signals: {
    positive: ["밤 11시 이후 “약은 챙겨 먹었어?” 같은 챙김 연락이 5번 있었어요.", "대화를 완전히 끊지 않고, 짧게라도 답은 하고 있어요."],
    caution: ["“다음에·언젠가”가 6번 나왔지만 날짜가 붙은 적은 없어요.", "대화를 먼저 끝내는 쪽이 11번 중 8번 그 사람이에요."],
  },
  my_patterns: [
    { pattern: "답이 늦으면 이어서 한 번 더 보내기 (“자?”, “바빠?”)", why_it_hurts: "기다림을 줄여 주지 않고, 그 사람이 답할 여유만 줄여요." },
    { pattern: "마음을 확인하는 질문", why_it_hurts: "진심이어도 상대에게는 '시험'처럼 도착하기 쉬워요." },
  ],
  avoid_messages: [
    { text: "우리 요즘 왜 이래? 나만 연락하는 거 같아", why: "답을 요구하는 문장은 방어를 부르고 대화를 닫게 만들어요." },
    { text: "바쁜 거 알지만 한 번만 답해 줘", why: "부탁처럼 보여도 재촉으로 읽혀요." },
  ],
  next_messages: [
    { text: "그때 말한 전시 이번 주까지래, 생각나서ㅎㅎ", intent: "부담 없는 정보형 — 답해도, 안 해도 괜찮은 한 줄", likely_response: "짧게라도 반응할 가능성이 커요. 바로 약속을 잡으려 하지 않는 게 포인트예요." },
    { text: "오늘 비 온대 우산 챙겨!", intent: "챙김을 돌려주기 — 그 사람이 했던 방식 그대로", likely_response: "고맙다는 짧은 답이 오면 그걸로 충분해요." },
    { text: "다음 주에 시간 되면 그 전시 같이 갈래? 아니면 다음에 가도 괜찮고", intent: "선택지를 열어 둔 제안", likely_response: "날짜를 정하지 않으면 '나중에'로 돌아올 수 있어요. 그때는 한 번 더 묻지 않아요." },
  ],
  plan: [
    { period: "오늘~3일", actions: ["먼저 연락하지 않기", "프로필·스토리 확인 줄이기"] },
    { period: "4~7일", actions: ["추천 메시지 1번 한 줄만 보내기", "답이 짧아도 이어서 보내지 않기"] },
    { period: "2주차", actions: ["그 사람이 먼저 연락하는 날이 생기면 2번·3번 순서로"] },
  ],
  closing: "마음의 크기보다 움직이는 순서가 지금은 더 중요해요. 한 번에 확인하려 하지 말고, 대화가 다시 편해지는 것부터 시작해요.",
};

const O = { partner_label: "그 사람", name: "", product: "chat" } as unknown as ChatOrder;

export default function ChatSamplePage() {
  return (
    <main className="fx-grain bg-[#0e0b0d] min-h-[100svh] px-5 pb-24 pt-10">
      <div className="mx-auto mb-6 max-w-[620px] rounded-xl border border-burgundy/40 bg-[#e46b8a]/10 px-4 py-3 text-[0.82rem] leading-[1.7] text-ivory">
        <b>결과 예시</b> — 가상의 대화로 만든 예시예요. 실제 결과는 올려 주신 대화를 근거로 매번 새로 써요.
      </div>
      <ChatResultView o={O} r={R} orderNumber="예시" bundleHref={null} />
      <div className="mx-auto mt-10 max-w-[620px]">
        <Link href="/chat" className="flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep font-semibold text-ivory">
          내 카톡으로 무료 분석 시작
        </Link>
      </div>
    </main>
  );
}
