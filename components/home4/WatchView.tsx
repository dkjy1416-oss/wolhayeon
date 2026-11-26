"use client";

/**
 * 11/26 운영자 요청: 영상 탭 — 묘수 /watch 구도. 월하연 공식 유튜브 쇼츠를 모아 보고, 누르면 화면 안에서 바로 재생.
 * 대표 넘김(세로 카드) → 채널 공지 → 상담 연결 띠 → 전체 쇼츠 3열.
 */
import { useState } from "react";
import Link from "next/link";
import { SHORTS_YT, YT_CHANNEL, ytThumb, ytThumbH, type Short } from "@/lib/home/videos";

function Thumb({ s, className }: { s: Short; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ytThumb(s.id)}
      alt=""
      aria-hidden
      loading="lazy"
      onError={(e) => {
        const im = e.currentTarget;
        if (!im.dataset.fb) {
          im.dataset.fb = "1";
          im.src = ytThumbH(s.id);
        }
      }}
      className={className}
    />
  );
}

const FEATURED = ["r7-OOdStniE", "A6ZCzFbe6DI", "T0AhlWKnETU", "F0-Bb9RHJhA", "W5lAdcSHPwU"];

export default function WatchView() {
  const [play, setPlay] = useState<Short | null>(null);
  const [tag, setTag] = useState("전체");
  const feat = FEATURED.map((id) => SHORTS_YT.find((s) => s.id === id)).filter(Boolean) as Short[];
  const tags = ["전체", ...Array.from(new Set(SHORTS_YT.map((s) => s.tag)))];
  const list = tag === "전체" ? SHORTS_YT : SHORTS_YT.filter((s) => s.tag === tag);

  return (
    <div>
      {/* 대표 쇼츠 */}
      <section aria-label="대표 영상" className="pt-1">
        <div className="scrollbar-none flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4">
          {feat.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPlay(s)}
              className="relative aspect-[9/16] w-[58%] max-w-[250px] shrink-0 snap-center overflow-hidden rounded-2xl bg-[#18181B] text-left"
            >
              <Thumb s={s} className="absolute inset-0 h-full w-full object-cover" />
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent to-black/90" />
              <span className="absolute left-2.5 top-2.5 rounded-full bg-[#B3263F] px-2 py-0.5 text-[11px] font-bold text-white">{i === 0 ? "인기" : s.tag}</span>
              <span className="absolute right-2.5 top-2.5 rounded bg-black/60 px-1.5 py-px text-[10px] text-white">AI 연출</span>
              <span className="absolute inset-x-3 bottom-3">
                <span className="line-clamp-3 text-[15px] font-bold leading-[1.4] text-white [word-break:keep-all]">{s.title}</span>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[#191919]">▶ 바로 보기</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 공지 + 상담 연결 */}
      <section className="flex flex-col gap-2.5 px-4 pt-5">
        <a href={YT_CHANNEL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-[#2A2A2E] bg-[#18181B] px-4 py-3">
          <span className="text-[11px] font-extrabold tracking-[0.12em] text-[#E4627B]">NOTICE</span>
          <span className="flex-1 truncate text-[14px] font-bold">월하연 유튜브에서 새 쇼츠 보기</span>
          <span className="text-[#B5B5BA]">›</span>
        </a>
        <Link href="/apply" className="block rounded-2xl bg-gradient-to-r from-[#7A1E31] to-[#B3263F] px-4 py-4 text-center">
          <span className="block text-[17px] font-extrabold text-white">영상 속 그 장면, 내 이야기 같다면?</span>
          <span className="mt-1 block text-[13px] text-white/85">내 사연으로 무료 미리보기 받기 ›</span>
        </Link>
      </section>

      {/* 전체 쇼츠 */}
      <section className="pt-8">
        <div className="flex items-baseline justify-between px-4">
          <h2 className="m-0 text-[20px] font-extrabold">월하연 쇼츠</h2>
          <a href={YT_CHANNEL} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-[#B5B5BA]">
            채널 가기 ›
          </a>
        </div>
        <div className="scrollbar-none mt-3 flex gap-1.5 overflow-x-auto px-4">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`h-[32px] shrink-0 rounded-full px-3.5 text-[13px] ${tag === t ? "bg-[#2A0D15] font-bold text-white ring-1 ring-[#8E2338]" : "bg-[#18181B] text-[#B5B5BA]"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 px-4">
          {list.map((s, i) => (
            <button key={s.id} type="button" onClick={() => setPlay(s)} className="text-left">
              <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-[#18181B]">
                <Thumb s={s} className="h-full w-full object-cover" />
                {i < 3 && tag === "전체" && <span className="absolute left-1.5 top-1.5 rounded bg-[#B3263F] px-1.5 py-px text-[10px] font-bold text-white">NEW</span>}
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1 py-px text-[9px] text-white">AI 연출</span>
              </span>
              <span className="mt-1.5 line-clamp-2 block text-[12.5px] font-semibold leading-[1.4] [word-break:keep-all]">{s.title}</span>
            </button>
          ))}
        </div>
      </section>

      {play && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 px-4" role="dialog" aria-label={play.title} onClick={() => setPlay(null)}>
          <div className="w-full max-w-[360px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2">
              <span className="line-clamp-1 pr-3 text-[14px] font-bold text-white">{play.title}</span>
              <button type="button" onClick={() => setPlay(null)} className="h-9 shrink-0 rounded-full bg-white/15 px-3 text-[13px] text-white">
                닫기
              </button>
            </div>
            <div className="aspect-[9/16] max-h-[72vh] w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${play.id}?autoplay=1&playsinline=1&rel=0`}
                title={play.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
            <Link href="/apply" className="mt-3 block rounded-xl bg-[#B3263F] py-3 text-center text-[15px] font-extrabold text-white">
              내 사연으로 무료 미리보기 ›
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
