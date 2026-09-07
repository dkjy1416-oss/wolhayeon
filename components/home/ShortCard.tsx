"use client";

/**
 * 월화 숏폼 카드 (9:16).
 * - 파일이 있는 카드만 <video>를 렌더 (없으면 이 컴포넌트 자체가 안 쓰임)
 * - 클릭/탭 시 재생, 소리는 사용자가 컨트롤로 직접 켠 경우에만 (muted 시작)
 * - preload="none" → 동시 로드/자동재생 없음
 */
import { useRef, useState } from "react";

export default function ShortCard({
  title,
  src,
  poster,
}: {
  title: string;
  src: string;
  poster: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = () => {
    setStarted(true);
    const v = videoRef.current;
    if (v) {
      v.muted = true; // 소리는 사용자가 컨트롤에서 직접 켤 때만
      v.play().catch(() => {});
    }
  };

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-gold-dim/25 bg-ink-soft">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src={src}
        poster={poster ?? undefined}
        preload="none"
        playsInline
        muted
        controls={started}
        onClick={() => !started && start()}
      />
      {!started && (
        <button
          type="button"
          onClick={start}
          aria-label={`${title.replace(/\n/g, " ")} 영상 재생`}
          className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-ink/90 via-ink/20 to-ink/30 px-4 pb-5 text-left"
        >
          <span
            aria-hidden
            className="mb-auto mt-auto flex h-12 w-12 items-center justify-center rounded-full border border-ivory/40 bg-ink/40 text-ivory"
          >
            ▶
          </span>
          <span className="w-full whitespace-pre-line text-[0.82rem] font-medium leading-[1.7] text-ivory">
            {title}
          </span>
        </button>
      )}
    </div>
  );
}
