import Reveal from "@/components/home/Reveal";

/** SECTION 04 — reading loop: "월화가 실제로 내 이야기를 읽는 것 같은 감각" */
export default function WolhwaReadingSection({
  video,
  poster,
}: {
  video: string | null;
  poster: string | null;
}) {
  return (
    <section className="px-6 py-20">
      <Reveal>
        <h2 className="font-display text-center text-[1.4rem] font-semibold leading-[1.7] text-ivory">
          당신의 이야기를
          <br />
          월화가 조용히 읽습니다.
        </h2>
      </Reveal>

      {video && (
        <Reveal className="mx-auto mt-10 max-w-[320px]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-sm">
            <video
              className="h-full w-full object-cover"
              src={video}
              poster={poster ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-ink/10" />
          </div>
        </Reveal>
      )}

      <Reveal>
        <p className="mt-10 text-center text-[0.92rem] font-light leading-[2.1] text-ivory-dim">
          관계가 시작된 순간부터
          <br />
          마지막 대화,
          <br />
          지금 가장 힘든 마음,
          <br />
          그리고 다시 만나고 싶은 이유까지.
        </p>
        <p className="mt-5 text-center text-[0.92rem] font-light leading-[2.05] text-ivory">
          같은 이별처럼 보여도
          <br />
          사람마다 남아 있는 마음은 다릅니다.
        </p>
        <p className="font-display mt-8 text-center text-[0.95rem] font-medium text-gold">
          그래서 누구에게나
          <br />
          같은 결과를 보여주지 않습니다.
        </p>
      </Reveal>
    </section>
  );
}
