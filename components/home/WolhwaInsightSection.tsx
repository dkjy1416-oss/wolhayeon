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
          sceneTitle={"사람은 떠났는데\n마음은 남아 있을 때"}
        />
      </Reveal>

      <div className="px-6">
        <Reveal>
          <p className="font-display mt-12 text-center text-[1.3rem] font-semibold leading-[1.8] text-ivory">
            지금 이 사람이
            <br />
            100처럼 느껴진다면,
          </p>
          <p className="mt-6 text-center text-[0.88rem] font-light leading-[2.05] text-ivory-dim">
            그건 이상한 일이 아니에요.
            <br />
            헤어진 뒤에는 한 사람이
            <br />
            마음 전체를 차지하는 것처럼
            <br />
            느껴질 수 있으니까요.
          </p>
        </Reveal>
        <p className="mt-8 text-center text-[0.66rem] tracking-[0.3em] text-thread/80">
          월화가 오래 들여다본 것
        </p>
        <div className="mt-8 flex flex-col gap-8">
          <Reveal>
            <p className="text-center text-[0.98rem] font-light leading-[2.05] text-ivory">
              월하연의 안내자 월화도
              <br />
              처음에는 이해하지 못했어요.
              <br />
              사람은 떠났는데
              <br />왜 마음은 그대로 남아 있는지.
              <br />왜 끝난 관계가 오히려
              <br />
              하루를 더 많이 차지하는지.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-center text-[0.98rem] font-light leading-[2.05] text-ivory">
              그래서 오래 들여다봤어요.
              <br />
              그리고 하나를 발견했어요.
              <br />
              사람이 떠난다고
              <br />그 사람에게 향하던 마음까지
              <br />
              함께 사라지는 건 아니라는 것.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="font-display text-center text-[1.02rem] font-medium leading-[2] text-gold">
              월화는 이것을
              <br />
              ‘사랑의 총량 100’이라고
              <br />
              부르기 시작했습니다.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <p className="text-center text-[0.88rem] font-light leading-[2.05] text-ivory-dim">
              당신의 100을 줄이자는 게 아니에요.
              <br />그 100 안에 사랑과 그리움,
              <br />
              매일의 습관과 두려움이
              <br />
              어떻게 섞여 있는지 알아야
              <br />
              재회를 위해서도 제대로 움직일 수 있어요.
            </p>
            <p className="mt-4 text-center text-[0.88rem] font-light leading-[2.05] text-ivory">
              그러니 이건 포기하라는 말이 아니에요.
              <br />
              외로움 때문에 움직이는 것과
              <br />
              관계를 다시 만들기 위해 움직이는 것,
              <br />그 둘을 구분하자는 거예요.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
