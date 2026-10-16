/**
 * 01. 첫 화면 — 서비스 정체성(사연 기반 재회 상담 · 개인 리추얼)과 결과물.
 * 문구와 버튼은 영상·웹폰트와 관계없이 바로 보인다. 개인 카운트다운은 미리보기 전에는 시작하지 않는다.
 */
import Image from "next/image";
import TrackedCtaLink from "@/components/TrackedCtaLink";
import { PRICE } from "./content";

export default function HomeHero() {
  return (
    <section className="night relative overflow-hidden">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-5 pb-14 pt-20 md:grid-cols-[1.05fr_0.95fr] md:gap-14 md:px-8 md:pb-20 md:pt-32">
        <div className="relative z-10 min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-[0.74rem] tracking-[0.12em] text-gold">
            <span aria-hidden>☾</span> 사연 기반 재회 상담 · 개인 리추얼
          </p>
          <h1 className="font-display font-bold mt-5 text-[1.6rem] leading-[1.45] text-ivory [text-wrap:balance] md:text-[2.6rem]">
            보내고 싶은 말이 많을수록,
            <br />
            먼저 내 이야기를 펼쳐보세요.
          </h1>
          <p className="mt-4 max-w-[34rem] text-[0.95rem] leading-[1.75] text-ivory-dim md:text-[1rem]">
            왜 헤어졌는지, 마지막에 어떤 말을 나눴는지, 지금 연락은 가능한지. 두 사람의 구체적인 사연과 현재 상황에 맞춘 재회 상담을
            <span className="text-ivory"> 월화의 편지와 나만의 리추얼, 단계별 실천 가이드</span>로 전합니다.
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
              className="inline-flex h-14 items-center justify-center rounded-full border border-ivory/25 px-6 text-[0.95rem] text-ivory"
            >
              실제 구성 먼저 보기
            </a>
          </div>
          <p className="mt-4 text-[0.82rem] leading-[1.7] text-ivory-dim">
            AI가 작성하는 개인화 콘텐츠 · 미리보기 무료 · 전체 구성은 1회 유료 구매
            <span className="block">
              미리보기 후 24시간 안에 첫 구매하면 <b className="font-semibold text-gold">{PRICE.first.toLocaleString()}원</b>{" "}
              <span className="opacity-80">(이후 {PRICE.regular.toLocaleString()}원)</span>
            </span>
          </p>
        </div>

        {/* 결과물 — 가상 사연으로 만든 편지 첫 장 */}
        <div className="relative min-w-0">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-[28px]">
            <Image src="/wolhwa/wolhwa-gaze.webp" alt="편지를 앞에 둔 월화" fill priority sizes="(min-width: 768px) 420px, 90vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#201d20] via-[#201d20]/30 to-transparent" />
          </div>
          <article className="relative z-10 mx-auto -mt-36 w-[88%] max-w-[380px] rotate-[-1.2deg] rounded-[18px] bg-[#fbf7f1] px-6 py-6 text-[#312b2d] shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            <p className="flex items-center justify-between text-[0.7rem] tracking-[0.14em] text-[#8a6a33]">
              <span>월화의 편지 · 첫 장</span>
              <span className="rounded-full border border-[#d9c9a8] px-2 py-0.5 tracking-normal text-[#6a5f61]">가상 사연 예시</span>
            </p>
            <p className="font-display mt-3 text-[1.1rem]">지수님에게</p>
            <p className="mt-2 text-[0.9rem] leading-[1.8]">
              3주 동안 하루에도 몇 번씩 대화창을 열었다 닫았을 거예요. 길게 쓴 사과에 돌아온 네 글자가, 그동안의 시간 전부를 대답하는 것처럼 느껴졌겠죠.
            </p>
            <p className="mt-3 border-t border-[#e7dccb] pt-3 text-[0.78rem] leading-[1.7] text-[#6a5f61]">
              이어서 · 관계 읽기 → 나만의 리추얼 → 첫날·7일·21일 가이드
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
