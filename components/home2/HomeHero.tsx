/**
 * 01. 첫 화면 — 월화가 직접 맞이하는 영상 + 한 문장 + 무료 미리보기 버튼.
 * 문구와 버튼은 영상과 관계없이 바로 보인다(영상은 포스터 위에서 조용히 반복).
 */
import TrackedCtaLink from "@/components/TrackedCtaLink";
import LoopVideo from "@/components/book/LoopVideo";
import { PRICE } from "./content";
import { V2 } from "./media";

export default function HomeHero() {
  return (
    <section className="night relative overflow-hidden">
      {/* 모바일: 영상이 화면 전체 · PC: 오른쪽 세로 영상 */}
      <div className="absolute inset-0 md:hidden" aria-hidden>
        <LoopVideo src={V2.greetVideo} poster={V2.greet} className="h-full w-full object-cover object-[50%_20%]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#201d20] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#201d20] via-[#201d20]/85 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[100svh] max-w-[1120px] items-end gap-10 px-5 pb-12 pt-24 md:min-h-0 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-14 md:px-8 md:pb-20 md:pt-32">
        <div className="relative z-10 min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-[#201d20]/40 px-3 py-1 text-[0.74rem] tracking-[0.12em] text-gold backdrop-blur-sm">
            <span aria-hidden>☾</span> 사연으로 읽는 재회 상담 · 월화의 편지
          </p>
          <h1 className="font-display font-bold mt-5 text-[1.75rem] leading-[1.42] text-ivory [text-wrap:balance] md:text-[2.6rem]">
            보내고 싶은 말이 많을수록,
            <br />
            먼저 내 이야기를 펼쳐보세요.
          </h1>
          <p className="mt-4 max-w-[34rem] text-[0.96rem] leading-[1.75] text-ivory-dim md:text-[1rem]">
            왜 헤어졌는지, 마지막에 어떤 말을 나눴는지, 지금 연락은 가능한지. 월화가 두 사람의 사연을 읽고
            <span className="text-ivory"> 편지와 나만의 리추얼, 단계별 실천 가이드</span>로 답해 드려요.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <TrackedCtaLink
              event="home_cta_click"
              placement="hero"
              href="/apply"
              className="inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-7 text-[1rem] font-semibold shadow-[0_6px_24px_rgba(105,38,59,0.45)]"
            >
              내 사연으로 무료 미리보기
            </TrackedCtaLink>
            <a
              href="#compose"
              className="inline-flex h-14 items-center justify-center rounded-full border border-ivory/25 bg-[#201d20]/30 px-6 text-[0.95rem] text-ivory backdrop-blur-sm"
            >
              무엇을 받는지 보기
            </a>
          </div>
          <p className="mt-4 text-[0.82rem] leading-[1.7] text-ivory-dim">
            미리보기 무료 · 전체 구성은 1회 구매
            <span className="block">
              미리보기 후 24시간 안에 첫 구매하면 <b className="font-semibold text-gold">{PRICE.first.toLocaleString()}원</b>{" "}
              <span className="opacity-80">(이후 {PRICE.regular.toLocaleString()}원)</span>
            </span>
          </p>
        </div>

        <div className="relative hidden min-w-0 md:block">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-[440px] overflow-hidden rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <LoopVideo src={V2.greetVideo} poster={V2.greet} className="h-full w-full object-cover" />
          </div>
          <p className="font-display absolute -left-6 bottom-10 max-w-[15rem] rounded-2xl rounded-bl-sm bg-[#fbf7f1] px-5 py-4 text-[1rem] leading-[1.6] text-[#312b2d] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            어떤 이야기든 괜찮아요.
            <br />
            처음부터 천천히 들려주세요.
          </p>
        </div>
      </div>
    </section>
  );
}
