/** 10/16 3차 — 상세페이지형 홈 공용 조각 (말풍선 · 버튼 · 휴대폰 화면 틀) */
import Image from "next/image";
import TrackedCtaLink from "@/components/TrackedCtaLink";

export const V3 = {
  explain: "/wolhwa/v2/explain.webp",
  smile: "/wolhwa/v2/smile.webp",
  hands: "/wolhwa/v2/hands.webp",
};

export function Cta({ placement, label = "내 사연으로 무료 미리보기", sub = true }: { placement: string; label?: string; sub?: boolean }) {
  return (
    <div className="px-5">
      <TrackedCtaLink
        event="home_cta_click"
        placement={placement}
        href="/apply"
        className="cta-glow fx-sheen flex h-[3.6rem] w-full items-center justify-center rounded-full bg-gradient-to-b from-[#a83a57] to-burgundy-deep text-[1.05rem] font-bold text-[#fbf7f2] shadow-[0_8px_28px_rgba(168,58,87,0.45)]"
      >
        {label}
      </TrackedCtaLink>
      {sub && <p className="mt-2 text-center text-[0.76rem] text-ivory-dim">사연 입력 후 바로 · 미리보기 무료 · 3분이면 충분해요</p>}
    </div>
  );
}

/** 월화의 말풍선 (그림 위에 얹는 것) */
export function Bubble({ children, side = "left", className = "" }: { children: React.ReactNode; side?: "left" | "right"; className?: string }) {
  return (
    <p
      className={`font-display absolute z-10 max-w-[78%] rounded-[22px] bg-[#fbf7f1] px-4 py-3 text-[1.02rem] leading-[1.55] text-[#2a2326] shadow-[0_10px_30px_rgba(0,0,0,0.4)] ${
        side === "left" ? "left-4 rounded-tl-md" : "right-4 rounded-tr-md"
      } ${className}`}
    >
      {children}
    </p>
  );
}

/** 웹툰 한 컷 — 세로 그림 + 말풍선 */
export function Panel({ src, alt, say, side = "left", pos = "top-5", ratio = "aspect-[3/4]" }: { src: string; alt: string; say: React.ReactNode; side?: "left" | "right"; pos?: string; ratio?: string }) {
  return (
    <div className={`relative ${ratio} w-full overflow-hidden`}>
      <Image src={src} alt={alt} fill sizes="480px" className="object-cover" />
      <Bubble side={side} className={pos}>
        {say}
      </Bubble>
    </div>
  );
}

/** 휴대폰 화면 틀 — 안에 결과 화면 예시 */
export function Phone({ children, tilt = "" }: { children: React.ReactNode; tilt?: string }) {
  return (
    <div className={`mx-auto w-[15.5rem] rounded-[2.3rem] border-[7px] border-[#1a1517] bg-[#1a1517] shadow-[0_24px_50px_rgba(0,0,0,0.35)] ${tilt}`}>
      <div className="relative h-[29rem] overflow-hidden rounded-[1.8rem] bg-[#f7f3ef] text-[#312b2d]">
        <div className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-[#1a1517]" />
        <div className="h-full overflow-hidden px-4 pb-4 pt-8 text-[0.74rem] leading-[1.7]">{children}</div>
      </div>
    </div>
  );
}

/** 큰 제목 (한 화면 한 문장) */
export function Big({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`font-display whitespace-pre-line text-center text-[1.8rem] font-black leading-[1.36] text-ivory ${className}`}>{children}</h2>;
}

/** 강조 글자 (분홍빛 버건디) */
export function Hl({ children }: { children: React.ReactNode }) {
  return <span className="fx-rose">{children}</span>;
}
