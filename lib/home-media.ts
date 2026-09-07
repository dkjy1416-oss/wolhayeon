/**
 * 메인 홈 미디어 자산 확인 (서버 전용) — 모바일 전용 구성.
 * public/ 실제 파일 존재 여부를 확인해 404 없이 연결. (파일 추가+배포만으로 연결)
 */
import "server-only";
import fs from "fs";
import path from "path";

function found(publicPath: string): string | null {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", publicPath))
      ? `/${publicPath}`
      : null;
  } catch {
    return null;
  }
}

export interface ShortMeta {
  id: string;
  title: string;
  src: string | null;
  poster: string | null;
}

export interface HomeMedia {
  heroVideo: string | null; // 모바일 단일 히어로 (PC 전용 영상 없음)
  heroPoster: string | null;
  readingLoop: string | null;
  readingPoster: string | null;
  emotionPhone: string | null;
  wolhwaGaze: string | null;
  ritualLetter: string | null;
  resultCards: string | null;
  shorts: ShortMeta[];
}

/** 숏폼 메타데이터 (기존 제목 유지 — 파일 01~05와 1:1 대응) */
const SHORTS_META: Array<{ id: string; title: string }> = [
  { id: "01", title: "연락하고 싶은 밤에" },
  { id: "02", title: "답장이 없을 때\n자꾸 확인하는 이유" },
  { id: "03", title: "재회하고 싶다면 먼저 볼 것" },
  { id: "04", title: "다시 만나도\n같은 이유로 헤어질 때" },
  { id: "05", title: "그 사람이 필요한 걸까,\n그때가 그리운 걸까" },
];

/** 결제 후 대기 화면 재생 순서: 05 → 01 → 02 → 03 → 04 */
const WAITING_ORDER = ["05", "01", "02", "03", "04"] as const;

export interface WaitingVideo {
  id: string;
  title: string;
  src: string;
  poster: string | null;
}

/** 실제 존재하는 파일만 순서대로 (없으면 빈 배열 → 기존 텍스트 카드 유지) */
export function getWaitingVideos(): WaitingVideo[] {
  const byId = new Map(SHORTS_META.map((m) => [m.id, m.title]));
  const out: WaitingVideo[] = [];
  for (const id of WAITING_ORDER) {
    const src = found(`wolhwa/shorts/${id}.mp4`);
    if (!src) continue;
    out.push({
      id,
      title: byId.get(id) ?? "",
      src,
      poster: found(`wolhwa/shorts/${id}-poster.webp`),
    });
  }
  return out;
}

export function getHomeMedia(): HomeMedia {
  return {
    heroVideo: found("wolhwa/hero-loop-mobile.mp4"),
    heroPoster: found("wolhwa/hero-poster.webp"),
    readingLoop: found("wolhwa/wolhwa-reading-loop.mp4"),
    readingPoster: found("wolhwa/reading-poster.webp"),
    emotionPhone: found("wolhwa/emotion-phone.webp"),
    wolhwaGaze: found("wolhwa/wolhwa-gaze.webp"),
    ritualLetter: found("wolhwa/ritual-letter.webp"),
    resultCards: found("wolhwa/result-cards.webp"),
    shorts: SHORTS_META.map((m) => ({
      ...m,
      src: found(`wolhwa/shorts/${m.id}.mp4`),
      poster: found(`wolhwa/shorts/${m.id}-poster.webp`),
    })),
  };
}
