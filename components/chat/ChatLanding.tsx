"use client";

/**
 * 카톡 대화 분석 상세 화면 (10/31) — 예시 대화·예시 차트·근거 목록으로 "무엇을 받는지" 먼저 보여 준다.
 * 원칙: 예시는 '예시'로 표시 · 지어낸 후기 없음 · 결과 보장 표현 없음.
 */
import LoopVideo from "@/components/book/LoopVideo";
import TempChart from "@/components/chat/TempChart";
import InView from "@/components/fx/InView";
import SplitWords from "@/components/fx/SplitWords";
import { CHAT_PRICE_KRW } from "@/lib/chat/types";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Totals from "@/components/home3/Totals";
import RollingCount from "@/components/home3/RollingCount";
import ReviewMarquee from "@/components/home4/ReviewMarquee";
import { maskName, type ReviewView } from "@/components/home4/ReviewCard";
import { SAVED_REVIEWS } from "@/lib/home/reviews-saved";
import type { SiteTotals } from "@/lib/site-totals";
import type { PublicReview } from "@/lib/reviews";

type Line = { me?: boolean; text: string; time?: string; note?: string };

function Bubbles({ lines, name = "그 사람" }: { lines: Line[]; name?: string }) {
  return (
    <div className="rounded-2xl bg-[#b2c7d9] px-3 py-3.5 text-[0.84rem] text-[#191919]">
      {lines.map((l, i) => (
        <div key={i} className={`fx-pop mt-2 flex flex-col first:mt-0 ${l.me ? "items-end" : "items-start"}`} style={{ ["--i" as string]: i }}>
          {!l.me && (i === 0 || lines[i - 1].me) && <span className="mb-0.5 text-[0.7rem] text-[#3a3a3a]">{name}</span>}
          <div className={`flex items-end gap-1.5 ${l.me ? "flex-row-reverse" : ""}`}>
            <p className={`max-w-[15rem] rounded-2xl px-3 py-1.5 ${l.me ? "rounded-tr-md bg-[#fee500]" : "rounded-tl-md bg-white"}`}>{l.text}</p>
            {l.time && <span className="shrink-0 text-[0.62rem] text-[#55606b]">{l.time}</span>}
          </div>
          {l.note && <span className="mt-0.5 text-[0.7rem] font-semibold text-[#b8325a]">↳ {l.note}</span>}
        </div>
      ))}
    </div>
  );
}

const EX_WEEKS = [
  { label: "9/1주", me: 62, partner: 71 },
  { label: "9/8주", me: 66, partner: 69 },
  { label: "9/15주", me: 71, partner: 52 },
  { label: "9/22주", me: 77, partner: 44 },
  { label: "9/29주", me: 80, partner: 38 },
];

