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
    { pattern: "답이 늦으면 이어서 한 번 더 보내기 (“자?”, “바빠?”)", why_it_hurts: "기다림을 줄여 주지 않고, 그 사람이 답할 여유만 줄여요.", instead: "보낸 뒤에는 휴대폰을 내려놓고, 답이 오기 전까지 같은 주제로 다시 보내지 않아요." },
    { pattern: "마음을 확인하는 질문", why_it_hurts: "진심이어도 상대에게는 '시험'처럼 도착하기 쉬워요.", instead: "묻고 싶은 마음은 메모장에 먼저 써 두고, 대화가 다시 편해진 뒤에 만나서 이야기해요." },
  ],
  avoid_messages: [
    { text: "우리 요즘 왜 이래? 나만 연락하는 거 같아", why: "답을 요구하는 문장은 방어를 부르고 대화를 닫게 만들어요." },
    { text: "바쁜 거 알지만 한 번만 답해 줘", why: "부탁처럼 보여도 재촉으로 읽혀요." },
  ],
  next_messages: [
    { text: "그때 말한 전시 이번 주까지래, 생각나서ㅎㅎ", when: "마지막 대화 뒤 3~5일, 평일 저녁 8~9시", intent: "부담 없는 정보형 — 답해도, 안 해도 괜찮은 한 줄", likely_response: "짧게라도 반응할 가능성이 커요. 바로 약속을 잡으려 하지 않는 게 포인트예요." },
    { text: "오늘 비 온대 우산 챙겨!", when: "1번에 반응이 온 뒤 며칠 지나, 비 소식이 있는 날 아침", intent: "챙김을 돌려주기 — 그 사람이 했던 방식 그대로", likely_response: "고맙다는 짧은 답이 오면 그걸로 충분해요." },
    { text: "다음 주에 시간 되면 그 전시 같이 갈래? 아니면 다음에 가도 괜찮고", when: "그 사람이 먼저 연락한 날이 생긴 뒤", intent: "선택지를 열어 둔 제안", likely_response: "날짜를 정하지 않으면 '나중에'로 돌아올 수 있어요. 그때는 한 번 더 묻지 않아요." },
  ],
  plan: [
    { period: "오늘~3일", actions: ["먼저 연락하지 않기", "프로필·스토리 확인 줄이기"] },
    { period: "4~7일", actions: ["추천 메시지 1번 한 줄만 보내기", "답이 짧아도 이어서 보내지 않기"] },
    { period: "2주차", actions: ["그 사람이 먼저 연락하는 날이 생기면 2번·3번 순서로"] },
  ],
  closing: "마음의 크기보다 움직이는 순서가 지금은 더 중요해요. 한 번에 확인하려 하지 말고, 대화가 다시 편해지는 것부터 시작해요.",
  overview:
    "두 사람의 대화는 9월 중순까지는 서로 비슷한 온도로 오갔어요. 약속 얘기에 “글쎄 아직”이 돌아온 9/15 무렵부터 그 사람 쪽 답장이 짧아지고 느려졌고, 그 빈자리를 내가 더 긴 메시지와 확인 질문으로 채우기 시작했어요.\n지금은 마음이 끝났다기보다 '대화를 이어 갈 힘'이 한쪽으로 쏠린 상태에 가까워요. 그래서 지금 가장 중요한 건 더 많이 말하는 게 아니라, 그 사람이 답하기 쉬운 자리를 다시 만들어 주는 거예요.",
  partner_mind: {
    reading:
      "대화에서 보이는 그 사람은 관계를 정리하려는 쪽이라기보다, 부담을 느끼며 한 발 물러나 있는 쪽에 가까워요. 밤늦게 챙김 연락을 하는 건 마음이 남아 있을 가능성을 보여 주지만, 약속 얘기만 나오면 말을 흐리는 건 지금 관계의 속도가 버겁다는 신호일 수 있어요.\n두 가능성이 함께 보여요 — 마음은 남아 있지만 지금은 확인받는 대화가 부담인 경우, 혹은 마음이 정리되는 중이라 거리를 조금씩 넓히는 경우예요.",
    clues: [
      { quote: "약은 챙겨 먹었어?", meaning: "답이 짧아진 뒤에도 챙김은 5번 이어졌어요. 관심이 완전히 끊긴 사람의 말투는 아니에요." },
      { quote: "글쎄 아직", meaning: "거절도 수락도 아닌 답이에요. 날짜가 정해지는 대화를 피하고 싶은 마음이 보여요." },
      { quote: "ㅇㅇ 나중에", meaning: "확인 질문 뒤에 주로 나온 답이에요. 질문 자체가 부담으로 도착했을 가능성이 커요." },
    ],
  },
  say_vs_do: [
    { says: "“다음에 보자”를 6번 말했어요", does: "날짜가 붙은 적은 한 번도 없어요", gap: "말로는 문을 닫지 않지만, 행동으로는 아직 만날 준비가 안 된 상태예요." },
    { says: "“요즘 너무 바빠”", does: "같은 날 밤 11시 이후에 먼저 연락한 날이 3번 있었어요", gap: "바쁨보다 '확인받는 대화'를 피하고 싶은 마음이 더 클 수 있어요." },
  ],
  future_flow: {
    now_stage: "마음이 끝난 단계라기보다, 한쪽이 지쳐 대화 속도를 늦추고 있는 '휴지기'예요.",
    paths: [
      { condition: "지금처럼 확인 질문과 긴 메시지가 이어지면", outcome: "답은 더 짧아지고, 그 사람이 대화를 먼저 끝내는 일이 늘어날 수 있어요." },
      { condition: "3~7일 쉬었다가 답하기 쉬운 한 줄로 다시 시작하면", outcome: "짧게라도 반응이 돌아오고, 대화의 온도가 조금씩 회복될 여지가 있어요." },
      { condition: "그 사람이 먼저 연락하는 날이 생기면", outcome: "그때가 약속 얘기를 가볍게 꺼내 볼 수 있는 시점이에요. 날짜를 강요하지 않는 게 포인트예요." },
    ],
  },
  my_strengths: [
    "답장이 늦어도 화를 내기보다 걱정하는 말로 돌려준 날이 많아요 — 관계의 바탕이 따뜻해요.",
    "그 사람이 했던 이야기(전시, 일정)를 기억하고 다시 꺼내요. 다음 대화의 좋은 재료예요.",
  ],
  reply_guide: {
    warm: "같은 온도로 한 번만 답하고 대화를 길게 끌지 않아요. 다음 연락은 2~3일 두고, 그 사이 그 사람이 먼저 말을 걸면 2번 메시지로 이어 가요.",
    short: "추가 질문 없이 “응 좋은 하루 보내!” 정도로 마무리해요. 1주일은 먼저 연락하지 않고, 내 일상 기준을 지켜요.",
    none: "다시 보내지 않아요. 읽음 확인·프로필 확인을 멈추고 2주 동안 거리를 둬요. 그 뒤에도 연락이 없다면 그 자체가 지금의 답이에요.",
  },
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
