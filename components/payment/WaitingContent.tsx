"use client";

/**
 * 결과 대기 중 콘텐츠 (고정 콘텐츠 — AI 호출 없음).
 * [역할 고정] 대기영상 01~05는 "결제 후 전체 결과 생성 대기"에서만 사용한다.
 * 무료 preview 단계에서는 절대 사용하지 않는다 (그쪽은 wolhwa-reading-loop 전용).
 *
 * - 현재는 text 카드만 사용. 가짜 후기·가상 고객 이름은 절대 사용하지 않음.
 * - 향후 실제 고객 동의를 받은 후기/월화 숏폼 영상이 준비되면
 *   ITEMS에 { kind: "video", src: "/waiting/xxx.mp4", title } 항목을
 *   추가하는 것만으로 연결되도록 구조를 미리 지원.
 *   (현재 영상 파일이 없으므로 video 항목은 넣지 않음 — 404 태그 방지)
 */
import { useEffect, useState } from "react";

export interface WaitingVideoItem {
  id: string;
  title: string;
  src: string;
  poster: string | null;
}

type WaitingItem =
  | { kind: "text"; title: string; body: string }
  | { kind: "video"; title: string; src: string };

const ITEMS: WaitingItem[] = [
  {
    kind: "text",
    title: "연락하고 싶은 밤에",
    body: "지금 보내려는 말을 메모장에 먼저 적어보세요.\n내일도 같은 말을 보내고 싶은지 한 번 더 보는 것만으로도\n충동과 진짜 마음을 구분하기 쉬워집니다.",
  },
  {
    kind: "text",
    title: "상대의 마음이 너무 궁금할 때",
    body: "답을 상상하는 것보다,\n지금 확인할 수 있는 사실과 내 추측을\n한 번 나누어 보는 편이 도움이 됩니다.",
  },
  {
    kind: "text",
    title: "재회를 생각하고 있다면",
    body: "다시 만나는 것만큼 중요한 건\n다시 만났을 때 무엇이 달라질 수 있는지입니다.",
  },
  {
    kind: "text",
    title: "답장이 없을 때",
    body: "연락의 빈도가 마음의 크기를\n정확히 보여주는 것은 아닙니다.",
  },
  {
    kind: "text",
    title: "오늘 밤의 마음",
    body: "지금의 감정에 이름을 붙여보는 것만으로도\n마음은 조금 정리되기 시작합니다.\n그리움인지, 서운함인지, 걱정인지.",
  },
];

const ROTATE_MS = 10000;

export default function WaitingContent({
  videos = [],
}: {
  /** 실제 존재가 확인된 대기 영상 (순서 05→01→02→03→04). 비면 텍스트 카드 사용 */
  videos?: WaitingVideoItem[];
}) {
  const [idx, setIdx] = useState(0);
  const useVideos = videos.length > 0;

  useEffect(() => {
    if (useVideos) return; // 영상 모드: onEnded로 진행 (interval 없음)
    const id = setInterval(
      () => setIdx((i) => (i + 1) % ITEMS.length),
      ROTATE_MS
    );
    return () => clearInterval(id);
  }, [useVideos]);

  /* ---------- 영상 모드: 한 번에 한 개만 렌더/로드, autoplay muted,
     소리는 사용자가 컨트롤로 켤 때만, 끝나면 다음으로 순환 ---------- */
  if (useVideos) {
    const v = videos[idx % videos.length];
    return (
      <div className="w-full">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl border border-gold-dim/25 bg-ink-soft">
          <video
            key={v.id}
            className="h-full w-full object-cover"
            src={v.src}
            poster={v.poster ?? undefined}
            autoPlay
            muted
            playsInline
            controls
            preload="metadata"
            onEnded={() => setIdx((i) => (i + 1) % videos.length)}
          />
        </div>
        <p className="mt-3 whitespace-pre-line text-center text-[0.85rem] font-medium leading-[1.8] text-gold">
          “{v.title}”
        </p>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {videos.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1 rounded-full transition-all ${
                i === idx % videos.length ? "w-4 bg-gold/70" : "w-1 bg-gold-dim/40"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  const item = ITEMS[idx];

  return (
    <div className="w-full">
      <div
        key={idx}
        className="min-h-36 rounded-2xl border border-gold-dim/25 bg-ink-soft px-6 py-6 text-center"
      >
        <p className="font-display text-[0.95rem] font-medium text-gold">
          “{item.title}”
        </p>
        {item.kind === "text" ? (
          <p className="mt-3 whitespace-pre-line text-[0.85rem] font-light leading-[1.95] text-ivory-dim">
            {item.body}
          </p>
        ) : (
          /* 실제 영상 파일이 추가된 뒤에만 이 분기가 렌더됨 */
          <video
            className="mt-3 w-full rounded-xl"
            src={item.src}
            controls
            playsInline
            preload="metadata"
          />
        )}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {ITEMS.map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`h-1 rounded-full transition-all ${
              i === idx ? "w-4 bg-gold/70" : "w-1 bg-gold-dim/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