const CARDS: {
  no: string;
  q: string;
  tags: string[];
  chat: Line[];
  chart?: boolean;
  bars?: { k: string; me: number; p: number }[];
  head: string;
  evidence: string[];
}[] = [
  {
    no: "01",
    q: "그 사람은 지금\n나를 어떻게 생각할까?",
    tags: ["#먼저연락", "#답장속도", "#질문빈도"],
    chat: [
      { text: "오늘 회사 어땠어?", time: "9/4 21:12", note: "질문 · 먼저 연락" },
      { me: true, text: "완전 정신없었어ㅠ 너는?", time: "21:15" },
      { me: true, text: "이번 주 금요일 뭐해?", time: "9/23 20:40" },
      { text: "글쎄 아직", time: "23:51", note: "3시간 11분 · 답 4자" },
    ],
    chart: true,
    head: "9월 셋째 주부터 그 사람 쪽 온도가 내려가고 있어요. 마음이 없어졌다기보다, 대화를 이어 갈 힘이 줄어든 흐름이에요.",
    evidence: ["주별 온도(그 사람) 71 → 69 → 52 → 44 → 38", "먼저 말 거는 횟수 9/15주 이후 4회 → 1회", "그 사람 답장 시간 평균 12분 → 2시간대"],
  },
  {
    no: "02",
    q: "우리 관계는 앞으로\n어디로 흘러갈까?",
    tags: ["#만나자는말", "#다음에·언젠가", "#대화마무리"],
    chat: [
      { me: true, text: "우리 담에 한강 가자ㅎㅎ", time: "22:40" },
      { text: "ㅇㅇ 언젠가ㅋㅋ", time: "22:52", note: "'언젠가' · 날짜 없음" },
      { text: "나 이제 잘게 내일 봐", time: "23:05", note: "대화 마무리 · 그 사람" },
    ],
    bars: [
      { k: "만나자는 말", me: 4, p: 0 },
      { k: "'다음에·언젠가'", me: 1, p: 6 },
      { k: "대화를 먼저 끝냄", me: 3, p: 8 },
    ],
    head: "마음이 닫힌 건 아니지만, 약속을 정하는 말은 아직 그 사람 쪽에서 나오지 않아요.",
    evidence: ["만나자는 말 — 나 4회 / 그 사람 0회", "'다음에·언젠가' — 그 사람 6회, 날짜가 붙은 건 0회", "대화 마무리 11번 중 8번이 그 사람"],
  },
  {
    no: "03",
    q: "말하지 않고\n숨기는 마음은 뭘까?",
    tags: ["#감정단어", "#밤연락", "#온도차"],
    chat: [
      { me: true, text: "보고 싶다ㅎㅎ", time: "9/6 23:02" },
      { text: "ㅋㅋ 나도 뭐", time: "23:04", note: "감정 단어 피하기" },
      { text: "자? 약은 챙겨 먹었어?", time: "9/9 23:40", note: "밤 · 먼저 챙김" },
    ],
    bars: [
      { k: "감정 단어", me: 19, p: 2 },
      { k: "밤 11시 이후 먼저 연락", me: 3, p: 5 },
    ],
    head: "표현은 무딘데, 챙기는 행동은 남아 있어요. 말보다 행동으로 마음을 내는 쪽일 수 있어요.",
    evidence: ["좋아·보고 싶어 같은 말 — 나 19회 / 그 사람 2회", "밤 11시 이후 먼저 연락 — 그 사람 5회 (모두 9/15 이전)"],
  },
  {
    no: "04",
    q: "그래서 다음엔\n뭐라고 보내야 할까?",
    tags: ["#보내면안되는말", "#다음메시지3개", "#예상반응"],
    chat: [
      { me: true, text: "요즘 바쁜가 보네! 그때 말한 전시 이번 주까지래, 생각나서ㅎㅎ", note: "추천 1 · 부담 낮음 — 답하기 쉬운 정보형" },
      { me: true, text: "우리 요즘 왜 이래? 나만 연락하는 거 같아", note: "보내면 안 되는 말 — 확인 질문은 방어를 부름" },
    ],
    head: "지금 보내면 안 되는 문장과, 부담 낮은 순서로 다음 메시지 3개를 예상 반응과 함께 드려요.",
    evidence: ["다음 메시지 3개 — 의도 · 예상 반응", "1~2주 실천 계획"],
  },
];

