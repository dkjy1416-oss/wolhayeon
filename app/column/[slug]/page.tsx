import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SubShell from "@/components/home4/SubShell";
import { COLUMNS, columnBySlug } from "@/lib/home/columns";

/** 11/26 운영자 요청: 칼럼 글 화면. 새 홈 확인 전까지 검색 노출 차단. */
export function generateStaticParams() {
  return COLUMNS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = columnBySlug((await params).slug);
  return {
    title: c ? `${c.title} | 월화의 칼럼` : "월화의 칼럼",
    description: c?.summary,
    robots: { index: false, follow: false },
  };
}

export default async function ColumnPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = columnBySlug((await params).slug);
  if (!c) notFound();
  const others = COLUMNS.filter((x) => x.slug !== c.slug).slice(0, 4);
  return (
    <SubShell title="칼럼" active="column" back="/column">
      <article className="px-4 pt-2">
        <div className="flex h-[200px] items-center justify-center rounded-[24px] bg-[#FFE6EC]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.img} alt="" aria-hidden className="h-[176px] w-[176px] rounded-3xl bg-white object-cover" />
        </div>
        <p className="m-0 mt-5 text-[13px] font-bold text-[#E4627B]">{c.tag}</p>
        <h2 className="m-0 mt-1 text-[23px] font-extrabold leading-[1.4] tracking-[-0.02em] [word-break:keep-all]">{c.title}</h2>
        <p className="m-0 mt-2 text-[12.5px] text-[#8f8f96]">월화의 칼럼 · {c.min}분 읽기</p>
        <p className="m-0 mt-4 rounded-2xl bg-[#18181B] px-4 py-3 text-[15px] leading-[1.7] text-[#F3D7DD] [word-break:keep-all]">{c.summary}</p>
        {c.sections.map((s) => (
          <section key={s.h} className="mt-7">
            <h3 className="m-0 text-[18px] font-extrabold leading-[1.4] [word-break:keep-all]">{s.h}</h3>
            {s.p.map((p, i) => (
              <p key={i} className="m-0 mt-2.5 text-[15.5px] leading-[1.85] text-[#E7E7EA] [word-break:keep-all]">
                {p}
              </p>
            ))}
            {s.tip && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-[#FFFBF5] px-4 py-3 text-[#2B2326]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wolhwa/doodle/bunny_point.webp" alt="" aria-hidden className="h-10 w-10 shrink-0 rounded-full bg-white object-cover" />
                <span>
                  <span className="block text-[12px] font-bold text-[#B3263F]">월화의 한 줄</span>
                  <span className="block text-[14.5px] leading-[1.6] [word-break:keep-all]">{s.tip}</span>
                </span>
              </div>
            )}
          </section>
        ))}
        <Link href={c.cta.h} className="mt-8 flex items-center gap-3 rounded-[22px] bg-[#7A1E31] px-4 py-4 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wolhwa/doodle/bunny_search.webp" alt="" aria-hidden className="h-[58px] w-[58px] shrink-0 rounded-2xl bg-white object-cover" />
          <span className="flex-1">
            <span className="block text-[12px] text-[#F3B6C2]">{c.cta.d}</span>
            <span className="block text-[16px] font-extrabold [word-break:keep-all]">{c.cta.t} ›</span>
          </span>
        </Link>
      </article>
      <section className="px-4 pt-9">
        <h3 className="m-0 text-[17px] font-extrabold">다른 칼럼</h3>
        <ul className="m-0 mt-2 list-none divide-y divide-[#2A2A2E] p-0">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/column/${o.slug}`} className="flex items-center gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.img} alt="" aria-hidden loading="lazy" className="h-[60px] w-[60px] shrink-0 rounded-xl bg-white object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="text-[11.5px] font-bold text-[#E4627B]">{o.tag}</span>
                  <span className="block text-[14.5px] font-bold leading-[1.4] [word-break:keep-all]">{o.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/column" className="mt-3 block rounded-xl border border-[#2A2A2E] py-3 text-center text-[14px] text-[#B5B5BA]">
          칼럼 전체 보기
        </Link>
      </section>
    </SubShell>
  );
}
