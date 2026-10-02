import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookStickyBuy from "@/components/book/BookStickyBuy";
import LoopVideo from "@/components/book/LoopVideo";
import PageFlipper from "@/components/book/PageFlipper";
import SituationPicker from "@/components/book/SituationPicker";
import { BOOK_SITUATIONS_DATA } from "@/lib/book/book-situations";
import {
  BOOK_PRICE_KRW,
  BUNDLE_REGULAR_PRICE_KRW,
  PROMO_DEADLINE_TEXT,
  bundlePrice,
  RITUAL_PRICE_KRW,
  RITUAL_REGULAR_PRICE_KRW,
  isPromoActive,
} from "@/lib/ritual-types";
import { getPublicReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "《헤어진 뒤, 연락하지 말아야 할 때》 개인화 PDF 책 | 월하연 月下緣",
  description:
    "싸우고 끝났을 때, 매달린 뒤 답이 끊겼을 때, 술 마신 새벽 카톡 창 앞에서 펼치는 책. 당신의 이야기로 다시 쓴 약 120쪽, 29,000원.",
};

const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

/* ---------- 1. 장면 — 운영자 릴스 + 실제 책 본문 ---------- */
type Scene = {
  tag: string;
  title: string;
  lead: string;
  videos: Array<{ src: string; poster: string; label: string; sound?: boolean }>;
  where: string;
  insight: string;
  bad?: { text: string; why: string };
  good?: string;
  /** 겉으로 싸운 것 → 속에서 부딪힌 것 */
  pairs?: Array<[string, string]>;
  when: string;
};

/** 장면 밖 추가 순간들 (자막 없는 원본 · 무음) */
const MOMENTS = [
  { src: "/book/v3/bed.mp4", poster: "/book/v3/bed.webp", label: "보낼 메시지 앞에서 망설이는 모습" },
  { src: "/book/v3/night.mp4", poster: "/book/v3/night.webp", label: "새벽에 휴대폰 불빛만 바라보는 모습" },
  { src: "/book/v3/check.mp4", poster: "/book/v3/check.webp", label: "답장을 확인하다 놀라는 모습" },
];

const SCENES: Scene[] = [
  {
    tag: "장면 1 · 싸우다 끝났을 때",
    title: "“너 만나면 숨 막혀!”\n그 말이 마지막이었다면",
    lead: "지금 보내고 싶은 사과에는, 아마 ‘근데’가 붙어 있을 거예요.",
    videos: [
      { src: "/book/v3/fight.mp4", poster: "/book/v3/fight.webp", label: "주차장에서 울며 다투는 연인" },
      { src: "/book/v3/fight2.mp4", poster: "/book/v3/fight2.webp", label: "서로 언성을 높이는 연인" },
    ],
    where: "PART 03 · 3장 「마지막 연락이 싸움이었을 때」",
    insight:
      "싸움 뒤에는 둘 다 ‘내가 억울한 부분’을 붙잡고 있어요. 감정이 가라앉기 전의 사과는 사과가 아니라 반론처럼 들릴 수 있어요.",
    bad: {
      text: "그날 내가 심했던 건 맞는데, 너도 그렇게까지 말할 필요는 없었잖아.",
      why: "‘근데’, ‘너도’가 들어가는 순간 사과는 끝나요.",
    },
    good: "그날 내가 했던 말은 심했어. 미안해. 답은 안 해도 괜찮아. 그 말만은 꼭 하고 싶었어.",
    when: "최소 2~3주. 그 사이 ‘후회되는 말’과 ‘여전히 억울한 것’을 나눠 적고, 앞의 것만 가져가요.",
  },
  {
    tag: "장면 2 · 붙잡았던 밤",
    title: "“오빠, 제발 가지 마…”\n매달린 뒤 답이 끊겼다면",
    lead: "지금 필요한 건 한 통 더가 아니라, 멈춤이에요.",
    videos: [
      { src: "/book/v3/cry.mp4", poster: "/book/v3/cry.webp", label: "비 오는 밤거리에서 떠나는 사람 앞에 우는 모습" },
      { src: "/book/v3/grab.mp4", poster: "/book/v3/grab.webp", label: "떠나는 사람을 붙잡는 모습" },
    ],
    where: "PART 03 · 6장 「매달린 뒤 연락이 끊겼을 때」",
    insight:
      "여러 통의 메시지와 새벽 전화가 이어진 뒤라면, 다음 메시지는 내용과 상관없이 ‘또 시작이구나’로 읽히기 쉬워요.",
    bad: {
      text: "이번에 안 받아주면 진짜 끝이야. 다시는 연락 안 해",
      why: "최후통첩은 선택이 아니라 압박으로 다가와요. 그리고 대부분 ‘그래, 끝내자’로 돌아와요.",
    },
    good: "그때 연락을 너무 많이 해서 부담 줬던 거 미안해. 이제는 잘 지내고 있어. 너도 잘 지내길 바라.",
    when: "최소 한두 달은 완전히 멈춰요. 마지막 장면을 ‘매달림’이 아니라 ‘멈춤’으로 끝내는 시간이에요.",
  },
  {
    tag: "장면 3 · 혼자 마신 새벽",
    title: "소주 한 병,\n새벽 2시의 카톡 창",
    lead: "연락 충동이 가장 강해지는 건 밤 10시 이후, 그리고 술을 마셨을 때예요.",
    videos: [
      { src: "/book/v3/drink.mp4", poster: "/book/v3/drink.webp", label: "혼자 술을 마시는 모습" },
      { src: "/book/v3/alone.mp4", poster: "/book/v3/alone.webp", label: "술병 앞에서 우는 모습" },
    ],
    where: "PART 05 「보내면 안 되는 메시지 7가지」",
    insight:
      "보내는 순간엔 시원하지만, 대부분 상대를 더 멀리 밀어내요. 상대를 위한 말이 아니라, 지금 내 불안을 덜기 위한 말이라서요.",
    bad: {
      text: "그동안 하고 싶었던 말이 너무 많아서 적어봐. 처음 만났을 때부터 나는… (화면 세 개 분량)",
      why: "장문은 읽는 사람에게 ‘전부 대답해야 하는 숙제’가 돼요. 결국 아무 답도 안 오기 쉬워요.",
    },
    good: "할 얘기가 좀 있는데, 나중에 편할 때 얼굴 보고 해도 될까?",
    when: "쓰고 싶어지면 책 뒤쪽 ‘카톡 임시보관 페이지’에 먼저 적고, 하루 재워 둬요.",
  },
  {
    tag: "장면 4 · 같은 이유로 또 싸울 때",
    title: "“우리 2주년이잖아.”\n“일하느라 바빴다니까.”",
    lead: "싸움의 횟수보다 중요한 건, 같은 주제로 몇 번 돌아왔느냐예요.",
    videos: [
      { src: "/book/v3/again.mp4", poster: "/book/v3/again.webp", label: "같은 이유로 또 다투는 연인" },
      { src: "/book/v3/again2.mp4", poster: "/book/v3/again2.webp", label: "눈물로 따지는 모습" },
    ],
    where: "PART 06 「반복적으로 싸웠던 주제 찾기」",
    insight:
      "겉으로는 “왜 카톡 안 읽었어”로 싸워도, 속은 “나를 우선순위에 두고 있는지”에 대한 싸움인 경우가 많아요.",
    pairs: [
      ["답장이 늦다", "내가 중요한 사람인지 확인받고 싶음 / 혼자 있는 시간이 필요함"],
      ["데이트 횟수", "함께하는 시간의 기대치가 다름"],
      ["술자리 연락 문제", "믿음과 불안 / 간섭받는 느낌"],
    ],
    when: "싸운 뒤 한 번도 바뀐 적 없는 주제라면, 다시 만나도 가장 먼저 돌아올 싸움이에요. 답이 아직 없다면, 연락할 때가 아니라 생각할 때예요.",
  },
];

