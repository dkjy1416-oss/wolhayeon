"use client";

/**
 * 11/27 운영자 요청: 미리보기를 더 풍부하게 — 미리보기 화면 아래쪽에 붙이는 묶음.
 *  ① 해당 상품 후기 ② (재회 분석) 메인 페이지의 '받는 것' POINT 1~4 ③ SNS·유튜브 영상 ④ 결정 전에 읽을 칼럼
 * 결제·신청 흐름(버튼·주소·상태)은 건드리지 않는다. 색은 테마 클래스라 밝은 미리보기(paper)·어두운 카톡 화면 둘 다 맞는다.
 */
import Link from "next/link";
import { Point1, Point2, Point3, Point4, Point5 } from "@/components/home3/Points";
import { Hook, Turn, Mystery } from "@/components/home3/Story";
import ShortsRow from "@/components/home2/ShortsRow";
import { SAVED_REVIEWS } from "@/lib/home/reviews-saved";
import { ReviewCard, Stars5 } from "@/components/home4/ReviewCard";
import { COLUMNS, colPal } from "@/lib/home/columns";
import { SHORTS_YT, ytThumb } from "@/lib/home/videos";

const CFG = {
  ritual: {
    products: ["관계 리추얼", "리추얼 + 심층 리포트", "심층 재회 리포트"],
    columns: ["short-reply-after-apology", "held-on-too-much", "before-you-send", "first-24-hours"],
  },
  chat: {
    products: ["카톡 대화 분석"],
    columns: ["shorter-replies", "reply-to-how-are-you", "before-you-send"],
  },
} as const;

const YT_PICK = ["r7-OOdStniE", "A6ZCzFbe6DI", "F0-Bb9RHJhA", "lMHD1SXc1Ks"];

export default function PreviewExtras({ kind, afterReviews, visitors = 0 }: { kind: "ritual" | "chat"; afterReviews?: React.ReactNode; visitors?: number }) {
  const cfg = CFG[kind];
  const reviews = SAVED_REVIEWS.filter((r) => (cfg.products as readonly string[]).includes(r.product)).slice(0, 12);
  const cols = cfg.columns.map((s) => COLUMNS.find((c) => c.slug === s)).filter(Boolean) as typeof COLUMNS;
  const head = "text-[0.76rem] font-semibold tracking-wider text-gold";
  const h2 = "font-display mt-1 text-[1.15rem] font-semibold leading-[1.5] text-ivory [word-break:keep-all]";

  return (
    <div className="mt-10" aria-label="더 알아보기">
      {/* ① 후기 */}
      {reviews.length > 0 && (
        <section className="px-6" aria-label="이용 후기">
          <div className="mx-auto max-w-[640px]">
            <div className="flex items-end justify-between">
              <div>
                <p className={head}>
                  실시간 이용 후기 · <Stars5 size={11} /> 5.0
                </p>
                <h2 className={h2}>{kind === "chat" ? "숫자 다음, 해석을 받아 본 분들" : "미리보기 다음 장을 열어 본 분들"}</h2>
              </div>
              <Link href="/reviews" className="shrink-0 pb-1 text-[0.76rem] text-ivory-dim underline underline-offset-4">
                전체 후기
              </Link>
            </div>
            <div className="scrollbar-none -mx-6 mt-3 flex snap-x gap-2.5 overflow-x-auto px-6">
              {reviews.map((r) => (
                <div key={r.id} className="w-[84%] max-w-[310px] shrink-0 snap-start">
                  <ReviewCard r={{ key: String(r.id), id: r.id, product: r.product, body: r.body, age: r.age, stars: 5 }} clamp={5} light={kind === "ritual"} href="/reviews" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* 11/27 운영자 요청: 월계수 누적 집계는 후기 바로 밑 */}
      {afterReviews}

      {/* 11/27 운영자 요청: 기존 재회 분석 첫 화면 1~4 (대화창 → 그런데 → 붉은 실 → 미치도록 궁금했던 이야기) */}
      {kind === "ritual" && (
        <div className="night mt-10 bg-[#120e10] text-ivory" style={{ ["--color-ivory" as string]: "#e8ddc8", ["--color-ivory-dim" as string]: "#a2977f" } as React.CSSProperties}>
          <Hook visitors={visitors} inPreview />
          <Turn inPreview />
          <Mystery />
        </div>
      )}

      {/* ② 메인 페이지의 '받는 것' (재회 분석) */}
      {kind === "ritual" && (
        <section className="mt-10" aria-label="결과에서 받는 것">
          <div className="px-6">
            <div className="mx-auto max-w-[640px] text-center">
              <p className={head}>전체 결과에서 이렇게 받아요</p>
              <h2 className={h2}>미리보기는 첫 장이에요. 다음 장에는 이런 것들이 담겨요</h2>
            </div>
          </div>
          <div className="-mt-4">
            <Point1 />
            <Point2 />
            <Point3 />
            <Point4 />
            {/* 11/27 요청: POINT 5 (한 번의 결제로 부담 없이) */}
            <Point5 bare />
          </div>
        </section>
      )}

      {/* ③ SNS · 유튜브 */}
      <section className="night mt-8 bg-[#120e10] py-2 text-ivory" aria-label="SNS에서 화제인 월하연">
        <p className="pt-8 text-center text-[1.15rem] font-extrabold text-[#F5F5F5]">
          SNS에서 화제인 <span className="text-[#E4627B]">월하연</span>
        </p>
        <ShortsRow />
        <div className="mx-auto max-w-[640px] px-6 pb-8">
          <div className="flex items-baseline justify-between">
            <p className="text-[0.92rem] font-bold text-[#F5F5F5]">유튜브에서 많이 본 영상</p>
            <Link href="/watch" className="text-[0.76rem] text-[#B5B5BA] underline underline-offset-4">
              영상 더 보기
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {YT_PICK.map((id) => {
              const v = SHORTS_YT.find((x) => x.id === id);
              return (
                <Link key={id} href="/watch" className="relative block aspect-[9/16] overflow-hidden rounded-lg bg-[#1E1E22]" aria-label={v?.title ?? "월하연 쇼츠"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ytThumb(id)} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[8px] text-white/80">AI 연출</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ④ 칼럼 */}
      {cols.length > 0 && (
        <section className="mt-10 px-6" aria-label="월화의 칼럼">
          <div className="mx-auto max-w-[640px]">
            <div className="flex items-end justify-between">
              <div>
                <p className={head}>결정하기 전에 읽어 보세요</p>
                <h2 className={h2}>월화의 3분 칼럼</h2>
              </div>
              <Link href="/column" className="shrink-0 pb-1 text-[0.76rem] text-ivory-dim underline underline-offset-4">
                칼럼 전체
              </Link>
            </div>
            <div className="scrollbar-none -mx-6 mt-3 flex gap-2.5 overflow-x-auto px-6">
              {cols.map((c) => {
                const p = colPal(c.no);
                return (
                  <Link key={c.slug} href={`/column/${c.slug}`} className="relative flex h-[188px] w-[156px] shrink-0 flex-col overflow-hidden rounded-[20px] p-3.5" style={{ background: p.bg }}>
                    <span className="w-fit rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-extrabold" style={{ color: p.ink }}>
                      {c.tag}
                    </span>
                    <span className="mt-2 text-[14px] font-extrabold leading-[1.38] text-[#2B2326] [word-break:keep-all]">{c.title}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt="" aria-hidden loading="lazy" className="absolute -bottom-1 -right-1 h-[80px] w-[80px] object-contain mix-blend-multiply" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
