"use client";

/**
 * 결과 대기 중 월화 영상 콘텐츠.
 * - 사용자가 제작한 실제 영상만 사용.
 * - 한 번에 현재 영상 하나만 렌더/로드.
 * - 자동재생은 muted. 소리는 사용자가 버튼을 눌렀을 때만 켜짐.
 * - 영상이 끝나면 다음 영상으로 이동.
 * - 결과 ready 처리는 AutoResultProcessing이 별도로 수행하므로
 *   영상 도중에도 결과가 완성되면 즉시 결과 페이지로 이동한다.
 */
import { useEffect, useRef, useState } from "react";

type WaitingVideo = {
  id: string;
  title: string;
  src: string;
  poster: string;
};

const VIDEOS: WaitingVideo[] = [
  {
    id: "05",
    title: "그 사람이 필요한 걸까, 그때가 그리운 걸까",
    src: "/wolhwa/shorts/05.mp4",
    poster: "/wolhwa/shorts/05-poster.webp",
  },
  {
    id: "01",
    title: "연락하고 싶은 밤에",
    src: "/wolhwa/shorts/01.mp4",
    poster: "/wolhwa/shorts/01-poster.webp",
  },
  {
    id: "02",
    title: "답장이 없을 때 자꾸 확인하는 이유",
    src: "/wolhwa/shorts/02.mp4",
    poster: "/wolhwa/shorts/02-poster.webp",
  },
  {
    id: "03",
    title: "재회하고 싶다면 먼저 볼 것",
    src: "/wolhwa/shorts/03.mp4",
    poster: "/wolhwa/shorts/03-poster.webp",
  },
  {
    id: "04",
    title: "다시 만나도 같은 이유로 헤어질 때",
    src: "/wolhwa/shorts/04.mp4",
    poster: "/wolhwa/shorts/04-poster.webp",
  },
];

export default function WaitingContent() {
  const [idx, setIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const next = () => {
    setIdx((i) => (i + 1) % VIDEOS.length);
  };

  useEffect(() => {
    setMuted(true);
    setFailed(false);
  }, [idx]);

  const toggleSound = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const item = VIDEOS[idx];

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl border border-gold-dim/25 bg-ink-soft">
        <div className="px-5 pb-4 pt-5 text-center">
          <p className="font-display text-[0.95rem] font-medium leading-[1.7] text-gold">
            “{item.title}”
          </p>
        </div>

        {!failed ? (
          <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden bg-ink">
            <video
              key={item.id}
              ref={videoRef}
              className="h-full w-full object-cover"
              src={item.src}
              poster={item.poster}
              autoPlay
              muted={muted}
              playsInline
              preload="metadata"
              onEnded={next}
              onError={() => setFailed(true)}
            />
            <button
              type="button"
              onClick={toggleSound}
              className="absolute bottom-3 right-3 rounded-full border border-ivory/25 bg-ink/75 px-3 py-2 text-[0.68rem] text-ivory backdrop-blur-sm"
              aria-label={muted ? "영상 소리 켜기" : "영상 소리 끄기"}
            >
              {muted ? "소리 켜기" : "소리 끄기"}
            </button>
          </div>
        ) : (
          <div className="px-6 pb-7 text-center">
            <p className="text-[0.82rem] font-light leading-[1.9] text-ivory-dim">
              영상을 불러오지 못했어요.
              <br />
              결과 준비는 계속 진행되고 있습니다.
            </p>
            <button
              type="button"
              onClick={next}
              className="mt-4 text-[0.75rem] text-gold underline underline-offset-4"
            >
              다음 이야기 보기
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {VIDEOS.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`${i + 1}번째 영상 보기`}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-5 bg-gold/70" : "w-1.5 bg-gold-dim/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
