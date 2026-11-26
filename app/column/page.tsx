import type { Metadata } from "next";
import Link from "next/link";
import SubShell from "@/components/home4/SubShell";
import { COLUMNS, colPal } from "@/lib/home/columns";

/** 11/26 운영자 요청: 칼럼 게시판 — 2차 디자인 (파스텔 카드 + 낙서 캐릭터). 새 홈 확인 전까지 검색 노출 차단. */
export const metadata: Metadata = {
  title: "월화의 칼럼 | 월하연 月下緣",
  description: "헤어진 뒤 24시간, 단답이 왔을 때, 보내기 전 3단계 — 재회를 고민할 때 읽는 월화의 칼럼.",
  robots: { index: false, follow: false },
};

export default function ColumnList() {
  const [top, ...rest] = COLUMNS;
  const tp = colPal(top.no);
  return (
    <SubShell title="월화의 칼럼" active="column">
      <section className="px-4 pt-1">
        <div className="relative overflow-hidden rounded-[26px] px-5 pb-5 pt-5" style={{ background: "linear-gradient(160deg,#2A0D15 0%,#5A1627 60%,#7A1E31 100%)" }}>
          <span aria-hidden className="absolute right-5 top-4 text-[30px] leading-none text-[#F3D58A]">☾</span>
          <span aria-hidden className="absolute right-14 top-10 text-[12px] text-[#F3D58A]/70">✦</span>
          <p className="m-0 text-[12.5px] font-bold tracking-[0.08em] text-[#F3B6C2]">WOLHWA COLUMN</p>
          <h2 className="font-display m-0 mt-2 text-[24px] font-bold leading-[1.35] text-white [word-break:keep-all]">
            보내기 전에,
            <br />한 편 먼저 읽어 봐요
          </h2>
          <p className="m-0 mt-2 text-[13px] leading-[1.6] text-white/75">헤어진 뒤 마음이 급해질 때 꺼내 읽는 3분 칼럼 {COLUMNS.length}편</p>
        </div>

        <Link href={`/column/${top.slug}`} className="relative mt-4 block overflow-hidden rounded-[24px] p-5" style={{ background: tp.bg }}>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-extrabold" style={{ color: tp.ink }}>
            NEW · {top.tag}
          </span>
          <p className="m-0 mt-3 max-w-[64%] text-[19px] font-extrabold leading-[1.4] text-[#2B2326] [word-break:keep-all]">{top.title}</p>
          <p className="m-0 mt-2 max-w-[60%] text-[13px] leading-[1.55] text-[#5a4a4e] [word-break:keep-all]">{top.summary}</p>
          <span className="mt-4 inline-block rounded-full bg-[#2B2326] px-3 py-1.5 text-[12px] font-bold text-white">읽어 보기 →</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={top.img} alt="" aria-hidden className="absolute -bottom-2 right-0 h-[150px] w-[150px] object-contain mix-blend-multiply" />
        </Link>
      </section>

      <section className="px-4 pt-7">
        <h3 className="m-0 text-[17px] font-extrabold">전체 칼럼</h3>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {rest.map((c) => {
            const p = colPal(c.no);
            return (
              <Link key={c.slug} href={`/column/${c.slug}`} className="relative flex h-[208px] flex-col overflow-hidden rounded-[20px] p-3.5" style={{ background: p.bg }}>
                <span className="w-fit rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-extrabold" style={{ color: p.ink }}>
                  {c.tag}
                </span>
                <span className="mt-2 text-[15px] font-extrabold leading-[1.38] text-[#2B2326] [word-break:keep-all]">{c.title}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt="" aria-hidden loading="lazy" className="absolute -bottom-1 -right-1 h-[96px] w-[96px] object-contain mix-blend-multiply" />
                <span className="relative mt-auto text-[11.5px] font-bold text-[#6a5a5e]">{c.min}분 읽기</span>
              </Link>
            );
          })}
        </div>
      </section>
    </SubShell>
  );
}
