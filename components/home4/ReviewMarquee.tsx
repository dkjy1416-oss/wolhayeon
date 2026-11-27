/**
 * 11/27 운영자 요청: 후기는 3줄로 풍성하게 — 1줄 왼쪽, 2줄 오른쪽, 3줄 왼쪽으로 계속 흐름.
 * "이 후기 셋팅 마음에 든다, 후기 들어가는 모든 곳은 이걸로" → 홈 · 카톡 분석 · 미리보기 · 책 페이지 공통.
 * 손가락을 대면(또는 마우스를 올리면) 그 줄만 잠깐 멈춤. 움직임 줄이기 설정이면 멈춘 채로.
 * 후기는 실제 후기(DB 승인 + 운영자 저장 원문)만 받는다.
 */
import { ReviewCard, type ReviewView } from "@/components/home4/ReviewCard";

export default function ReviewMarquee({
  items,
  light = false,
  href,
  rows = 3,
  className = "",
}: {
  items: ReviewView[];
  light?: boolean;
  href?: string;
  rows?: number;
  className?: string;
}) {
  if (items.length === 0) return null;
  const n = Math.max(1, Math.min(rows, Math.floor(items.length / 2) || 1));
  const lines = Array.from({ length: n }, (_, k) => items.filter((_, i) => i % n === k));
  return (
    <div className={`flex flex-col gap-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)] ${className}`}>
      <style>{`
        @keyframes rv-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes rv-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .rv-row { display: flex; width: max-content; gap: 0.75rem; }
        .rv-row:hover, .rv-row:active { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .rv-row { animation: none !important; } }
      `}</style>
      {lines.map((row, k) => {
        /* 한 줄이 화면보다 짧으면 끊겨 보이니 최소 4장이 되도록 반복 */
        const base = row.length >= 4 ? row : Array.from({ length: Math.ceil(4 / row.length) }, () => row).flat();
        return (
          <div
            key={k}
            className="rv-row"
            style={{ animation: `${k % 2 === 1 ? "rv-right" : "rv-left"} ${Math.max(28, base.length * 6)}s linear infinite` }}
          >
            {[...base, ...base].map((r, i) => (
              <div key={`${r.key}-${i}`} className="w-[270px] shrink-0" aria-hidden={i >= row.length}>
                <ReviewCard r={r} clamp={3} light={light} href={href} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