/* ---------- 2. 보내면 안 되는 메시지 7가지 (실제 본문) ---------- */
const NEVER: Array<{ no: string; name: string; bad: string; better: string }> = [
  { no: "1", name: "장문 카톡", bad: "그동안 하고 싶었던 말이 너무 많아서 적어봐…", better: "할 얘기가 좀 있는데 나중에 편할 때 얼굴 보고 해도 될까?" },
  { no: "2", name: "감정 폭발", bad: "너 진짜 너무한다. 어떻게 사람이 이렇게 쉽게 정리할 수 있어?", better: "요즘 좀 힘들었는데 이제 조금씩 괜찮아지고 있어. 너도 잘 지내" },
  { no: "3", name: "확인 요구", bad: "솔직하게 말해줘. 나 아직 조금이라도 좋아해?", better: "네 마음이 어떻든 괜찮아. 나는 네가 편했으면 좋겠어" },
  { no: "4", name: "SNS 언급", bad: "스토리 보니까 요즘 재밌게 지내더라? 그 사람은 누구야?", better: "요즘 잘 지내는 것 같아서 다행이다 ㅎㅎ" },
  { no: "5", name: "최후통첩", bad: "이번에 안 받아주면 진짜 끝이야. 다시는 연락 안 해", better: "네 결정 존중할게. 나중에라도 얘기하고 싶으면 편하게 연락해" },
  { no: "6", name: "답 재촉", bad: "?? 읽었잖아. 오늘 안에 답 줘", better: "급한 거 아니니까 천천히 봐도 돼" },
  { no: "7", name: "떠보기", bad: "나 없이도 잘 사나 보네? 역시 너는 괜찮구나", better: "잘 지내는 것 같아서 좋다. 나도 요즘 나름 괜찮게 지내 ㅎㅎ" },
];

