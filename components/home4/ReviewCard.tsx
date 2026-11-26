/**
 * 11/27 운영자 요청: 후기 카드 리디자인 — 아바타 · 가린 이름(김*연) · 별 5개 · 상품 · 본문.
 * 저장 후기(SAVED_REVIEWS)는 운영자 확인 기준 모두 별점 5점. 이름·아바타는 id 로 고정 배정(새로고침해도 같은 사람).
 */
import Link from "next/link";

const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황"];
const END = ["연", "진", "은", "아", "희", "윤", "서", "민", "지", "현", "수", "영", "원", "린", "경", "주"];
const AV = ["girl_heart", "girl_think", "girl_thumb", "girl_wow", "girl_curly", "girl_pony", "girl_worry", "girl_book", "bunny_love", "bunny_phone"];

export const maskName = (id: number) => `${SUR[(id * 7) % SUR.length]}*${END[(id * 5 + 3) % END.length]}`;
export const avatarOf = (id: number) => `/wolhwa/doodle/${AV[(id * 3) % AV.length]}.webp`;

export const PRODUCT_HREF: Record<string, string> = {
  "관계 리추얼": "/apply",
  "카톡 대화 분석": "/chat",
  "심층 재회 리포트": "/book",
  "리추얼 + 심층 리포트": "/book",
};

export type ReviewView = { key: string; id: number; product: string; body: string; age?: string; name?: string; stars?: number };

export function Stars5({ n = 5, size = 14 }: { n?: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`별점 ${n}점`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill={i < n ? "#F5B83D" : "#4a4a50"} />
        </svg>
      ))}
    </span>
  );
}

/** 가로 넘김용 카드 (light=밝은 배경 미리보기용) */
export function ReviewCard({ r, clamp = 4, light = false, href }: { r: ReviewView; clamp?: number; light?: boolean; href?: string }) {
  const name = r.name || maskName(r.id);
  const box = light ? "border-[#E8DDD3] bg-white text-[#2B2326]" : "border-[#2A2A2E] bg-[#18181B] text-[#F5F5F5]";
  const sub = light ? "text-[#8a7a7e]" : "text-[#9a9aa0]";
  const inner = (
    <>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarOf(r.id)} alt="" aria-hidden className="h-11 w-11 shrink-0 rounded-full border border-[#E8DDD3] bg-white object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Stars5 n={r.stars ?? 5} />
            {r.age && <span className={`text-[11.5px] ${sub}`}>{r.age}</span>}
          </div>
          <p className="m-0 mt-0.5 truncate text-[14px] font-bold">
            {name} <span className={`text-[12.5px] font-normal ${sub}`}>| {r.product}</span>
          </p>
        </div>
      </div>
      <p className="m-0 mt-3 text-[14.5px] leading-[1.65] [word-break:keep-all]" style={{ display: "-webkit-box", WebkitLineClamp: clamp, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {r.body}
      </p>
    </>
  );
  const cls = `block rounded-2xl border p-4 ${box}`;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
