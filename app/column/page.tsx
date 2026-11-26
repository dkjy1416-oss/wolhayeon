import type { Metadata } from "next";
import Link from "next/link";
import SubShell from "@/components/home4/SubShell";
import { COLUMNS } from "@/lib/home/columns";

/** 11/26 운영자 요청: 하단 메뉴 '질문' → '칼럼' 게시판 (재회에 도움이 되는 행동). 새 홈 확인 전까지 검색 노출 차단. */
export const metadata: Metadata = {
  title: "월화의 칼럼 | 월하연 月下緣",
  description: "헤어진 뒤 24시간, 단답이 왔을 때, 보내기 전 3단계 — 재회를 고민할 때 읽는 월화의 칼럼.",
  robots: { index: false, follow: false },
};

export default function ColumnList() {
  const [top, ...rest] = COLUMNS;
  return (
    <SubShell title="칼럼" active="column">
      <section className="px-4 pt-2">
        <p className="m-0 text-[13px] text-[#E4627B]">월화의 칼럼</p>
        <h2 className="m-0 mt-1 text-[22px] font-extrabold leading-[1.35] tracking-[-0.02em] [word-break:keep-all]">
          보내기 전에, 한 편 먼저 읽어 봐요
        </h2>
        <Link href={`/column/${top.slug}`} className="mt-4 block overflow-hidden rounded-[22px] bg-[#FFFBF5] text-[#2B2326]">
          <div className="flex h-[190px] items-center justify-center bg-[#FFE6EC]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={top.img} alt="" aria-hidden className="h-[170px] w-[170px] rounded-3xl bg-white object-cover" />
          </div>
          <div className="px-4 pb-4 pt-3">
            <span className="rounded-full bg-[#B3263F] px-2 py-0.5 text-[11px] font-bold text-white">NEW · {top.tag}</span>
            <p className="m-0 mt-2 text-[18px] font-extrabold leading-[1.4] [word-break:keep-all]">{top.title}</p>
            <p className="m-0 mt-1 text-[13px] leading-[1.55] text-[#6a5a5e] [word-break:keep-all]">{top.summary}</p>
          </div>
        </Link>
      </section>
      <ul className="m-0 mt-5 list-none divide-y divide-[#2A2A2E] px-4 py-0">
        {rest.map((c) => (
          <li key={c.slug}>
            <Link href={`/column/${c.slug}`} className="flex items-center gap-3 py-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt="" aria-hidden loading="lazy" className="h-[76px] w-[76px] shrink-0 rounded-2xl bg-white object-cover" />
              <span className="min-w-0 flex-1">
                <span className="text-[11.5px] font-bold text-[#E4627B]">{c.tag}</span>
                <span className="mt-0.5 block text-[15.5px] font-bold leading-[1.4] [word-break:keep-all]">{c.title}</span>
                <span className="mt-0.5 block truncate text-[12.5px] text-[#B5B5BA]">{c.summary}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SubShell>
  );
}
