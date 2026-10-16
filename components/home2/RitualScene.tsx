/** 06. 리추얼을 그림으로 — 적기 · 나누기 · 접어 두기 (예시 · 실제 결과 part_07~09 형식) */
import Image from "next/image";
import { V2 } from "./media";

const STEPS = [
  { img: V2.ritual1, t: "보내고 싶은 말을 끝까지 적기", d: "휴대폰 대신 종이에, 하고 싶은 말을 한 번 다 꺼내요." },
  { img: V2.ritual2, t: "있었던 일과 내 감정을 나누기", d: "적은 문장에 밑줄을 그어, 사실과 마음을 따로 봐요." },
  { img: V2.ritual3, t: "접어 두고 오늘 할 일 하나", d: "봉투에 넣어 묶고, 오늘 지킬 행동 하나만 남겨요." },
];

export default function RitualScene() {
  return (
    <section className="night px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">나만의 리추얼</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory [text-wrap:balance] md:text-[2rem]">
          보내고 싶은 밤, 휴대폰 대신 펼치는 순서
        </h2>
        <p className="mt-3 max-w-[38rem] text-[0.98rem] leading-[1.8] text-ivory-dim">
          준비물을 두고 짧은 순서를 따라 마음과 행동을 정리하는 시간이에요. 전체 구성에는 내 사연에 맞춘 리추얼의 의미 · 준비물 · 순서가 들어가요.
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.t} className="overflow-hidden rounded-[20px] bg-[#2a2528]">
              <div className="relative aspect-[4/5] w-full">
                <Image src={s.img} alt={s.t} fill sizes="(min-width: 768px) 360px, 92vw" className="object-cover" />
                <span className="font-display absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#201d20]/80 text-[1rem] text-gold">
                  {i + 1}
                </span>
              </div>
              <div className="px-5 py-4">
                <p className="font-display text-[1.08rem] font-bold text-ivory">{s.t}</p>
                <p className="mt-1 text-[0.9rem] leading-[1.7] text-ivory-dim">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="font-display mt-6 rounded-2xl border border-gold/40 px-5 py-4 text-center text-[1.05rem] leading-[1.7] text-ivory">
          마친 뒤 적는 한 줄 · “오늘은 보내지 않고, 내 하루를 지켰다.”
        </p>
        <p className="mt-2 text-center text-[0.78rem] text-ivory-dim">예시 · 실제 리추얼의 이름과 순서는 내 사연에 따라 달라져요</p>
      </div>
    </section>
  );
}
