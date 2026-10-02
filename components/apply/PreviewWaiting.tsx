"use client";

/**
 * 무료 미리보기 생성 대기 화면 — 월화 원본 영상(무음)이 천천히 바뀌고,
 * 지금 월화가 무엇을 읽고 있는지 한 줄씩 보여 준다. (실제 생성 단계와 무관한 연출 문구)
 */
import { useEffect, useState } from "react";
import HeroMontage from "@/components/home/HeroMontage";

const CLIPS = [
  { src: "/book/v3/w-reading.mp4", poster: "/book/v3/w-reading.webp", position: "object-top" },
  { src: "/book/v3/w-thread.mp4", poster: "/book/v3/w-thread.webp", position: "object-top" },
  { src: "/book/v3/w-cups.mp4", poster: "/book/v3/w-cups.webp", position: "object-top" },
  { src: "/book/v3/w-mirror.mp4", poster: "/book/v3/w-mirror.webp", position: "object-top" },
  { src: "/book/v3/w-phone.mp4", poster: "/book/v3/w-phone.webp", position: "object-top" },
];

export default function PreviewWaiting({ name, slow }: { name?: string | null; slow?: boolean }) {
  const who = name ? `${name}님` : "당신";
  const STEPS = [
    `${who}의 이야기를 펼치고 있어요`,
    "마지막 대화에 남은 마음을 읽고 있어요",
    "그 사람이 왜 그렇게 반응했는지 보고 있어요",
    "지금 연락해도 되는지, 순서를 정리하고 있어요",
    `${who}에게만 하는 말을 고르고 있어요`,
  ];
  const [i, setI] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const t = window.setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 6500);
    /* 실제 진행률이 아니라 기다림을 덜 지루하게 — 92%까지 천천히 */
    const p = window.setInterval(() => setPct((v) => (v < 92 ? v + (92 - v) * 0.06 : v)), 700);
    return () => {
      window.clearInterval(t);
      window.clearInterval(p);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="fade-in relative h-[100svh] overflow-hidden bg-ink" aria-live="polite">
      <div className="absolute inset-0" aria-hidden>
        <HeroMontage clips={CLIPS} interval={5200} />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-ink via-ink/85 to-transparent" />
      </div>

      <p className="absolute inset-x-0 top-[max(1.5rem,env(safe-area-inset-top))] text-center text-[0.7rem] tracking-[0.4em] text-gold/90">
        月下緣
      </p>

      <div className="absolute inset-x-0 bottom-0 px-7 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <p className="text-[0.7rem] tracking-[0.3em] text-thread">월화가 읽는 중</p>
        <p key={i} className="font-display fade-in mt-3 min-h-[3.6em] text-[1.3rem] leading-[1.7] text-ivory">
          {STEPS[i]}
        </p>

        <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-ivory/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-thread to-gold transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2.5 flex gap-1.5" aria-hidden>
          {STEPS.map((_, k) => (
            <span
              key={k}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${k <= i ? "bg-gold/70" : "bg-ivory/10"}`}
            />
          ))}
        </div>

        <p className="mt-6 text-[0.86rem] font-light leading-[1.9] text-ivory-dim">
          혼자 정하지 않아도 돼요.
          <br />
          <span className="text-ivory">지금 무엇을 하고, 무엇을 멈출지</span> 월화가 같이 볼게요.
        </p>
        {slow && (
          <p className="fade-in mt-3 text-[0.76rem] font-light text-gold/80">
            사연이 깊을수록 조금 더 천천히 읽어요. 창을 닫지 말고 기다려 주세요.
          </p>
        )}
      </div>
    </section>
  );
}
