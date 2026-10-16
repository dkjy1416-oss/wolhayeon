/** 10. 자주 묻는 질문 + 최종 CTA */
import Link from "next/link";
import TrackedCtaLink from "@/components/TrackedCtaLink";
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
      <section id="final-cta" className="night px-5 py-16 text-center md:py-20">
        <p className="font-display font-bold text-[1.45rem] leading-[1.5] text-ivory [text-wrap:balance] md:text-[1.9rem]">
          보내기 전에, 내 이야기를 먼저 펼쳐보세요.
        </p>
        <p className="mt-3 text-[0.94rem] text-ivory-dim">사연 입력 후 무료 미리보기를 바로 받아요.</p>
        <TrackedCtaLink
          event="home_cta_click"
          placement="final"
          href="/apply"
          className="mt-6 inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-8 text-[1rem] font-semibold"
        >
          내 사연으로 무료 미리보기
        </TrackedCtaLink>
      </section>
    </>
  );
}