/* ---------- 3. 120쪽에 담긴 것 (실제 차례 기준) ---------- */
const CHAPTERS: Array<{ no: string; title: string; hook: string; items: string[] }> = [
  {
    no: "01",
    title: "헤어진 직후",
    hook: "왜 지금 이렇게 미친 듯이 연락하고 싶은지부터",
    items: ["연락 충동이 가장 강해지는 순간 5가지", "이별 직후 뇌가 만드는 네 가지 착각", "“마지막으로 한 번만 말하고 싶어”의 함정", "차단당했을 때 절대 하지 말아야 할 행동"],
  },
  {
    no: "02",
    title: "상대 마음을 자꾸 추측하게 될 때",
    hook: "스토리는 보는데 연락은 없는 이유",
    items: ["나를 아직 좋아할까", "왜 SNS는 보면서 연락은 안 할까", "차단했다가 푸는 이유 · 읽고 답하지 않는 이유", "연락은 오는데 재회 얘기는 안 할 때 · 새 사람이 생긴 것 같을 때"],
  },
  {
    no: "03",
    title: "연락할까, 기다릴까 — 10가지 상황",
    hook: "내 상황의 장을 펴면, 기다릴 기간과 보낼 문장이 있어요",
    items: ["싸우고 끝났을 때 · 내가/상대가 헤어지자고 했을 때", "매달린 뒤 끊겼을 때 · 차단됐을 때", "친구처럼 연락 중일 때 · 애매하게 이어질 때", "생일·기념일에 연락해도 되는지"],
  },
  {
    no: "04",
    title: "월화의 ‘연락 전 체크’",
    hook: "보내기 직전, 손가락을 한 번 멈추는 질문들",
    items: ["연락하고 싶은 진짜 이유 찾기", "지금 이 순간 점검하기", "보내기 전 마지막 질문"],
  },
  {
    no: "05",
    title: "연락 메시지 실전편 — 12가지 상황",
    hook: "그날 실제로 보낼 문장, 보내면 안 되는 문장",
    items: ["헤어진 뒤 첫 연락 · 오랜만의 자연스러운 연락", "읽씹됐을 때 · 답장이 단답일 때", "상대가 보고 싶다고 했을 때 · 술 마시고 연락 왔을 때", "재회를 직접 이야기해야 할 때 · 보내면 안 되는 7가지"],
  },
  {
    no: "06",
    title: "재회 가능성이 아니라 ‘관계’를 보는 법",
    hook: "같은 이유로 또 헤어지지 않으려면",
    items: ["왜 헤어졌는지", "반복해서 싸웠던 주제 찾기", "한 사람은 쫓고, 한 사람은 도망가는 관계", "다시 만나기만 하면 되는 관계일까 — 자가 점검"],
  },
  {
    no: "07",
    title: "24시간 가이드",
    hook: "오늘 하루를 버티는 네 단계",
    items: ["보내고 싶어진 순간부터 다음 날 아침까지", "가장 위험한 시간대별 대처법"],
  },
  {
    no: "08",
    title: "7일 가이드",
    hook: "결제한 날부터 실제 날짜가 적힌 일주일",
    items: ["하루 하나의 목표 · 할 일 · 질문", "버틴 날을 체크하는 기록 칸"],
  },
  {
    no: "09",
    title: "21일 관계 리셋 플랜",
    hook: "감정 안정 → 관계 분석 → 행동 결정",
    items: ["1주차 감정 안정 · 2주차 관계 분석 · 3주차 행동 결정", "21일 후, 세 갈래 — 짧게 연락 / 조금 더 기다리기 / 정리하기"],
  },
  {
    no: "10",
    title: "붉은 인연의 실 리추얼",
    hook: "충동적으로 움직이지 않도록 마음을 정돈하는 5분",
    items: ["리추얼이 무엇이고 무엇이 아닌지", "5분 리추얼 · 나에게 남기는 기록"],
  },
  {
    no: "+",
    title: "BONUS · 저장해서 쓰는 도구 7가지",
    hook: "흔들리는 날, 한 장만 꺼내 써요",
    items: ["연락 전 체크리스트 · 카톡 임시보관 페이지", "상대 행동 / 내 해석 구분표", "7일 감정 기록지 · 21일 관계 기록지", "재회 후 꼭 나눌 질문 9개 · 다시 만나기 전 체크리스트"],
  },
];

const PAGES: Array<{ src: string; caption: string }> = [
  { src: "/book/pages/p01.webp", caption: "표지 — 맨 위에 당신의 이름과 날짜" },
  { src: "/book/pages/p02.webp", caption: "첫 장 — 월화가 당신에게 쓰는 편지" },
  { src: "/book/pages/p03.webp", caption: "지금의 판정 · 기다릴 날짜 · 먼저 읽을 세 장" },
  { src: "/book/pages/p04.webp", caption: "PART 01 — 왜 지금 이렇게 연락하고 싶은지" },
  { src: "/book/pages/p05.webp", caption: "PART 03 — 내 상황의 장에 붙는 표시" },
  { src: "/book/pages/p06.webp", caption: "싸우고 끝났을 때 — 왜, 얼마나, 무엇을" },
  { src: "/book/pages/p07.webp", caption: "PART 05 — 당신을 위한 메시지 초안" },
  { src: "/book/pages/p08.webp", caption: "보내면 안 되는 메시지와 대신 보낼 문장" },
  { src: "/book/pages/p09.webp", caption: "PART 08 — 결제한 날부터 날짜가 적힌 7일" },
  { src: "/book/pages/p10.webp", caption: "PART 09 — 날짜가 적힌 21일 플랜" },
  { src: "/book/pages/p11.webp", caption: "BONUS — 보내기 전 체크리스트" },
];

const MINE: Array<{ n: string; title: string; body: string }> = [
  { n: "01", title: "이름과 첫 편지", body: "당신 한 사람에게 쓰는 편지로 책을 열어요." },
  { n: "02", title: "기다릴 날짜", body: "‘조금만 더’ 대신 ‘몇 월 며칠까지’로 적어요." },
  { n: "03", title: "내 장에 표시", body: "10가지 상황 중 당신의 장부터 펼치면 돼요." },
  { n: "04", title: "보낼 날의 문장", body: "기다림이 끝난 날 쓸 메시지 초안까지." },
];


/** 재회 상담과 비교 — 시장 가격은 공개 자료 기준 예시 (출처는 표 아래 표기) */
const COMPARE: Array<{ label: string; them: string; us: string }> = [
  { label: "비용", them: "1회 상담\n5만~20만 원\n4~8주 상담\n29만~52만 원", us: "책 29,000원\n메시지까지 패키지\n1회 결제" },
  { label: "도움받는 때", them: "예약한 상담 시간 안에서", us: "새벽 2시에도, 21일 내내 펼쳐 봐요" },
  { label: "남는 것", them: "통화의 기억과 메모", us: "내 이름이 적힌 PDF 한 권\n60일 동안 언제든 다시 받기" },
  { label: "약속", them: "곳마다 달라요", us: "재회를 보장하지 않아요\n대신 ‘무엇을, 언제’의 순서" },
];