export default function ChatLanding({
  onFile,
  onQuiz,
  totals = null,
  reviews = [],
}: {
  onFile: () => void;
  onQuiz: () => void;
  totals?: SiteTotals | null;
  reviews?: PublicReview[];
}) {
  /* 11/27 운영자 요청: 첫 화면 버튼이 지나가면 하단 버튼이 따라다님 (마지막 버튼 근처에서는 숨김) */
  const heroCtaRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [nearEnd, setNearEnd] = useState(false);
  useEffect(() => {
    const ios: IntersectionObserver[] = [];
    if (typeof IntersectionObserver === "undefined") return;
    if (heroCtaRef.current) {
      const io = new IntersectionObserver((es) => setHeroVisible(es.some((e) => e.isIntersecting || e.boundingClientRect.top > 0)));
      io.observe(heroCtaRef.current);
      ios.push(io);
    }
    if (endRef.current) {
      const io = new IntersectionObserver((es) => setNearEnd(es.some((e) => e.isIntersecting)));
      io.observe(endRef.current);
      ios.push(io);
    }
    return () => ios.forEach((io) => io.disconnect());
  }, []);
  const stickyOn = !heroVisible && !nearEnd;
  const visitors = totals?.visitors ?? 0;
  /* 후기: 카톡 분석 후기를 앞에, 나머지 실제 후기를 뒤에 (DB 승인 + 운영자 저장 원문) */
  const reviewItems: ReviewView[] = [
    ...SAVED_REVIEWS.filter((r) => r.product === "카톡 대화 분석"),
    ...reviews.map((r) => ({ id: r.id + 100, product: r.product, body: r.body, age: undefined as string | undefined, name: r.name, stars: r.rating, db: true })),
    ...SAVED_REVIEWS.filter((r) => r.product !== "카톡 대화 분석"),
  ].map((r) => ({
    key: `${"db" in r ? "d" : "s"}${r.id}`,
    id: r.id,
    name: "name" in r && r.name ? r.name : maskName(r.id),
    stars: "stars" in r && r.stars ? r.stars : 5,
    body: r.body,
    product: r.product,
    age: r.age,
  }));
  const cta = (label: string) => (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={onFile} className="fx-sheen flex min-h-14 w-full items-center justify-center rounded-full bg-[#e46b8a] px-5 text-[1rem] font-bold text-white shadow-[0_0_40px_rgba(228,107,138,0.35)] active:opacity-85">
        {label}
      </button>
      <button type="button" onClick={onQuiz} className="text-[0.84rem] text-white/60 underline underline-offset-4">
        파일 내보내기가 어렵다면 — 캡처로 분석하기
      </button>
    </div>
  );
  return (
    <div className="fx-grain bg-[#0e0b0d] text-white">
      {/* 히어로 */}
      {/* 11/28 운영자 요청: 재회 분석 첫 화면처럼 '현실감' 있게 — 질문 3줄 → 진짜 카톡 같은 카드 → 누적 고객 → 큰 버튼.
          첫 화면에는 금액을 절대 보이지 않는다 (금액은 아래 구간·따라다니는 버튼에만). */}
      <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          <LoopVideo src="/book/v3/w-phone.mp4" poster="/book/v3/w-phone.webp" className="h-full w-full scale-110 object-cover opacity-35 blur-[6px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0e0b0d]/70 via-[#0e0b0d]/55 to-[#0e0b0d]" />
        </div>
        <div className="relative mx-auto w-full max-w-[560px] px-5 pb-8 pt-24 text-center">
          <p className="text-[0.95rem] font-bold text-[#e46b8a]">혹시 오늘도,</p>
          <h1 className="font-display mt-3 text-[1.95rem] leading-[1.38] text-[#efe6d8]">
            <SplitWords text={"'응' 한 글자에\n하루 종일\n마음이 쓰였나요?"} />
          </h1>

          {/* 진짜 카톡 같은 대화 카드 (예시 화면) */}
          <InView className="reveal mx-auto mt-7 max-w-[340px] rounded-[1.6rem] border border-white/10 bg-[#1a1618]/85 p-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <span className="h-8 w-8 rounded-[0.7rem] bg-white/15" aria-hidden />
              <span className="text-[0.9rem] text-white/80">그 사람</span>
            </div>
            <div className="mt-3 flex flex-col gap-2.5 text-[0.9rem]">
              <div className="flex items-end justify-end gap-1.5">
                <span className="text-[0.66rem] text-white/40">오후 7:12</span>
                <span className="rounded-2xl rounded-tr-md bg-[#fee500] px-3.5 py-2 text-[#191919]">오늘 뭐 해? 저녁은 먹었어?</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="rounded-2xl rounded-tl-md bg-white/12 px-3.5 py-2 text-white/90">응</span>
                <span className="text-[0.66rem] text-white/40">오후 11:48</span>
              </div>
              <div className="flex items-end justify-end gap-1.5">
                <span className="flex flex-col items-end text-[0.66rem] leading-tight">
                  <b className="font-bold text-[#fee500]">1</b>
                  <span className="text-white/40">오후 11:52</span>
                </span>
                <span className="rounded-2xl rounded-tr-md bg-[#fee500] px-3.5 py-2 text-[#191919]">바빴구나ㅎㅎ 내일은?</span>
              </div>
            </div>
            <p className="mt-3 flex justify-between text-[0.7rem] text-white/45">
              <span>답장까지 <b className="text-[#ff8fab]">4시간 36분</b></span>
              <span>예시 화면</span>
            </p>
          </InView>

          {visitors >= 100 && (
            <div className="mt-6 flex justify-center">
              <p className="relative rounded-full border border-[#e46b8a]/40 bg-[#1d181b]/90 px-4 py-2 text-[0.84rem] font-semibold text-white">
                누적 고객{" "}
                <b className="mx-0.5 text-[1.1rem] text-[#ff8fab] [text-shadow:0_0_12px_rgba(255,143,171,0.5)]">
                  <RollingCount value={visitors} />
                </b>
                명이 월화를 찾았어요
                <span aria-hidden className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-[#e46b8a]/40 bg-[#1d181b]" />
              </p>
            </div>
          )}
          <div ref={heroCtaRef} className={visitors >= 100 ? "mt-4" : "mt-6"}>
            <button type="button" onClick={onFile} className="fx-sheen flex min-h-14 w-full items-center justify-center rounded-full bg-[#e46b8a] px-5 text-[1.05rem] font-bold text-white shadow-[0_0_40px_rgba(228,107,138,0.35)] active:opacity-85">
              내 카톡으로 무료 분석 시작
            </button>
          </div>
          <p className="mt-3 text-[0.8rem] text-white/55">
            <button type="button" onClick={onQuiz} className="underline underline-offset-4">캡처로 하기</button>
            <span className="mx-2 text-white/25">·</span>
            <a href="/chat/sample" className="underline underline-offset-4">결과 예시 보기</a>
          </p>
        </div>
      </section>

      {/* 3단계 */}
      <section className="mx-auto mt-10 max-w-[560px] px-5">
        <p className="fx-kicker text-[#e8b04a]">How it works</p>
        <SplitWords as="h2" className="font-display mt-3 block text-[1.6rem] font-bold" text="딱 3단계면 끝" />
        <ol className="mt-4 flex flex-col gap-3">
          {[
            ["대화 내보내기", "카톡 대화방 → 메뉴 → 대화 내보내기 (텍스트만). 인스타 DM 파일도 돼요."],
            ["파일 올리고 무료 숫자 분석", "주별 대화 온도, 먼저 연락한 횟수, 답장 시간 변화를 바로 보여 드려요. 이 단계는 무료예요."],
            ["해석 리포트 받기", "결제하면 1~2분 안에 월화가 대화 전체를 읽고 해석과 다음 메시지까지 정리해 드려요."],
          ].map(([t, d], i) => (
            <InView as="li" key={t} className="reveal fx-glass flex gap-3 rounded-2xl px-4 py-4" style={{ transitionDelay: `${i * 120}ms` }}>
              <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e46b8a] to-[#8a2442] text-[1rem] font-bold">{i + 1}</span>
              <span className="min-w-0">
                <b className="block text-[0.98rem]">{t}</b>
                <span className="mt-0.5 block text-[0.84rem] leading-[1.7] text-white/65">{d}</span>
              </span>
            </InView>
          ))}
        </ol>
      </section>

      {/* 11/27 요청: 3단계 밑에 후기 3줄 (왼·오·왼으로 흐름) */}
      {reviewItems.length > 0 && (
        <section className="mt-14">
          <div className="mx-auto max-w-[560px] px-5">
            <p className="fx-kicker text-[#e46b8a]">Reviews</p>
            <SplitWords as="h2" className="font-display mt-3 block text-[1.6rem] font-bold leading-[1.35]" text="먼저 열어 본 분들의 이야기" />
          </div>
          <ReviewMarquee className="mx-auto mt-6 max-w-[560px]" items={reviewItems} href="/reviews" />
          <div className="mx-auto max-w-[560px] px-5">
            <Link href="/reviews" className="mt-4 block rounded-xl border border-white/15 py-3 text-center text-[14px] font-bold text-white/90">
              후기 더보기 ›
            </Link>
          </div>
        </section>
      )}

      {/* 11/27 요청: 후기 밑에 월계수 (실제 집계 · 테스트 주문 제외) */}
      {totals && (
        <div className="mx-auto max-w-[560px]" style={{ ["--color-ivory" as string]: "#efe6d8", ["--color-ivory-dim" as string]: "#a59c8f" } as React.CSSProperties}>
          <Totals totals={totals} />
        </div>
      )}

      {/* 무엇을 보는지 */}
      <section className="mx-auto max-w-[560px] px-5 pt-6">
        <p className="fx-kicker text-[#e46b8a]">What we read</p>
        <SplitWords as="h2" className="font-display mt-3 block text-[1.6rem] font-bold leading-[1.35]" text={"대화에는 마음이 남아요.\n말보다 흐름에서 더 잘 보일 때도 있어요."} />
      </section>

      {CARDS.map((c) => (
        <section key={c.no} className="mx-auto mt-10 max-w-[560px] px-5">
          <InView className="reveal fx-glass rounded-[28px] px-5 py-6" threshold={0.12}>
            <p className="font-display fx-rose text-[2.2rem] font-black leading-none">{c.no}</p>
            <h3 className="font-display mt-2 whitespace-pre-line text-[1.4rem] font-bold leading-[1.35]">{c.q}</h3>
            <p className="mt-2 text-[0.76rem] text-white/45">{c.tags.join(" ")}</p>
            <div className="mt-4">
              <Bubbles lines={c.chat} />
            </div>
            <div className="mt-4 rounded-2xl border border-white/5 bg-black/25 px-4 py-4 text-white">
              {c.chart ? (
                <TempChart weeks={EX_WEEKS} example />
              ) : c.bars ? (
                <div className="flex flex-col gap-3">
                  {c.bars.map((b) => {
                    const max = Math.max(b.me, b.p, 1);
                    return (
                      <div key={b.k}>
                        <p className="text-[0.76rem] text-white/70">{b.k}</p>
                        <div className="mt-1 flex items-center gap-2 text-[0.72rem]">
                          <span className="w-12 text-white/60">나</span>
                          <div className="h-2.5 flex-1 rounded-full bg-white/10"><div className="fx-bar h-full rounded-full bg-gradient-to-r from-[#e8b04a] to-[#f3d08a]" style={{ width: `${(b.me / max) * 100}%` }} /></div>
                          <span className="w-6 text-right tabular-nums">{b.me}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[0.72rem]">
                          <span className="w-12 text-white/60">그 사람</span>
                          <div className="h-2.5 flex-1 rounded-full bg-white/10"><div className="fx-bar h-full rounded-full bg-gradient-to-r from-[#b8325a] to-[#e46b8a]" style={{ width: `${(b.p / max) * 100}%`, ["--i" as string]: 1 }} /></div>
                          <span className="w-6 text-right tabular-nums">{b.p}</span>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-right text-[0.68rem] text-white/40">예시</p>
                </div>
              ) : (
                <p className="text-[0.84rem] text-white/70">결과 화면에서 실제 문장으로 받아요 · 예시</p>
              )}
            </div>
            <div className="fx-hair mt-5" />
            <p className="font-display mt-4 text-[1.08rem] font-bold leading-[1.7]">{c.head}</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-[0.72rem] font-semibold text-white/50">근거</p>
              <ul className="mt-1 flex flex-col gap-1 text-[0.82rem] text-white/80">
                {c.evidence.map((e) => (
                  <li key={e}>
                    <span className="mr-1.5 text-[#e46b8a]">[대화]</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </InView>
        </section>
      ))}

      {/* 자주 묻는 질문 */}
      <section className="mx-auto mt-14 max-w-[560px] px-5">
        <p className="fx-kicker text-[#e8b04a]">FAQ</p>
        <SplitWords as="h2" className="font-display mt-3 block text-[1.6rem] font-bold" text="자주 묻는 질문" />
        <div className="mt-4 flex flex-col gap-2">
          {[
            ["내 대화가 밖으로 새어 나가진 않나요?", "무료 숫자 분석은 내 휴대폰 안에서만 계산하고 서버로 보내지 않아요. 결제하면 리포트를 만들 때만 대화를 보내고, 리포트가 완성되면 원문은 바로 삭제해요. 결제하지 않으면 48시간 안에 삭제돼요."],
            ["상대방이 분석한 걸 알 수 있나요?", "아니요. 상대에게 어떤 알림이나 메시지도 가지 않아요. 내가 올린 파일만 읽어요."],
            ["상대 이름이 결과에 나오나요?", "아니요. 대화 속 이름은 정해 주신 호칭(예: 그 사람)으로 바꿔서 읽고, 결과에도 호칭만 써요."],
            ["대화는 얼마나 있어야 하나요?", "개수 제한은 없지만 30개보다 적으면 분석이 얕아질 수 있어요. 두 사람이 나눈 1:1 대화방이 가장 정확해요."],
            ["파일 내보내기가 어려워요.", "캡처(최대 10장)로도 분석할 수 있어요. 다만 시간 정보가 없어 숫자 분석은 줄어들어요."],
            ["재회나 연애가 꼭 되나요?", "결과를 보장하지 않아요. 대화에서 보이는 패턴과, 지금 할 수 있는 가장 부담 낮은 다음 걸음을 정리해 드려요."],
            ["환불되나요?", "리포트를 열어 보기 전이면 7일 안에 전액 환불돼요. 만 14세 미만은 결제할 수 없고, 미성년자는 보호자 동의가 필요해요."],
          ].map(([q, a]) => (
            <details key={q} className="fx-glass group rounded-2xl px-4 py-3.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.92rem] font-semibold">
                {q}
                <span className="text-white/40 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-[0.84rem] leading-[1.8] text-white/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section ref={endRef} className="mx-auto max-w-[560px] px-5 pb-28 pt-12">
        <a href="/chat/sample" className="mb-4 flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 text-[0.92rem] text-white/85">
          결과 리포트 예시 먼저 보기
        </a>
        {cta("그 사람 마음 확인하기")}
      </section>

      {/* 11/27 요청: 따라다니는 하단 버튼 + 누적 고객 말풍선 (100명 미만이면 숨김) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[560px] border-t border-white/10 bg-[#0e0b0d]/95 px-4 pt-2.5 backdrop-blur transition-transform duration-300 ${stickyOn ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.6rem)" }}
        aria-hidden={!stickyOn}
      >
        {visitors >= 100 && (
          <div className={`pointer-events-none absolute inset-x-0 -top-11 flex justify-center transition-opacity duration-300 ${stickyOn ? "opacity-100" : "opacity-0"}`}>
            <p className="relative rounded-full border border-[#e46b8a]/40 bg-[#1d181b]/95 px-3.5 py-1.5 text-[0.8rem] font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
              누적 고객{" "}
              <b className="mx-0.5 text-[1.02rem] text-[#ff8fab] [text-shadow:0_0_12px_rgba(255,143,171,0.5)]">
                <RollingCount value={visitors} />
              </b>
              명이 월화를 찾았어요
              <span aria-hidden className="absolute -bottom-[5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-[#e46b8a]/40 bg-[#1d181b]" />
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onFile}
          tabIndex={stickyOn ? 0 : -1}
          className="fx-sheen flex h-12 w-full items-center justify-center rounded-full bg-[#e46b8a] text-[0.96rem] font-bold text-white active:opacity-85"
        >
          내 카톡으로 무료 분석 시작
        </button>
        <p className="mt-1 text-center text-[0.72rem] text-white/50">숫자 분석 무료 · 해석 리포트 {CHAT_PRICE_KRW.toLocaleString()}원 · 구독 없음</p>
      </div>
    </div>
  );
}
