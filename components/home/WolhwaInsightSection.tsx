import Reveal from "@/components/home/Reveal";
import HomeImage from "@/components/home/HomeImage";

/** SECTION 03 — 월화가 가까이 등장 (wolhwa-gaze 핵심 브랜드 이미지 + 브랜드 카피) */
export default function WolhwaInsightSection({
  gaze,
}: {
  gaze: string | null;
}) {
  return (
    <section className="bg-ink-soft/40 pb-20 pt-16">
      <Reveal>
        <HomeImage
          src={gaze}
          alt="사용자를 바라보는 월화"
          aspect="aspect-[4/5]"
          sizes="(max-width: 520px) 100vw, 520px"
          bleed
          sceneEyebrow="月華 · 월하연의 안내자"
          sceneTitle={"재회보다 먼저\n확인해야 하는 마음"}
        />
      </Reveal>

      <div className="px-6">
        <Reveal>
          <p className="font-display mt-12 text-center text-[1.3rem] font-semibold leading-[1.8] text-ivory">
            월화는
            <br />
            당신이 말한 것만 보지 않습니다.
          </p>
          <p className="mt-6 text-center text-[0.88rem] font-light leading-[2.05] text-ivory-dim">
            헤어진 뒤 다시 이어질 가능성과
            <br />
            관계에 남아 있는 흐름을 함께 살펴보는,
            <br />
            월하연의 붉은 실 안내자입니다.
          </p>
        </Reveal>
        <p className="mt-8 text-center text-[0.66rem] tracking-[0.3em] text-thread/80">
          월하연이 관계를 바라보는 시선
        </p>
        <div className="mt-8 flex flex-col gap-8">
          <Reveal>
            <p className="text-center text-[0.98rem] font-light leading-[2.05] text-ivory">
              “아직 끝난 게 아니라,
              <br />
              정리되지 않은 마음이
              <br />
              먼저 보일 때가 있어요.”
            </p>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-center text-[0.98rem] font-light leading-[2.05] text-ivory">
              “붙잡고 싶은 마음보다
              <br />왜 이렇게 멀어졌는지가
              <br />더 아프게 남아 있을 수도 있고요.”
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="font-display text-center text-[1.02rem] font-medium leading-[2] text-gold">
              “월화는 재회를 약속하기보다
              <br />
              지금 당신 마음이
              <br />
              어디에 머물러 있는지부터 봅니다.”
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