const FAQ: Array<{ q: string; a: string }> = [
  { q: "정말 제 이야기로 쓰나요?", a: "네. 신청서에 들려주신 사연을 월화가 읽고, 첫 편지·지금의 판정과 기다릴 날짜·내 상황의 장 표시·메시지 초안·날짜가 적힌 7일/21일 기록장을 당신에게 맞춰 써요. 나머지 본문은 검수된 공통 원고예요." },
  { q: "언제 받을 수 있나요?", a: "결제 후 보통 1~3분이면 완성돼요. 화면에서 바로 받을 수 있고, 입력하신 이메일로도 다운로드 링크를 보내드려요. 링크는 60일 동안 열려요." },
  { q: "책만 살 수 있나요?", a: "네, 책만 29,000원이에요. 책이 당신의 이야기로 쓰여서, 사연을 먼저 들려주시면 무료 미리보기를 거쳐 결제 화면에서 ‘책만’ 또는 패키지를 고를 수 있어요." },
  { q: "차단됐거나, 상대가 연락하지 말라고 했어요.", a: "그 경우엔 연락 문장을 쓰지 않아요. 대신 경계를 지키며 나를 돌보는 방법과, 상대가 먼저 문을 열었을 때만의 대처를 담아요." },
  { q: "재회가 보장되나요?", a: "아니요. 상대의 마음은 누구도 대신 움직일 수 없어요. 이 책은 재회를 약속하는 대신, 관계를 더 망치지 않는 순서와 당신이 지킬 수 있는 기준을 드려요." },
  { q: "환불은 어떻게 되나요?", a: "맞춤 제작 디지털 콘텐츠라 PDF를 한 번이라도 받으신 뒤에는 단순 변심 환불이 제한돼요. 자세한 내용은 환불정책을 확인해 주세요." },
];

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`별점 ${n}점`} className="text-[0.8rem] tracking-[0.1em] text-gold">
      {"★".repeat(n)}
      <span className="text-ivory-dim/25">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const orderNumber = order && ORDER_RE.test(order) ? order : null;
  const hrefFor = (product: "book" | "bundle") =>
    orderNumber
      ? `/apply/complete?order=${encodeURIComponent(orderNumber)}&product=${product}`
      : `/apply?want=${product}`;
  const messageNow = isPromoActive() ? RITUAL_PRICE_KRW : RITUAL_REGULAR_PRICE_KRW;
  const separate = messageNow + BOOK_PRICE_KRW;
  const bundleNow = bundlePrice();
  const promoOn = isPromoActive();
  const save = separate - bundleNow;
  const reviews = await getPublicReviews(12);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  const PriceCards = ({ id }: { id: string }) => (
    <div id={id} className="scroll-mt-24 space-y-3">
      <Link
        href={hrefFor("bundle")}
        className="relative block rounded-2xl border border-gold/55 bg-gradient-to-b from-[#1d1512] to-ink-soft px-6 py-6 shadow-[0_0_40px_rgba(226,196,138,0.08)]"
      >
        <span aria-hidden className="bk-shine pointer-events-none absolute inset-0 rounded-2xl" />
        <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 text-[0.68rem] font-medium text-ink">
          월화의 추천
        </span>
        <p className="text-[1.02rem] text-ivory">메시지 + 책 패키지</p>
        <p className="mt-1 text-[0.78rem] font-light leading-[1.7] text-ivory-dim">
          지금 관계를 읽는 메시지 + 기다리는 동안 곁에 둘 책
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <p className="font-display text-[1.75rem] font-semibold text-gold">
            {bundleNow.toLocaleString()}
            <span className="ml-1 text-base text-ivory-dim">원</span>
          </p>
          {save > 0 && (
            <>
              <p className="text-[0.78rem] text-ivory-dim/70 line-through">{separate.toLocaleString()}원</p>
              <p className="text-[0.76rem] text-thread">{save.toLocaleString()}원 아껴요</p>
            </>
          )}
        </div>
        {promoOn && (
          <p className="mt-1.5 text-[0.72rem] text-gold/90">
            패키지 특가 {PROMO_DEADLINE_TEXT} · 이후 {BUNDLE_REGULAR_PRICE_KRW.toLocaleString()}원
          </p>
        )}
        <span className="mt-4 flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] text-ivory">
          패키지로 받기
        </span>
      </Link>
      <Link href={hrefFor("book")} className="block rounded-2xl border border-gold-dim/40 bg-ink-soft/70 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.98rem] text-ivory">개인화 PDF 책만</p>
            <p className="mt-0.5 text-[0.76rem] font-light text-ivory-dim">내 이야기로 다시 쓴 한 권</p>
          </div>
          <p className="font-display shrink-0 text-[1.45rem] font-semibold text-gold">
            {BOOK_PRICE_KRW.toLocaleString()}
            <span className="ml-1 text-sm text-ivory-dim">원</span>
          </p>
        </div>
        <span className="mt-4 flex h-11 items-center justify-center rounded-full border border-gold/45 text-[0.86rem] text-gold">
          책만 받기
        </span>
      </Link>
      <p className="pt-1 text-center text-[0.72rem] leading-[1.9] text-ivory-dim">
        1회 결제 · 정기결제 없음 · 결제 후 1~3분이면 완성 · PDF 링크 60일
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080607]">
      <div className="relative mx-auto min-h-screen w-full max-w-[500px] overflow-hidden bg-ink shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <Header ctaHref="#pick" ctaLabel="내 책 받기" />
        <main className="pb-20">
          {/* ===== 0. 첫 화면 — 월화가 붙잡는 장면 (영상) ===== */}
          <section className="relative">
            <LoopVideo
              src="/book/v3/stop.mp4"
              poster="/book/v3/stop.webp"
              label="떠나는 사람을 향해 손을 뻗으며 우는 장면"
              fit="contain"
              className="block aspect-[3/4] w-full"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent via-55% to-ink" />
            <p className="pointer-events-none absolute inset-x-0 top-[5.2rem] text-center text-[0.72rem] tracking-[0.35em] text-gold/90">
              月下緣 · 월화의 책
            </p>
          </section>
          <section className="relative -mt-24 px-6 pb-12 text-center">
            <p className="text-[0.86rem] text-gold">보내기 직전의 당신을, 한 번만 붙잡아 줄 책</p>
            <h1 className="font-display mt-2 text-[2rem] leading-[1.4] text-ivory">
              헤어진 뒤,
              <br />
              연락하지 말아야 할 때
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2 text-[0.78rem]">
              <span className="rounded-full border border-gold/40 px-3 py-1 text-gold">책 {BOOK_PRICE_KRW.toLocaleString()}원</span>
              <span className="rounded-full border border-gold-dim/30 px-3 py-1 text-ivory-dim">
                메시지와 함께 {bundleNow.toLocaleString()}원
              </span>
            </div>
            <a
              href="#pick"
              className="cta-glow mt-5 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85"
            >
              내 책 받으러 가기
            </a>
            {reviews.length > 0 && (
              <p className="mt-4 text-[0.8rem] text-ivory-dim">
                <Stars n={Math.round(avg)} />{" "}
                <span className="ml-1">
                  {avg.toFixed(1)} · 실제 구매 후기 {reviews.length}개
                </span>
              </p>
            )}
            <p className="mt-8 text-[0.9rem] font-light leading-[2] text-ivory-dim">
              카톡 창을 열었다 닫는 밤마다 펼치면
              <br />
              <span className="text-ivory">지금 무엇을 하지 말고, 언제 무엇을 할지</span> 나와요.
              <br />
              당신의 이야기로, 당신 이름으로 다시 쓴 한 권이에요.
            </p>
          </section>

          {/* ===== 0-1. 지금 내 상황 고르기 ===== */}
          <section className="border-t border-gold-dim/10 px-6 py-12">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">지금 내 상황 고르기</p>
            <h2 className="font-display mt-2 text-center text-[1.4rem] leading-[1.55] text-ivory">
              지금 당신은
              <br />
              <span className="text-gold">어떤 상황인가요?</span>
            </h2>
            <p className="mb-6 mt-3 text-center text-[0.8rem] font-light leading-[1.9] text-ivory-dim">
              하나만 골라 보세요. 책 속 그 장을 미리 펼쳐 드릴게요.
            </p>
            <SituationPicker
              data={BOOK_SITUATIONS_DATA}
              bookHref={hrefFor("book")}
              bundleHref={hrefFor("bundle")}
              bookPrice={BOOK_PRICE_KRW}
              bundlePrice={bundleNow}
            />
          </section>

          {/* ===== 1. 이런 장면, 당신 얘기죠? (릴스 + 실제 본문) ===== */}
          <section className="border-t border-gold-dim/10 pt-14">
            <p className="px-6 text-center text-[0.72rem] tracking-[0.3em] text-gold/80">이런 장면, 당신 얘기죠?</p>
            <h2 className="font-display mt-2 px-6 text-center text-[1.4rem] leading-[1.55] text-ivory">
              그 밤에 보낸 한 줄이,
              <br />
              <span className="text-gold">그다음을 정해요</span>
            </h2>

            <div className="mt-10 space-y-14">
              {SCENES.map((s) => (
                <article key={s.tag} className="px-4">
                  <div className="relative overflow-hidden rounded-2xl bg-ink-soft">
                    <LoopVideo
                      src={s.videos[0].src}
                      poster={s.videos[0].poster}
                      label={s.videos[0].label}
                      fit="contain"
                      className="block aspect-[3/4] w-full"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5">
                      <p className="text-[0.7rem] tracking-[0.2em] text-thread">{s.tag}</p>
                      <h3 className="font-display mt-1.5 whitespace-pre-line text-[1.3rem] leading-[1.5] text-ivory">
                        {s.title}
                      </h3>
                      <p className="mt-1.5 text-[0.86rem] leading-[1.8] text-gold">{s.lead}</p>
                    </div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-2xl bg-[#f5efe3] text-[#2a1f1a]">
                    <p className="border-b border-[#2a1f1a]/10 px-5 py-2.5 text-[0.72rem] text-[#8a6a33]">📖 그날 펼칠 장 · {s.where}</p>
                    <div className="space-y-2.5 px-5 py-4">
                      {s.bad && (
                        <div>
                          <p className="text-[0.84rem] leading-[1.75] text-[#7a5a5a] line-through decoration-[#6d1f2c]/50">✕ {s.bad.text}</p>
                          <p className="mt-0.5 text-[0.76rem] leading-[1.7] text-[#6d1f2c]">{s.bad.why}</p>
                        </div>
                      )}
                      {s.good && (
                        <p className="rounded-xl bg-[#eef3ea] px-3.5 py-2.5 text-[0.86rem] leading-[1.75]">○ {s.good}</p>
                      )}
                      {s.pairs && (
                        <div className="overflow-hidden rounded-xl border border-[#2a1f1a]/15 text-[0.8rem]">
                          <div className="grid grid-cols-[6.2rem_1fr] bg-[#ece3d2] px-3 py-2 text-[0.7rem] text-[#6d1f2c]">
                            <span>겉으로 싸운 것</span>
                            <span>속에서 부딪힌 것</span>
                          </div>
                          {s.pairs.map(([a, b]) => (
                            <div key={a} className="grid grid-cols-[6.2rem_1fr] gap-2 border-t border-[#2a1f1a]/10 px-3 py-2 leading-[1.65]">
                              <b className="font-medium">{a}</b>
                              <span className="text-[#5a4a3c]">{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <details className="group">
                        <summary className="cursor-pointer list-none text-[0.78rem] text-[#8a6a33]">
                          <span className="group-open:hidden">왜 그런지 · 언제까지 기다릴지 보기 ▾</span>
                          <span className="hidden group-open:inline">접기 ▴</span>
                        </summary>
                        <p className="mt-2 text-[0.82rem] leading-[1.85]">{s.insight}</p>
                        <p className="mt-2 text-[0.8rem] leading-[1.85] text-[#5a4a3c]">
                          <b className="text-[#2a1f1a]">언제?</b> {s.when}
                        </p>
                      </details>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* 이런 순간들 — 나머지 릴스 */}
            <div className="mt-14">
              <p className="px-6 text-center text-[0.72rem] tracking-[0.3em] text-gold/80">그리고 이런 순간들</p>
              <div className="mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2">
                {[...SCENES.map((s) => s.videos[1]).filter(Boolean), ...MOMENTS].map((v) => (
                  <div key={v.src} className="w-[44%] shrink-0 snap-center overflow-hidden rounded-xl bg-ink-soft">
                    <LoopVideo src={v.src} poster={v.poster} label={v.label} className="block aspect-[9/16] w-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="mt-6 px-6 text-center text-[0.86rem] font-light leading-[2] text-ivory-dim">
                이런 장이 <span className="text-ivory">10가지 상황 × 12가지 메시지</span>만큼 있어요.
                <br />
                당신 책에는, 당신의 장에 표시가 붙어요.
              </p>
            </div>
          </section>

          {/* ===== 2. 가격 (패키지 먼저, 책만도 바로) ===== */}
          <section className="mt-14 bg-gradient-to-b from-ink-soft/50 to-ink px-6 py-14">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">받아보는 방법</p>
            <p className="font-display mb-7 mt-2 text-center text-[1.05rem] leading-[1.9] text-ivory">
              오늘 밤 펼칠 수 있게, 1~3분이면 도착해요
            </p>
            <div className="relative mx-auto mb-8 w-[58%]">
              <div
                aria-hidden
                className="bk-halo pointer-events-none absolute left-1/2 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,196,138,0.25),transparent_65%)]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book/v2/cover-3d.webp"
                alt="《헤어진 뒤, 연락하지 말아야 할 때》 책"
                loading="lazy"
                className="bk-float relative block w-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.85)]"
              />
            </div>
            <PriceCards id="pick" />
            <ol className="mt-8 grid grid-cols-4 gap-2 text-center">
              {[
                ["1", "사연 쓰기", "3분"],
                ["2", "무료 미리보기", "바로"],
                ["3", "결제", "1회"],
                ["4", "책 도착", "1~3분"],
              ].map(([n, t, s]) => (
                <li key={n} className="rounded-xl border border-gold-dim/20 bg-ink-soft/50 px-1 py-3">
                  <p className="font-display text-[0.9rem] text-gold">{n}</p>
                  <p className="mt-1 text-[0.72rem] leading-[1.5] text-ivory">{t}</p>
                  <p className="text-[0.66rem] text-ivory-dim/70">{s}</p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-center text-[0.74rem] font-light leading-[1.8] text-ivory-dim">
              당신의 이야기로 쓰는 책이라 사연을 먼저 들려주세요.
              <br />
              결제 전에 무료 미리보기로 월화가 어떻게 읽는지 먼저 보여드려요.
            </p>
          </section>

          {/* ===== 3. 보내면 안 되는 메시지 7가지 (실제 본문 미리보기) ===== */}
          <div className="relative">
            <LoopVideo
              src="/book/v3/w-phone.mp4"
              poster="/book/v3/w-phone.webp"
              label="붉은 실이 감긴 휴대폰과 월화"
              fit="contain"
              className="block aspect-[3/4] w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink" />
            <p className="font-display absolute inset-x-0 bottom-6 px-6 text-center text-[1.05rem] leading-[1.8] text-ivory">
              보내기 전에, 휴대폰을 한 번 내려놓아요
            </p>
          </div>
          <section className="px-6 py-14">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">책 속 한 장 미리 보기</p>
            <h2 className="font-display mt-2 text-center text-[1.25rem] font-semibold leading-[1.6] text-ivory">
              지금 쓰고 있는 그 메시지,
              <br />
              <span className="text-gold">여기 있나요?</span>
            </h2>
            <p className="mt-3 text-center text-[0.8rem] font-light leading-[1.9] text-ivory-dim">
              PART 05 「보내면 안 되는 메시지 7가지」 — 눌러서 대신 보낼 문장을 확인해 보세요.
            </p>
            <div className="mt-7 space-y-2.5">
              {NEVER.map((m) => (
                <details key={m.no} className="group rounded-xl border border-gold-dim/20 bg-ink-soft/60 px-4 py-3.5">
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <span className="font-display w-5 shrink-0 text-thread">{m.no}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.7rem] text-gold/80">{m.name}</span>
                      <span className="mt-0.5 block text-[0.86rem] leading-[1.7] text-ivory/80 line-through decoration-thread/60">
                        {m.bad}
                      </span>
                    </span>
                    <span className="shrink-0 pt-1 text-gold transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="ml-8 mt-2.5 rounded-lg bg-[#eef3ea] px-3 py-2 text-[0.84rem] leading-[1.75] text-[#2a1f1a]">
                    ○ {m.better}
                  </p>
                </details>
              ))}
            </div>
            <p className="mt-6 rounded-xl border border-gold-dim/20 px-5 py-4 text-center text-[0.84rem] leading-[1.95] text-ivory-dim">
              “이 메시지는 그 사람을 편하게 하나,
              <br />
              아니면 내 불안을 덜어주려는 건가.”
              <br />
              <span className="text-gold">뒤쪽이라면, 오늘은 보내지 않는 날이에요.</span>
              <span className="mt-1 block text-[0.72rem] text-ivory-dim/70">— 책 속 월화의 한마디</span>
            </p>
          </section>

          {/* ===== 4. 실제 책을 넘겨 보세요 ===== */}
          <section className="relative">
            <LoopVideo
              src="/book/v3/w-reading.mp4"
              poster="/book/v3/w-reading.webp"
              label="이야기를 읽는 월화"
              fit="contain"
              className="block aspect-[3/4] w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink" />
            <svg aria-hidden viewBox="0 0 400 60" className="absolute inset-x-0 bottom-20 w-full">
              <path className="bk-thread" d="M0 40 C 80 10, 140 55, 200 30 S 320 5, 400 35" fill="none" stroke="#b2404f" strokeWidth="1.4" />
            </svg>
            <p className="font-display absolute inset-x-0 bottom-4 px-6 text-center text-[1.15rem] leading-[1.7] text-ivory">
              월화가 당신의 이야기를 읽고,
              <br />
              한 사람을 위한 책으로 엮어요
            </p>
          </section>
          <section className="px-6 pb-14 pt-8">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">실제 책을 넘겨 보세요</p>
            <p className="mb-7 mt-2 text-center text-[0.78rem] text-ivory-dim">
              가상의 신청자 ‘지수’ 님 사연으로 만든 실제 PDF예요 · 눌러서 넘길 수 있어요
            </p>
            <PageFlipper pages={PAGES} />
            <div className="mt-9 grid grid-cols-2 gap-2">
              {MINE.map((m) => (
                <div key={m.n} className="rounded-xl border border-gold-dim/20 bg-ink-soft/60 px-4 py-3.5">
                  <p className="font-display text-[0.8rem] text-gold">{m.n}</p>
                  <p className="mt-1 text-[0.86rem] leading-[1.55] text-ivory">{m.title}</p>
                  <p className="mt-1 text-[0.74rem] font-light leading-[1.7] text-ivory-dim">{m.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ===== 5. 월화의 밤 — 영상 띠 ===== */}
          <section className="py-6" aria-label="월화의 밤 영상">
            <p className="px-6 text-center text-[0.72rem] tracking-[0.3em] text-gold/80">월화의 밤</p>
            <div className="mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2">
              {["w-thread", "w-cups", "w-mirror"].map((n) => (
                <div key={n} className="w-[46%] shrink-0 snap-center overflow-hidden rounded-xl bg-ink-soft">
                  <LoopVideo
                    src={`/book/v3/${n}.mp4`}
                    poster={`/book/v3/${n}.webp`}
                    label="월화 영상"
                    className="block aspect-[9/16] w-full object-cover object-top"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 px-6 text-center text-[0.7rem] text-ivory-dim/60">옆으로 넘겨 보세요 →</p>
          </section>

          {/* ===== 6. 120쪽에 담긴 것 ===== */}
          <section className="px-6 py-14">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">이 책에 담긴 것</p>
            <h2 className="font-display mt-2 text-center text-[1.25rem] font-semibold leading-[1.6] text-ivory">
              헤어진 날 밤부터
              <br />
              <span className="text-gold">다시 만나는 날까지, 순서대로</span>
            </h2>
            <div className="mt-8 space-y-2.5">
              {CHAPTERS.map((c, i) => (
                <details
                  key={c.no}
                  open={i === 0}
                  className="group rounded-xl border border-gold-dim/20 bg-ink-soft/50 px-4 py-3.5"
                >
                  <summary className="flex cursor-pointer list-none items-start gap-3">
                    <span className="font-display w-7 shrink-0 text-[1.05rem] text-thread">{c.no}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.95rem] text-ivory">{c.title}</span>
                      <span className="mt-0.5 block text-[0.76rem] text-gold/85">{c.hook}</span>
                    </span>
                    <span className="shrink-0 pt-1 text-gold transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <ul className="ml-10 mt-3 space-y-1.5">
                    {c.items.map((it) => (
                      <li key={it} className="flex gap-2.5 text-[0.8rem] leading-[1.7] text-ivory-dim">
                        <span className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {/* ===== 7. 재회 상담과 비교 ===== */}
          <section className="border-t border-gold-dim/10 px-6 py-14">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">재회 상담과 무엇이 다른가요</p>
            <h2 className="font-display mt-2 text-center text-[1.25rem] font-semibold leading-[1.6] text-ivory">
              비싼 한 시간보다,
              <br />
              <span className="text-gold">흔들리는 21일 내내 곁에</span>
            </h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-gold-dim/25 text-[0.78rem]">
              <div className="grid grid-cols-[3.4rem_1fr_1fr] bg-ink-soft px-3 py-2.5 text-ivory-dim">
                <span />
                <span>일반 재회 상담</span>
                <span className="text-gold">월하연 책</span>
              </div>
              {COMPARE.map((c) => (
                <div key={c.label} className="grid grid-cols-[3.4rem_1fr_1fr] gap-x-2 border-t border-gold-dim/10 px-3 py-3">
                  <span className="text-[0.72rem] text-gold/80">{c.label}</span>
                  <span className="whitespace-pre-line leading-[1.7] text-ivory-dim">{c.them}</span>
                  <span className="whitespace-pre-line leading-[1.7] text-ivory">{c.us}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-thread/30 bg-thread/5 px-5 py-4 text-[0.8rem] font-light leading-[1.9] text-ivory-dim">
              <span className="text-ivory">‘반드시 재회’, ‘성공률 ○○%’</span>는 누구도 지킬 수 없는 말이에요. 상대의 마음은 누구도
              대신 움직일 수 없으니까요. 월화는 그 말을 하지 않는 대신, 지금 무엇을 하지 않고 언제 무엇을 할지 — 당신이
              지킬 수 있는 순서를 드려요.
            </div>
            <p className="mt-3 text-[0.66rem] leading-[1.7] text-ivory-dim/60">
              일반 재회 상담 비용은 공개된 기사(데일리한국 2015, 시빅뉴스 2017)와 온라인 재능마켓의 공개 상품 가격(2026년 10월
              확인)을 바탕으로 한 예시이며, 업체마다 달라요.
            </p>
          </section>

          {/* ===== 8. 실제 후기 (승인된 것만, 없으면 숨김) ===== */}
          {reviews.length > 0 && (
            <section className="border-t border-gold-dim/10 py-14">
              <p className="px-6 text-center text-[0.72rem] tracking-[0.3em] text-gold/80">먼저 받아본 분들의 이야기</p>
              <p className="mt-2 px-6 text-center text-[0.74rem] text-ivory-dim/70">
                결제하신 분만 남길 수 있는 후기예요 · 공개에 동의한 글만 그대로 실어요
              </p>
              <div className="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-3">
                {reviews.map((r) => (
                  <figure key={r.id} className="w-[82%] shrink-0 snap-center rounded-2xl border border-gold-dim/25 bg-ink-soft/70 px-5 py-5">
                    <Stars n={r.rating} />
                    <blockquote className="mt-2 whitespace-pre-wrap text-[0.86rem] font-light leading-[1.9] text-ivory">{r.body}</blockquote>
                    <figcaption className="mt-3 text-[0.72rem] text-ivory-dim">
                      {r.name} · {r.product} 구매 · {r.month}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* ===== 9. 월화의 말 ===== */}
          <section className="px-6 pb-12 pt-4">
            <div className="rounded-2xl border border-gold-dim/25 bg-[#f5efe3] px-6 py-8 text-[#2a1f1a]">
              <p className="text-[0.7rem] tracking-[0.3em] text-[#a8823f]">당신의 책 첫 장에 제가 쓰는 말</p>
              <p className="font-display mt-4 text-[0.95rem] leading-[2.05]">
                지금 마음이 100처럼 느껴진다면,
                <br />
                그건 그만큼 진심이었다는 뜻이에요.
                <br />
                그 크기를 줄이라고 말하지 않을게요.
                <br />
                대신, 그 마음이 서두르다 다치지 않도록
                <br />
                한 장씩 순서를 적어 두었어요.
              </p>
              <p className="mt-5 text-right text-[0.85rem] text-[#a8823f]">— 월화</p>
            </div>
          </section>

          {/* ===== 10. 자주 묻는 질문 ===== */}
          <section className="px-6 pb-12">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">자주 묻는 질문</p>
            <div className="mt-6 space-y-2.5">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-xl border border-gold-dim/20 px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.9rem] text-ivory">
                    {f.q}
                    <span className="shrink-0 text-gold transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[0.82rem] font-light leading-[1.9] text-ivory-dim">
                    {f.a}
                    {f.q.startsWith("환불") && (
                      <>
                        {" "}
                        <Link href="/refund" className="underline underline-offset-4">
                          환불정책
                        </Link>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* ===== 11. 마지막 구매 ===== */}
          <div className="relative">
            <LoopVideo
              src="/book/v3/w-final.mp4"
              poster="/book/v3/w-final.webp"
              label="월화"
              fit="contain"
              className="block aspect-[3/4] w-full"
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
            <p className="font-display absolute inset-x-0 bottom-5 px-6 text-center text-[1.05rem] leading-[1.8] text-ivory">
              오늘 밤, 보내기 전에
              <br />
              먼저 펼쳐 보세요.
            </p>
          </div>
          <section className="px-6 pb-12 pt-8">
            <PriceCards id="pick-last" />
          </section>

          <section className="px-6 pb-10 text-[0.72rem] font-light leading-[1.9] text-ivory-dim/70">
            <p>· 관계와 감정을 돌아보기 위한 개인화 디지털 콘텐츠이며, 상대의 감정·연락·재회를 보장하지 않아요.</p>
            <p>· 차단이나 안전 문제가 있는 사연에는 연락 문장을 쓰지 않고, 거리를 지키는 방법을 담아요.</p>
            <p>· 장면 영상은 이해를 돕기 위한 연출이에요.</p>
            <p>
              · PDF를 한 번이라도 받으신 뒤에는 맞춤 제작 디지털 콘텐츠의 특성상 단순 변심 환불이 제한돼요.{" "}
              <Link href="/refund" className="underline underline-offset-4">
                환불정책
              </Link>
            </p>
          </section>
        </main>
        <Footer />
        <BookStickyBuy href={hrefFor("book")} label={`내 책 받기 · ${BOOK_PRICE_KRW.toLocaleString()}원`} />
      </div>
    </div>
  );
}
