import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  BOOK_PRICE_KRW,
  BUNDLE_PRICE_KRW,
  RITUAL_PRICE_KRW,
  RITUAL_REGULAR_PRICE_KRW,
  isPromoActive,
} from "@/lib/ritual-types";
import {
  STAGES,
  WHY_NOT_NOW,
  READ_PARTNER,
  WHEN_THEY_REACH,
  REUNION_START,
} from "@/lib/book/book-contents";

export const metadata: Metadata = {
  title: "개인화 PDF 책 《헤어진 뒤, 연락하지 말아야 할 때》 | 월하연 月下緣",
  description:
    "보내고 싶은 마음을 참는 밤마다 펼쳐 보는 한 권. 내 이름과 날짜, 나를 위한 문장으로 채운 약 125쪽.",
};

const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

const NIGHTS: Array<{ time: string; line: string }> = [
  { time: "새벽 2시", line: "카톡 창을 열었다가, 다시 닫는 밤" },
  { time: "아침 8시", line: "스토리 조회 목록부터 확인하는 아침" },
  { time: "퇴근길", line: "‘마지막으로 한 번만’이 입안에 맴도는 저녁" },
];

const MINE: Array<{ n: string; title: string; body: string }> = [
  { n: "01", title: "표지와 첫 편지에, 당신의 이름을 적어요", body: "들려준 이야기를 읽고, 당신에게만 쓰는 편지로 책을 열어요." },
  { n: "02", title: "지금 연락해도 되는지, 날짜로 알려드려요", body: "막연한 ‘조금만 더’가 아니라, 언제까지 기다리면 되는지 달력에 표시하듯 적어둘게요." },
  { n: "03", title: "당신의 장에 표시를 해둘게요", body: "10가지 상황 중 당신에게 해당하는 장에 ‘OO 님의 상황이에요’를 붙여요. 다 읽지 않아도, 거기부터 펼치면 돼요." },
  { n: "04", title: "보낼 날의 문장도 미리 써둘게요", body: "기다림이 끝난 날, 무슨 말로 시작할지 막막하지 않도록 당신의 상황에 맞춘 초안을 남겨요." },
];

const SAMPLES: Array<{ src: string; alt: string; caption: string }> = [
  { src: "/book/sample-situation.webp", alt: "상황별 장 샘플", caption: "내 상황의 장에 붙는 월화의 설명" },
  { src: "/book/sample-messages.webp", alt: "메시지 실전편 샘플", caption: "보내는 날을 위한 메시지 실전편" },
  { src: "/book/sample-plan.webp", alt: "21일 플랜 샘플", caption: "실제 날짜가 적힌 21일 플랜" },
];

const DAYS: Array<{ when: string; title: string; body: string }> = [
  { when: "오늘 밤", title: "보내고 싶어지면, 먼저 펼쳐요", body: "손가락이 먼저 움직이려 할 때 ‘연락 전 체크’를 펼치세요. 보내지 않은 오늘이, 내일의 당신을 지켜줘요." },
  { when: "7일째", title: "버틴 날이 눈에 보여요", body: "결제한 날부터 날짜를 적어둔 7일이에요. 하루씩 채우다 보면, 생각보다 멀리 와 있을 거예요." },
  { when: "21일째", title: "다시 이어질 준비가 돼요", body: "감정을 가라앉히고, 관계를 돌아보고, 무엇을 할지 정해요. 충동이 아니라 순서로 움직일 수 있을 때예요." },
];

