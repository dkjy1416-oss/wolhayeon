/**
 * 메인 홈 미디어 자산 확인 (서버 전용) — 모바일 전용 구성.
 * public/ 실제 파일 존재 여부를 확인해 404 없이 연결.
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
  heroVideo: string | null;
  heroPoster: string | null;
  readingLoop: string | null;
  readingPoster: string | null;
  emotionPhone: string | null;
  wolhwaGaze: string | null;
  ritualLetter: string | null;
  resultCards: string | null;
  shorts: ShortMeta[];
}

/**
 * 실제 제작 영상 매핑:
 * 대기1 = 연락하고 싶은 밤에
 * 대기2 = 답장이 없을 때 자꾸 확인하는 이유
 * 대기3 = 재회하고 싶다면 먼저 볼 것
 * 대기4 = 다시 만나도 같은 이유로 헤어질 때
 * 대기5 = 그 사람이 필요한 걸까, 그때가 그리운 걸까
 *
 * 홈페이지에서는 후킹이 가장 강한 대기5를 첫 카드로 배치.
 */
const SHORTS_META: Array<{ id: string; title: string }> = [
  { id: "05", title: "그 사람이 필요한 걸까,\n그때가 그리운 걸까" },
  { id: "01", title: "연락하고 싶은 밤에" },
  { id: "02", title: "답장이 없을 때\n자꾸 확인하는 이유" },
  { id: "03", title: "재회하고 싶다면 먼저 볼 것" },
  { id: "04", title: "다시 만나도\n같은 이유로 헤어질 때" },
];

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
