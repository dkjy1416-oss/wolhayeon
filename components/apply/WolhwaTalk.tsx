"use client";

/* 11/23 운영자 요청: 미리보기 풀이를 월화가 대화하듯 말풍선으로.
   사진·영상은 화면 양쪽을 가득 채우고 위아래 경계는 흐리게. */
import { useEffect, useRef, useState } from "react";
import LoopVideo from "@/components/book/LoopVideo";

const FADE =
  "[mask-image:linear-gradient(to_bottom,transparent,black_12%,black_78%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_12%,black_78%,transparent)]";

/** 화면 양쪽을 채우는 월화 장면 — 영상 또는 사진, 위아래는 흐리게 */
export function TalkMedia({
  video,
  image,
  alt,
  ratio = "aspect-[4/5]",
  pos = "object-top",
  children,
}: {
  video?: string;
  image: string;
  alt: string;
  ratio?: string;
  pos?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className={`relative ${ratio} w-full overflow-hidden ${FADE}`}>
        {video ? (
          <LoopVideo src={video} poster={image} label={alt} className={`h-full w-full object-cover ${pos}`} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={alt} loading="lazy" className={`h-full w-full object-cover ${pos}`} />
        )}
      </div>
      {children}
    </div>
  );
}

function Dots() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60" style={{ animationDelay: `${i * 140}ms` }} />
      ))}
    </span>
  );
}

/** 화면에 들어오면 잠깐 '입력 중…' 뒤에 나타나는 말풍선 */
function useReveal(delay: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<0 | 1 | 2>(0); // 0 대기 · 1 입력 중 · 2 보임
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setState(2);
      return;
    }
    let t1 = 0;
    let t2 = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        t1 = window.setTimeout(() => setState(1), delay);
        t2 = window.setTimeout(() => setState(2), delay + 650);
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    /* 화면이 숨겨진 탭 등에서 관찰이 안 되면 그냥 보이게 */
    const safety = window.setTimeout(() => setState((s) => (s === 0 ? 2 : s)), 6000);
    return () => {
      io.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(safety);
    };
  }, [delay]);
  return [ref, state] as const;
}

export type Line =
  | { who: "w"; text: React.ReactNode; tag?: string; strong?: boolean }
  | { who: "me"; text: React.ReactNode; tag?: string }
  | { who: "raw"; node: React.ReactNode };

function Bubble({ line, i, avatar, showAv }: { line: Line; i: number; avatar: string; showAv: boolean }) {
  const [ref, state] = useReveal(Math.min(i, 2) * 200);
  if (line.who === "raw") {
    return (
      <div ref={ref} className={`transition-all duration-500 ${state === 2 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
        {line.node}
      </div>
    );
  }
  const me = line.who === "me";
  return (
    <div ref={ref} className={`flex items-end gap-2 ${me ? "flex-row-reverse" : ""}`}>
      {!me && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" aria-hidden className={`h-8 w-8 shrink-0 rounded-full object-cover object-[50%_18%] ring-2 ring-[#d9c9a8] ${showAv ? "" : "invisible"}`} />
      )}
      <div className={`min-w-0 max-w-[84%] ${me ? "text-right" : ""}`}>
        {line.tag && <p className={`mb-1 text-[0.7rem] font-semibold tracking-wide ${me ? "inline-block rounded-full bg-white/90 px-2 py-0.5 text-[#69263b]" : "text-[#8a6a33]"}`}>{line.tag}</p>}
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-left leading-[1.7] shadow-[0_4px_16px_rgba(60,30,40,0.08)] [word-break:keep-all] transition-all duration-300 ${
            me
              ? "rounded-br-md bg-[#69263b] text-[0.94rem] text-[#fbf7f2]"
              : `rounded-bl-md border border-[#ecdfd0] bg-white text-[#2a2326] ${line.strong ? "text-[1.02rem] font-semibold" : "text-[0.95rem]"}`
          } ${state === 0 ? "opacity-0" : "opacity-100"}`}
        >
          {state === 2 ? line.text : <Dots />}
        </div>
      </div>
    </div>
  );
}

/** 월화와의 대화 — 위에서 아래로 차례로 나타남 */
export function TalkThread({ lines, avatar = "/wolhwa/v4/avatar.webp", className = "" }: { lines: Line[]; avatar?: string; className?: string }) {
  return (
    <div className={`mx-auto flex max-w-[640px] flex-col gap-2.5 px-4 ${className}`}>
      {lines.map((l, i) => (
        <Bubble key={i} line={l} i={i % 3} avatar={avatar} showAv={l.who === "w" && (i === 0 || lines[i - 1].who !== "w")} />
      ))}
    </div>
  );
}

/** 문장 앞부분만 보이고 뒤는 '…' + 잠금 (뒷부분 실제 문장은 화면에 넣지 않음) */
export function cutHalf(s: string, ratio = 0.45) {
  const t = s.trim();
  if (t.length < 16) return t;
  const n = Math.max(10, Math.floor(t.length * ratio));
  const sp = t.lastIndexOf(" ", n);
  return t.slice(0, sp > 8 ? sp : n);
}
