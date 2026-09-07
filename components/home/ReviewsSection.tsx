import Link from "next/link";
import Reveal from "@/components/home/Reveal";
import HomeImage from "@/components/home/HomeImage";
import { HOME_REVIEWS, badgeFor } from "@/components/home/reviews-data";

/**
 * 실제 후기가 있으면 → "다시 이어진 이야기" carousel (편지형 카드, 별점 없음)
 * 아직 없으면 → 같은 자리에 "재회 고민에서 많이 마주치는 순간" editorial
 *   (일반적 상황 설명 — 후기처럼 보이지 않게, 따옴표·닉네임 없음의 서술형)
 * reviews-data.ts에 객체 하나만 추가하면 JSX 수정 없이 carousel로 전환된다.
 */
const COMMON_SITUATIONS = [
  "연락하고 싶은데\n내가 먼저 하면 더 멀어질까 무서울 때",
  "다시 만나고 싶은데\n또 같은 이유로 헤어질까 겁날 때",
  "상대가 그리운 건지\n끝내지 못한 마음이 남은 건지 헷갈릴 때",
  "주변에서는 잊으라고 하는데\n나는 아직 끝나지 않았을 때",
];

function SectionCta() {
  return (
    <Reveal>
      <div className="mt-12 text-center">
        <p className="font-display text-[1.05rem] font-medium text-ivory">
          내 경우는 어떻게 보일까?
        </p>
        <p className="mt-3 text-[0.82rem] font-light leading-[1.95] text-ivory-dim">
          결제 전에
          <br />
          월화가 내 이야기를 먼저 읽은
          <br />
          개인화 미리보기를 보여드려요.
        </p>
        <Link
          href="/apply"
          className="cta-glow mt-6 inline-flex h-13 items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep px-10 text-[0.9rem] font-medium text-ivory active:opacity-85"
        >
          내 이야기 먼저 들려주기
        </Link>
      </div>
    </Reveal>
  );
}

export default function ReviewsSection({
  emotionPhone,
}: {
  emotionPhone: string | null;
}) {
  const hasReviews = HOME_REVIEWS.length > 0;

  /* ---------- 실제 후기 carousel ---------- */
  if (hasReviews) {
    return (
      <section className="bg-ink-soft/40 py-20">
        <div className="px-6">
          <Reveal>
            <h2 className="font-display text-center text-[1.4rem] font-semibold leading-snug text-ivory">
              다시 이어진 이야기
            </h2>
            <p className="mt-4 text-center text-[0.85rem] font-light leading-[1.9] text-ivory-dim">
              비슷한 밤을 지나온 사람들이
              <br />
              월하연을 이용한 뒤 남긴 이야기입니다.
            </p>
          </Reveal>
        </div>
        <div className="scrollbar-none mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4">
          {HOME_REVIEWS.map((r) => {
            const badge = badgeFor(r);
            return (
              <div
                key={r.id}
                className="w-[88%] shrink-0 snap-center border border-gold-dim/30 bg-gradient-to-b from-[#141013] to-ink px-6 py-7"
              >
                {badge && (
                  <span className="mb-3 inline-block rounded-full border border-thread/40 px-3 py-1 text-[0.62rem] tracking-wide text-thread">
                    {badge}
                  </span>
                )}
                <p className="font-display text-2xl leading-none text-gold/60">
                  “
                </p>
                <p className="mt-2 text-[0.92rem] font-light leading-[2.05] text-ivory">
                  {r.text}
                </p>
                <div className="mt-6 border-t border-gold-dim/20 pt-4">
                  {r.nickname && (
                    <p className="text-[0.8rem] text-gold/80">{r.nickname}</p>
                  )}
                  <p className="mt-1 text-[0.7rem] font-light text-ivory-dim/70">
                    {[r.context, r.breakupElapsed].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6">
          <SectionCta />
        </div>
      </section>
    );
  }

  /* ---------- 실데이터 전: 재회 고민 공감 editorial (후기 아님) ---------- */
  return (
    <section className="bg-ink-soft/40 py-20">
      <div className="px-6">
        <Reveal>
          <h2 className="font-display text-center text-[1.4rem] font-semibold leading-snug text-ivory">
            재회 고민에서
            <br />
            많이 마주치는 순간
          </h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-4">
          {COMMON_SITUATIONS.slice(0, 2).map((line, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="border-l-2 border-thread/40 bg-ink/60 px-5 py-5">
                <p className="whitespace-pre-line text-[0.93rem] font-light leading-[1.95] text-ivory">
                  {line}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* cinematic image break */}
      <Reveal className="mt-8">
        <HomeImage
          src={emotionPhone}
          alt="붉은 밤, 휴대폰을 바라보는 여인"
          aspect="aspect-[4/5]"
          sizes="(max-width: 520px) 100vw, 520px"
        />
      </Reveal>

      <div className="px-6">
        <div className="mt-8 flex flex-col gap-4">
          {COMMON_SITUATIONS.slice(2).map((line, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="border-l-2 border-thread/40 bg-ink/60 px-5 py-5">
                <p className="whitespace-pre-line text-[0.93rem] font-light leading-[1.95] text-ivory">
                  {line}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <SectionCta />
      </div>
    </section>
  );
}
