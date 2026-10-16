/** 10. 자주 묻는 질문 + 최종 CTA */
import Link from "next/link";
import TrackedCtaLink from "@/components/TrackedCtaLink";
import LoopVideo from "@/components/book/LoopVideo";
import { V2 } from "./media";
import { FAQ } from "./content";

export default function FaqFinal() {
  return (
    <>
      <section className="px-5 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[0.8rem] tracking-[0.14em] text-gold">자주 묻는 질문</p>
          <div className="mt-4 divide-y divide-gold-dim overflow-hidden rounded-2xl border border-gold-dim bg-ink-soft">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.98rem] font-medium text-ivory">
                  <span>{q}</span>
                  <span aria-hidden className="text-ivory-dim transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[0.94rem] leading-[1.75] text-ivory-dim">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-3 text-[0.84rem] text-ivory-dim">
            자세한 내용 ·{" "}
            <Link href="/guide" className="underline underline-offset-4">이용안내</Link> ·{" "}
            <Link href="/refund" className="underline underline-offset-4">환불정책</Link> ·{" "}
            <Link href="/privacy" className="underline underline-offset-4">개인정보처리방침</Link>
          </p>
        </div>
      </section>
      <section id="final-cta" className="night relative overflow-hidden text-center">
        <div className="absolute inset-0" aria-hidden>
          <LoopVideo src={V2.moonVideo} poster={V2.moon} className="h-full w-full object-cover object-[70%_50%]" />
          <div className="absolute inset-0 bg-[#201d20]/55 md:bg-gradient-to-r md:from-[#201d20]/90 md:via-[#201d20]/50 md:to-transparent" />
        </div>
        <div className="relative mx-auto flex min-h-[78svh] max-w-[1120px] flex-col items-center justify-end px-5 pb-16 md:min-h-[560px] md:items-start md:justify-center md:px-8 md:text-left">
          <p className="font-display font-bold text-[1.5rem] leading-[1.5] text-ivory [text-wrap:balance] md:max-w-[26rem] md:text-[2rem]">
            보내기 전에, 내 이야기를 먼저 펼쳐보세요.
          </p>
          <p className="mt-3 text-[0.96rem] text-ivory-dim">월화가 오늘 밤 당신의 사연을 먼저 읽어 드려요.</p>
          <TrackedCtaLink
            event="home_cta_click"
            placement="final"
            href="/apply"
            className="mt-6 inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-8 text-[1rem] font-semibold shadow-[0_6px_24px_rgba(105,38,59,0.45)]"
          >
            내 사연으로 무료 미리보기
          </TrackedCtaLink>
        </div>
      </section>
    </>
  );
}