const GROUPS: Array<{ no: string; stage: string; title: string; lead: string; items: string[] }> = [
  {
    no: "01",
    stage: "재회 전",
    title: "왜 지금 연락하면 안 되는지",
    lead: "참으라고만 하면 못 참아요. 왜 지금이 아닌지 알아야 손이 멈춰요.",
    items: WHY_NOT_NOW,
  },
  {
    no: "02",
    stage: "재회 전",
    title: "상대의 행동, 어디까지 읽어도 될까",
    lead: "스토리 하나, 차단 해제 하나에 흔들리지 않도록 — 조건부로 읽는 법을 알려드려요.",
    items: READ_PARTNER,
  },
  {
    no: "03",
    stage: "연락이 오는 순간",
    title: "연락이 왔을 때, 이렇게 답해요",
    lead: "기다린 끝에 온 연락을 한 번의 답장으로 놓치지 않도록, 상황별 문장을 적어뒀어요.",
    items: WHEN_THEY_REACH,
  },
  {
    no: "04",
    stage: "재회 시작 단계",
    title: "다시 만나기 시작할 때",
    lead: "다시 만나는 것보다, 같은 이유로 다시 헤어지지 않는 게 더 중요해요.",
    items: REUNION_START,
  },
];

const PARTS = [
  "헤어진 직후",
  "상대 마음을 추측하게 되는 이유",
  "연락할까, 기다릴까 — 10가지 상황",
  "월화의 ‘연락 전 체크’",
  "연락 메시지 실전편 — 12가지 상황",
  "관계를 보는 법",
  "24시간 가이드",
  "7일 가이드",
  "21일 관계 리셋 플랜",
  "붉은 인연의 실 리추얼",
];

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
      : "/apply";
  const messageNow = isPromoActive() ? RITUAL_PRICE_KRW : RITUAL_REGULAR_PRICE_KRW;
  const separate = messageNow + BOOK_PRICE_KRW;
  const ctaMain = orderNumber ? "나의 책과 함께 받기" : "이야기 들려주고, 나의 책 받기";

  return (
    <div className="min-h-screen bg-[#080607]">
      <div className="relative mx-auto min-h-screen w-full max-w-[500px] overflow-hidden bg-ink shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        <Header />
        <main>
          {/* 1. 첫 화면 */}
          <section className="relative px-6 pb-16 pt-28 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-40 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,196,138,0.18),transparent_65%)]"
            />
            <p className="relative text-[0.72rem] tracking-[0.35em] text-gold/80">月下緣 · 월화의 책</p>
            <p className="font-display relative mt-7 text-[1.02rem] leading-[1.9] text-ivory-dim">
              오늘 밤도,
              <br />
              보내지 못한 메시지가 있나요.
            </p>
            <h1 className="font-display relative mt-6 text-[1.75rem] font-semibold leading-[1.5] text-ivory">
              헤어진 뒤,
              <br />
              연락하지 말아야 할 때
            </h1>
            <div className="relative mx-auto mt-8 w-[78%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book/cover-3d.webp"
                alt="《헤어진 뒤, 연락하지 말아야 할 때》 책 표지"
                className="block w-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.8)]"
              />
            </div>
            <p className="relative mt-9 text-[0.92rem] font-light leading-[2] text-ivory-dim">
              그런 밤을 위해 한 권을 썼어요.
              <br />
              <span className="text-ivory">당신의 이름으로, 약 125쪽.</span>
            </p>
            <p className="relative mt-2 text-[0.82rem] text-gold/80">— 월화</p>
            <Link
              href={hrefFor("bundle")}
              className="cta-glow relative mt-8 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
            >
              {ctaMain}
            </Link>
          </section>

          {/* 1-1. 월화가 건네는 책 */}
          <section>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book/wolhwa-hold.webp"
                alt="책을 품에 안은 월화"
                loading="lazy"
                className="block aspect-[4/4.6] w-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
            </div>
            <div className="relative -mt-8 px-6 pb-14 text-center">
              <p className="text-[0.72rem] tracking-[0.3em] text-gold/85">안녕하세요, 월화예요</p>
              <p className="font-display mt-4 text-[1.05rem] leading-[2] text-ivory">
                헤어진 뒤 저를 찾아온 사람들은
                <br />
                거의 같은 걸 물었어요.
              </p>
              <p className="font-display mt-3 text-[1.1rem] text-gold">“지금, 연락해도 될까요?”</p>
              <p className="mt-5 text-[0.88rem] font-light leading-[2] text-ivory-dim">
                저는 매번 같은 대답을 했어요.
                <br />
                “아직은요. 대신, 순서가 있어요.”
                <br />
                <br />
                그 순서를 한 권에 모았어요.
                <br />
                그리고 첫 장부터 <span className="text-ivory">당신의 이름으로</span> 다시 써요.
              </p>
            </div>
          </section>

          {/* 2. 그 순간들 */}
          <section className="border-t border-gold-dim/10 px-6 py-16">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">이런 밤, 있었죠</p>
            <ul className="mt-8 space-y-3">
              {NIGHTS.map((n) => (
                <li key={n.time} className="rounded-xl border border-gold-dim/15 bg-ink-soft/50 px-5 py-4">
                  <p className="text-[0.7rem] tracking-[0.2em] text-gold/70">{n.time}</p>
                  <p className="font-display mt-1 text-[1rem] text-ivory">{n.line}</p>
                </li>
              ))}
            </ul>
            <p className="font-display mt-10 text-center text-[1.05rem] leading-[1.9] text-ivory">
              그런 밤에 펼칠 곳이 있으면,
              <br />
              <span className="text-gold">손가락이 먼저 움직이지 않아요.</span>
            </p>
            <p className="mt-5 text-center text-[0.86rem] font-light leading-[2] text-ivory-dim">
              잊으라고, 놓으라고 하지 않을게요.
              <br />
              당신 마음이 100처럼 크다는 걸 알아요.
              <br />
              그 마음이 서두르다 다치지 않게, 곁에서 순서를 알려줄게요.
            </p>
          </section>

          {/* 2-1. 메시지 다음, 책에만 있는 것 */}
          <section className="px-6 py-16">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">메시지 다음, 책에만 있는 것</p>
            <h2 className="font-display mt-2 text-center text-[1.3rem] font-semibold leading-[1.6] text-ivory">
              메시지는 재회 전까지,
              <br />
              <span className="text-gold">책은 다시 만나기 시작할 때까지</span>
            </h2>
            <p className="mt-4 text-center text-[0.84rem] font-light leading-[1.95] text-ivory-dim">
              월하연 메시지는 지금 연락할지, 기다릴지 — 재회 전의 답이에요.
              <br />
              책에는 그다음, 상대에게서 연락이 오는 순간과
              <br />
              다시 만나기 시작할 때 해야 할 행동까지 담았어요.
            </p>
            <div className="mt-8 overflow-hidden rounded-xl border border-gold-dim/25 text-[0.8rem]">
              <div className="grid grid-cols-[1fr_4rem_4rem] bg-ink-soft px-4 py-2.5 text-ivory-dim">
                <span>다루는 단계</span>
                <span className="text-center">메시지</span>
                <span className="text-center text-gold">책</span>
              </div>
              {STAGES.map((st) => (
                <div
                  key={st.step}
                  className="grid grid-cols-[1fr_4rem_4rem] items-center border-t border-gold-dim/10 px-4 py-3"
                >
                  <span>
                    <span className="block text-[0.7rem] text-gold/75">{st.step}</span>
                    <span className="text-ivory">{st.title}</span>
                  </span>
                  <span className="text-center text-ivory-dim">{st.message ? "○" : "—"}</span>
                  <span className="text-center text-gold">●</span>
                </div>
              ))}
            </div>

            <div className="mt-12 space-y-10">
              {GROUPS.map((g) => (
                <div key={g.no}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-[1.5rem] text-thread">{g.no}</span>
                    <span>
                      <span className="block text-[0.7rem] tracking-[0.2em] text-gold/80">{g.stage}</span>
                      <span className="font-display block text-[1.08rem] text-ivory">{g.title}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-[0.82rem] font-light leading-[1.85] text-ivory-dim">{g.lead}</p>
                  <ul className="mt-3 space-y-1.5 rounded-xl border border-gold-dim/15 bg-ink-soft/50 px-4 py-4">
                    {g.items.map((it) => (
                      <li key={it} className="flex gap-2.5 text-[0.82rem] leading-[1.7] text-ivory">
                        <span className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* 3. 당신의 이름으로 */}
          <section className="bg-gradient-to-b from-ink-soft/40 to-ink px-6 py-16">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">누구나 읽는 책이 아니에요</p>
            <h2 className="font-display mt-2 text-center text-[1.35rem] font-semibold leading-[1.6] text-ivory">
              당신의 이야기를 읽고,
              <br />
              당신 한 사람에게 다시 써요
            </h2>
            <div className="mx-auto mt-9 w-[86%] overflow-hidden rounded-md shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/book/sample-now.webp" alt="책 첫 장 ‘지금의 판정’ 샘플" className="block w-full" loading="lazy" />
            </div>
            <p className="mt-3 text-center text-[0.72rem] text-ivory-dim/70">가상의 신청자 ‘서연’ 님으로 만든 실제 페이지</p>
            <ul className="mt-10 space-y-6">
              {MINE.map((m) => (
                <li key={m.n} className="flex gap-4">
                  <span className="font-display w-7 shrink-0 pt-0.5 text-gold">{m.n}</span>
                  <span>
                    <span className="block text-[0.96rem] text-ivory">{m.title}</span>
                    <span className="mt-1 block text-[0.82rem] font-light leading-[1.85] text-ivory-dim">{m.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. 페이지 넘겨보기 */}
          <section className="px-6 py-16">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">한 장씩 넘겨 보세요</p>
            <div className="-mx-6 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3">
              {SAMPLES.map((s) => (
                <figure key={s.src} className="w-[80%] shrink-0 snap-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.src}
                    alt={s.alt}
                    loading="lazy"
                    className="block w-full rounded-md shadow-[0_14px_44px_rgba(0,0,0,0.55)]"
                  />
                  <figcaption className="mt-3 text-center text-[0.78rem] leading-[1.7] text-ivory-dim">
                    {s.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-2 text-center text-[0.7rem] text-ivory-dim/60">옆으로 넘겨 보세요 →</p>
          </section>

          {/* 5. 곁에 두는 21일 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/book/wolhwa-read2.webp"
            alt="책을 펼쳐 읽는 월화"
            loading="lazy"
            className="block aspect-[4/3.4] w-full object-cover object-[50%_30%]"
          />
          <section className="px-6 py-16">
            <h2 className="font-display text-center text-[1.3rem] font-semibold leading-[1.6] text-ivory">
              한 번 읽고 덮는 답이 아니라,
              <br />
              <span className="text-gold">21일 동안 곁에 둘 책이에요</span>
            </h2>
            <ol className="relative mt-10 space-y-8 border-l border-gold-dim/30 pl-6">
              {DAYS.map((d) => (
                <li key={d.when} className="relative">
                  <span className="absolute -left-[1.94rem] top-1 h-3 w-3 rounded-full border border-gold bg-ink" />
                  <p className="text-[0.72rem] tracking-[0.2em] text-gold/80">{d.when}</p>
                  <p className="font-display mt-1 text-[1rem] text-ivory">{d.title}</p>
                  <p className="mt-1 text-[0.82rem] font-light leading-[1.85] text-ivory-dim">{d.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* 6. 월화의 말 */}
          <section className="px-6 py-14">
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

          {/* 7. 차례 */}
          <section className="px-6 pb-4">
            <details className="group rounded-xl border border-gold-dim/20 px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[0.9rem] text-ivory">
                10개의 PART와 BONUS 차례 보기
                <span className="text-gold transition-transform group-open:rotate-45">+</span>
              </summary>
              <ol className="mt-4 space-y-2">
                {PARTS.map((p, i) => (
                  <li key={p} className="flex gap-3 text-[0.82rem] font-light text-ivory-dim">
                    <span className="font-display w-6 shrink-0 text-gold/80">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
                <li className="flex gap-3 text-[0.82rem] font-light text-ivory-dim">
                  <span className="font-display w-6 shrink-0 text-gold/80">+</span>
                  BONUS · 연락 전 체크리스트, 카톡 임시보관 페이지 등 7가지 도구
                </li>
              </ol>
            </details>
          </section>

          {/* 8. 가격 */}
          <div className="relative mt-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/book/wolhwa-give.webp"
              alt="월화가 책을 건네는 모습"
              loading="lazy"
              className="block aspect-[4/3.6] w-full object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
            <p className="font-display absolute inset-x-0 bottom-4 text-center text-[1.02rem] text-ivory">
              이제, 당신 차례예요.
            </p>
          </div>
          <section className="px-6 pb-16 pt-10">
            <p className="text-center text-[0.72rem] tracking-[0.3em] text-gold/80">받아보는 방법</p>
            <p className="font-display mt-3 text-center text-[1rem] leading-[1.95] text-ivory">
              메시지로 지금을 읽고,
              <br />
              책으로 기다림을 건너가요.
            </p>
            <p className="mt-2 text-center text-[0.8rem] font-light text-ivory-dim">제가 둘을 함께 권하는 이유예요. — 월화</p>
            <div className="mt-8 space-y-3">
              <Link
                href={hrefFor("bundle")}
                className="relative block rounded-2xl border border-gold/55 bg-gradient-to-b from-[#1d1512] to-ink-soft px-6 py-6 shadow-[0_0_40px_rgba(226,196,138,0.08)]"
              >
                <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 text-[0.68rem] font-medium text-ink">
                  가장 많이 골라요
                </span>
                <p className="text-[1rem] text-ivory">메시지 + 책 패키지</p>
                <p className="mt-1 text-[0.78rem] font-light leading-[1.7] text-ivory-dim">
                  오늘의 관계를 읽는 메시지와, 기다리는 동안 곁에 둘 책을 함께
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="font-display text-[1.7rem] font-semibold text-gold">
                    {BUNDLE_PRICE_KRW.toLocaleString()}
                    <span className="ml-1 text-base text-ivory-dim">원</span>
                  </p>
                  {separate > BUNDLE_PRICE_KRW && (
                    <p className="text-[0.78rem] text-ivory-dim/70 line-through">{separate.toLocaleString()}원</p>
                  )}
                </div>
              </Link>
              <Link
                href={hrefFor("book")}
                className="block rounded-2xl border border-gold-dim/30 bg-ink-soft/60 px-6 py-5"
              >
                <p className="text-[0.96rem] text-ivory">개인화 PDF 책만</p>
                <p className="font-display mt-2 text-[1.4rem] font-semibold text-gold">
                  {BOOK_PRICE_KRW.toLocaleString()}
                  <span className="ml-1 text-sm text-ivory-dim">원</span>
                </p>
              </Link>
            </div>
            <p className="mt-5 text-center text-xs leading-[1.9] text-ivory-dim">
              1회 결제 · 정기결제 없음 · 결제 후 1~3분이면 완성
              <br />
              PDF 다운로드 링크는 결제일로부터 60일 동안 열려요.
            </p>
            {!orderNumber && (
              <p className="mt-5 text-center text-[0.8rem] font-light leading-[1.9] text-ivory-dim">
                당신의 이야기로 쓰는 책이라, 먼저 제게 이야기를 들려주세요.
                <br />
                무료 미리보기 다음 화면에서 책과 패키지를 고를 수 있어요.
              </p>
            )}
            <Link
              href={hrefFor("bundle")}
              className="cta-glow mt-7 inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory transition-opacity active:opacity-85"
            >
              {ctaMain}
            </Link>
          </section>

          <section className="px-6 pb-16 text-[0.72rem] font-light leading-[1.9] text-ivory-dim/70">
            <p>· 관계와 감정을 돌아보기 위한 개인화 디지털 콘텐츠이며, 상대의 감정·연락·재회를 보장하지 않아요.</p>
            <p>· 차단이나 안전 문제가 있는 사연에는 연락 문장을 쓰지 않고, 거리를 지키는 방법을 담아요.</p>
            <p>
              · PDF를 한 번이라도 받으신 뒤에는 맞춤 제작 디지털 콘텐츠의 특성상 단순 변심 환불이 제한돼요.{" "}
              <Link href="/refund" className="underline underline-offset-4">
                환불정책
              </Link>
            </p>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
