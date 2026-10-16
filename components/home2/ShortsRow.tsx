/** 09. 월화가 짧게 전하는 관계 이야기 — 기존 숏폼 5편 (눌러야 재생 · 소리는 직접 켤 때만) */
import ShortCard from "@/components/home/ShortCard";
import { SHORTS } from "./media";

export default function ShortsRow() {
  return (
    <section className="night py-16 md:py-24">
      <div className="mx-auto max-w-[1120px] px-5 md:px-8">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">월화의 밤 이야기</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory md:text-[2rem]">월화가 짧게 전하는 관계 이야기</h2>
      </div>
      <div className="scrollbar-none mx-auto mt-8 flex max-w-[1120px] snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:px-8">
        {SHORTS.map((s) => (
          <div key={s.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] md:w-[19%]">
            <ShortCard title={s.title} src={s.src} poster={s.poster} />
          </div>
        ))}
      </div>
    </section>
  );
}
