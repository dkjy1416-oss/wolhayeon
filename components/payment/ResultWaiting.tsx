"use client";

/**
 * 결제 후 전체 결과를 쓰는 동안의 대기 화면.
 * 운영자 원본 영상(무음, 자막 없음)이 천천히 이어지고, 글은 최소한으로:
 *  - 지금 월화가 쓰고 있는 장(章) 한 줄
 *  - 결과에 담기는 것들이 차례로 켜지는 칩 (연출 — 퍼센트 진행률은 쓰지 않음)
 *  - 실제 경과 시간과 안심 문구 한 줄
 */
import { useEffect, useState } from "react";
import HeroMontage from "@/components/home/HeroMontage";

const CLIPS = [
  { src: "/book/v3/w-reading.mp4", poster: "/book/v3/w-reading.webp", position: "object-top" },
  { src: "/book/v3/night.mp4", poster: "/book/v3/night.webp", position: "object-top" },
  { src: "/book/v3/w-thread.mp4", poster: "/book/v3/w-thread.webp", position: "object-top" },
  { src: "/book/v3/bed.mp4", poster: "/book/v3/bed.webp", position: "object-top" },
  { src: "/book/v3/w-cups.mp4", poster: "/book/v3/w-cups.webp", position: "object-top" },
  { src: "/book/v3/alone.mp4", poster: "/book/v3/alone.webp", position: "object-top" },
  { src: "/book/v3/w-mirror.mp4", poster: "/book/v3/w-mirror.webp", position: "object-top" },
  { src: "/book/v3/stop.mp4", poster: "/book/v3/stop.webp", position: "object-top" },
  { src: "/book/v3/w-phone.mp4", poster: "/book/v3/w-phone.webp", position: "object-top" },
  { src: "/book/v3/w-final.mp4", poster: "/book/v3/w-final.webp", position: "object-top" },
];

const CHAPTERS = [
  { chip: "첫 편지", line: (w: string) => `${w}께 보낼\n첫 편지를 쓰고 있어요` },
  { chip: "관계 읽기", line: () => "두 사람 사이에 남은 흐름을\n읽어 내고 있어요" },
  { chip: "연락 전략", line: () => "언제, 어떤 말로 다가갈지\n순서를 정하고 있어요" },
  { chip: "실전 노트", line: () => "답장이 오면, 안 오면 —\n순간마다 할 일을 적고 있어요" },
  { chip: "리추얼", line: (w: string) => `${w}만을 위한\n붉은 실 리추얼을 고르고 있어요` },
  { chip: "21일 여정", line: () => "흔들리지 않을 21일을\n하루씩 채우고 있어요" },
  { chip: "마지막 편지", line: () => "마지막 편지에\n꼭 남길 말을 고르고 있어요" },
];

export default function ResultWaiting({
  name,
  elapsedSeconds,
}: {
  name?: string | null;
  elapsedSeconds: number;
}) {
  const who = name?.trim() ? `${name.trim()}님` : "당신";
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setI((x) => Math.min(x + 1, CHAPTERS.length - 1)), 9000);
    return () => window.clearInterval(t);
  }, []);

  const m = Math.floor(elapsedSeconds / 60);
  const s = String(elapsedSeconds % 60).padStart(2, "0");
  const long = elapsedSeconds >= 240;

  return (
    <main className="relative mx-auto h-[100svh] w-full max-w-md overflow-hidden bg-ink" aria-live="polite">
      <div className="absolute inset-0" aria-hidden>
        <HeroMontage clips={CLIPS} interval={5600} />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-ink via-ink/88 to-transparent" />
      </div>

      <div className="absolute inset-x-0 top-[max(1.2rem,env(safe-area-inset-top))] flex items-center justify-between px-6">
        <p className="text-[0.66rem] tracking-[0.4em] text-gold/90">月下緣</p>
        <span className="rounded-full border border-gold/30 bg-ink/50 px-3 py-1 text-[0.66rem] text-gold backdrop-blur">
          ✓ 결제 완료
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-7 pb-[max(2.2rem,env(safe-area-inset-bottom))]">
        <p className="text-[0.68rem] tracking-[0.3em] text-thread">월화가 쓰는 중</p>
        <p key={i} className="font-display fade-in mt-3 min-h-[3.4em] whitespace-pre-line text-[1.35rem] leading-[1.6] text-ivory">
          {long ? "조금 더 꼼꼼히 쓰고 있어요.\n곧 열어 드릴게요" : CHAPTERS[i].line(who)}
        </p>

        <div className="mt-5 h-[3px] w-full overflow-hidden rounded-full bg-ivory/10">
          <div className="wh-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-thread to-gold" />
        </div>

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="결과에 담기는 것">
          {CHAPTERS.map((c, k) => (
            <li
              key={c.chip}
              className={`rounded-full border px-2.5 py-1 text-[0.68rem] transition-colors duration-700 ${
                k < i
                  ? "border-gold/50 bg-gold/15 text-gold"
                  : k === i
                    ? "border-thread/60 bg-thread/15 text-ivory"
                    : "border-ivory/10 text-ivory-dim/50"
              }`}
            >
              {k < i ? "✓ " : ""}
              {c.chip}
            </li>
          ))}
        </ul>

        <p className="mt-5 text-[0.76rem] font-light leading-[1.8] text-ivory-dim">
          보통 1~3분 · 지금 {m > 0 ? `${m}분 ${s}초` : `${elapsedSeconds}초`}
          <br />
          완성되면 바로 열려요. 창을 닫아도 메일로 보내 드려요.
        </p>
      </div>
    </main>
  );
}
