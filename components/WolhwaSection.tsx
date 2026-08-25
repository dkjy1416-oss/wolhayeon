import Image from "next/image";

export default function WolhwaSection() {
  return (
    <section className="glow-gold px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-md text-center">
        {/* 월화 초상 — 정방형 원본을 그대로 사용, 가장자리만 어둠에 녹아들게.
            얼굴·머리 장식·의상이 모두 보이도록 크롭하지 않음 */}
        <div className="img-blend relative mx-auto aspect-square w-full max-w-[290px] sm:max-w-[330px]">
          <Image
            src="/images/wolhwa-portrait.webp"
            alt="월화의 초상 — 붉은 매화 곁의 얼굴"
            fill
            quality={90}
            sizes="(max-width: 640px) 290px, 330px"
            className="object-cover"
          />
        </div>

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
