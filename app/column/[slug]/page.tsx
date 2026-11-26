import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SubShell from "@/components/home4/SubShell";
import { COLUMNS, columnBySlug, colPal } from "@/lib/home/columns";

/** 11/26 운영자 요청: 칼럼 글 화면 — 2차 디자인. 새 홈 확인 전까지 검색 노출 차단. */
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
  const p = colPal(c.no);
  const others = COLUMNS.filter((x) => x.slug !== c.slug).slice(0, 4);
  return (
    <SubShell title="월화의 칼럼" active="column" back="/column">
      <article className="px-4 pt-1">
        <header className="relative overflow-hidden rounded-[26px] px-5 pb-6 pt-5" style={{ background: p.bg }}>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-extrabold" style={{ color: p.ink }}>
            {c.tag}
          </span>
          <h2 className="m-0 mt-3 max-w-[68%] text-[22px] font-extrabold leading-[1.4] tracking-[-0.02em] text-[#2B2326] [word-break:keep-all]">{c.title}</h2>
          <p className="m-0 mt-2 text-[12.5px] font-bold text-[#6a5a5e]">월화의 칼럼 · {c.min}분 읽기</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.img} alt="" aria-hidden className="absolute -bottom-2 -right-1 h-[140px] w-[140px] object-contain mix-blend-multiply" />
        </header>

        <div className="relative mt-5 rounded-2xl border-l-4 bg-[#18181B] px-4 py-3.5" style={{ borderColor: p.ink }}>
          <p className="font-display m-0 text-[17px] leading-[1.6] text-[#F5F5F5] [word-break:keep-all]">“{c.summary}”</p>
        </div>

        {c.sections.map((s, i) => (
          <section key={s.h} className="mt-8">
            <p className="m-0 text-[12px] font-extrabold tracking-[0.1em]" style={{ color: p.bg }}>
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="m-0 mt-1 text-[18.5px] font-extrabold leading-[1.4] [word-break:keep-all]">{s.h}</h3>
            {s.p.map((t, k) => (
              <p key={k} className="m-0 mt-3 text-[15.5px] leading-[1.9] text-[#E7E7EA] [word-break:keep-all]">
                {t}
              </p>
            ))}
            {s.tip && (
              <div className="mt-4 flex items-center gap-3 rounded-[20px] px-4 py-3.5" style={{ background: p.bg }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wolhwa/doodle/bunny_point.webp" alt="" aria-hidden className="h-12 w-12 shrink-0 object-contain mix-blend-multiply" />
                <span>
                  <span className="block text-[11.5px] font-extrabold" style={{ color: p.ink }}>
                    월화의 한 줄
                  </span>
                  <span className="mt-0.5 block text-[14.5px] font-bold leading-[1.55] text-[#2B2326] [word-break:keep-all]">{s.tip}</span>
                </span>
              </div>
            )}
          </section>
        ))}

        <Link href={c.cta.h} className="relative mt-10 block overflow-hidden rounded-[24px] px-5 py-5" style={{ background: "linear-gradient(150deg,#5A1627,#8E2338)" }}>
          <span className="block text-[12.5px] text-[#F3B6C2]">{c.cta.d}</span>
          <span className="mt-1 block max-w-[70%] text-[18px] font-extrabold leading-[1.4] text-white [word-break:keep-all]">{c.cta.t}</span>
          <span className="mt-3 inline-block rounded-full bg-[#FEE500] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#191919]">무료로 시작 ›</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wolhwa/doodle/bunny_search.webp" alt="" aria-hidden className="absolute bottom-2 right-3 h-[92px] w-[92px] rounded-full bg-white object-cover" />
        </Link>
      </article>

      <section className="px-4 pt-10">
        <h3 className="m-0 text-[17px] font-extrabold">이어서 읽기</h3>
        <div className="scrollbar-none -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4">
          {others.map((o) => {
            const q = colPal(o.no);
            return (
              <Link key={o.slug} href={`/column/${o.slug}`} className="relative flex h-[180px] w-[150px] shrink-0 flex-col overflow-hidden rounded-[20px] p-3" style={{ background: q.bg }}>
                <span className="w-fit rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-extrabold" style={{ color: q.ink }}>
                  {o.tag}
                </span>
                <span className="mt-2 text-[14px] font-extrabold leading-[1.38] text-[#2B2326] [word-break:keep-all]">{o.title}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.img} alt="" aria-hidden loading="lazy" className="absolute -bottom-1 -right-1 h-[78px] w-[78px] object-contain mix-blend-multiply" />
              </Link>
            );
          })}
        </div>
        <Link href="/column" className="mt-4 block rounded-xl border border-[#2A2A2E] py-3 text-center text-[14px] text-[#B5B5BA]">
          칼럼 전체 보기
        </Link>
      </section>
    </SubShell>
  );
}
