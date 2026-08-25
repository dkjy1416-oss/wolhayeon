export default function WolhwaSection() {
  return (
    <section className="glow-gold px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md text-center">
        {/* 월화 초상 — 원형에 가까운 블렌드로 인물에 집중.
            이미지가 없으면 은은한 촛불빛 원만 남아 자리를 지킨다 */}
        <div
          className="img-blend mx-auto aspect-square w-full max-w-[240px] bg-[radial-gradient(circle_at_50%_45%,rgba(201,169,106,0.08),transparent_70%)] bg-cover bg-[position:center_18%] sm:max-w-[280px]"
          style={{ backgroundImage: "url('/images/wolhwa-portrait.webp')" }}
          role="img"
          aria-label="월화의 초상"
        />

        <p className="mt-10 text-[0.68rem] tracking-[0.35em] text-gold/90">
          인연의 흐름을 읽는 사람
        </p>
        <h2 className="font-display mt-4 text-[1.6rem] font-semibold leading-snug text-ivory sm:text-3xl">
          월화 <span className="text-gold">月華</span>
        </h2>
        <p className="mt-8 text-[0.92rem] font-light leading-[2] text-ivory-dim">
          월화는 당신이 전해준 이야기를 바탕으로
          <br />
          두 사람의 관계와 마음을 위한
          <br />
          개인 리추얼을 안내합니다.
        </p>
      </div>
    </section>
  );
}
