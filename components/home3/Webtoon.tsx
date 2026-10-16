"use client";

/**
 * 10/16 4차 — 웹툰처럼 이어지는 월화 장면.
 * - 컷 사이: 검은 블러로 이어 붙이고 그 위에 내레이션 한 줄
 * - 그림: 화면에 들어오면 천천히 다가가는 줌
 * - 말풍선: ChatGPT로 만든 말풍선 그림 위에 글자, 화면에 들어오면 톡 튀어나옴
 * - 매화 꽃잎이 천천히 떨어지는 효과 (움직임 줄이기 설정이면 멈춤)
 */
import Image from "next/image";
import { useEffect, useRef } from "react";

export const BUBBLE = {
  speech: "/wolhwa/v2/bubble-speech.webp",
  thought: "/wolhwa/v2/bubble-thought.webp",
  caption: "/wolhwa/v2/bubble-caption.webp",
};

/** 화면에 들어오면 .wt-in 을 붙인다 (한 번만) */
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("wt-in");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("wt-in");
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

/** 그림 말풍선 — 그림은 좌우로 뒤집을 수 있고 글자는 그대로 */
export function ArtBubble({
  children,
  kind = "speech",
  flip = false,
  className = "",
  delay = 0,
  inline = false,
}: {
  children: React.ReactNode;
  kind?: keyof typeof BUBBLE;
  flip?: boolean;
  className?: string;
  delay?: number;
  /** 흐름 안에 놓기 (absolute 대신 relative) */
  inline?: boolean;
}) {
  return (
    <div className={`wt-pop ${inline ? "relative" : "absolute"} z-10 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="wt-float relative" style={{ animationDelay: `${delay + 700}ms` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BUBBLE[kind]} alt="" aria-hidden className={`block h-auto w-full select-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)] ${flip ? "-scale-x-100" : ""}`} />
        <p
          className={`absolute inset-0 flex items-center justify-center text-center font-semibold leading-[1.55] tracking-[-0.01em] text-[#2b2225] ${
            kind === "caption"
              ? "px-[9%] pb-[3%] text-[clamp(0.9rem,3.6vw,1.02rem)]"
              : kind === "thought"
                ? "px-[16%] pb-[22%] text-[clamp(0.92rem,3.8vw,1.05rem)]"
                : "px-[13%] pt-[15%] text-[clamp(0.95rem,4vw,1.08rem)]"
          }`}
        >
          <span>{children}</span>
        </p>
      </div>
    </div>
  );
}

/** 한 컷 — 천천히 다가가는 그림. say: 얼굴 아래(그림 아랫부분)에 걸쳐 놓는 말풍선 — 꼬리가 위의 월화를 가리킴 */
export function Cut({
  src,
  alt,
  ratio = "aspect-[3/4]",
  pos = "object-center",
  say,
  right = false,
  children,
}: {
  src: string;
  alt: string;
  ratio?: string;
  pos?: string;
  say?: React.ReactNode;
  /** 말풍선을 오른쪽으로 (꼬리도 오른쪽) */
  right?: boolean;
  children?: React.ReactNode;
}) {
  const ref = useInView<HTMLDivElement>(0.25);
  return (
    <div ref={ref} className="relative">
      <div className={`wt-cut relative ${ratio} w-full overflow-hidden`}>
        <div className="wt-zoom absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_9%,black_88%,transparent)]">
          <Image src={src} alt={alt} fill sizes="480px" className={`object-cover ${pos}`} />
        </div>
        {children}
      </div>
      {say && (
        <div className="relative z-10 -mt-[24%] pb-8">
          <ArtBubble inline flip={right} delay={200} className={`w-[74%] ${right ? "ml-[22%]" : "ml-[4%]"}`}>
            {say}
          </ArtBubble>
        </div>
      )}
    </div>
  );
}

/** 컷 사이 — 검은 블러로 이어 붙이고 가운데 내레이션 */
export function Gutter({ children, tall = false }: { children?: React.ReactNode; tall?: boolean }) {
  const ref = useInView<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className={`relative z-[5] ${tall ? "-my-24 h-64" : "-my-16 h-44"}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0a0b] to-transparent" />
      <div className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 bg-[#0d0a0b]/40 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_65%,transparent)]" />
      {children && (
        <p className="wt-rise font-display absolute inset-x-0 top-1/2 whitespace-pre-line px-8 text-center text-[1.12rem] leading-[1.7] text-[#efe4d6] [text-shadow:0_2px_12px_rgba(0,0,0,0.9)]">
          {children}
        </p>
      )}
    </div>
  );
}

/** 떨어지는 매화 꽃잎 (장식) */
export function Petals({ n = 9 }: { n?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="wt-petal absolute top-[-4%] block h-2.5 w-2 rounded-[60%_10%_60%_10%] bg-[#d9566f]/70"
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i * 1.7) % 9}s`,
            animationDuration: `${11 + (i % 4) * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

/** 그림 없이 어둠 속에 떠 있는 속마음 말풍선 */
export function Beat({ children, kind = "thought", className = "" }: { children: React.ReactNode; kind?: keyof typeof BUBBLE; className?: string }) {
  const ref = useInView<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className={`relative z-[6] py-6 ${className}`}>
      <ArtBubble inline kind={kind} className={`mx-auto ${kind === "caption" ? "w-[78%]" : "w-[64%]"}`}>
        {children}
      </ArtBubble>
    </div>
  );
}
