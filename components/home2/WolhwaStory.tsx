/**
 * 03. 월화가 말풍선으로 이끄는 장면 3컷 — 왜 사연부터 묻는지, 무엇을 써 주는지.
 * 재회·상대 마음을 약속하지 않는다. 데이터베이스 = 월하연이 정리한 상황별 대응 가이드(lib/situation-guide.ts).
 */
import Image from "next/image";
import { V2 } from "./media";

const PANELS = [
  {
    img: V2.listen,
    alt: "편지를 읽으며 귀 기울이는 월화",
    say: "왜 헤어졌는지, 마지막에 무슨 말을 나눴는지부터 들려주세요.",
    note: "생년월일보다, 두 사람이 실제로 겪은 이야기를 먼저 봐요.",
  },
  {
    img: V2.write,
    alt: "붓으로 편지를 쓰는 월화",
    say: "같은 이별이라도, 다시 다가가는 방법은 달라요.",
    note: "재회 상황별 대응 가이드와 당신의 사연을 함께 보고, 지금 상황에 맞는 편지와 가이드를 써요.",
  },
  {
    img: V2.thread,
    alt: "붉은 실을 손에 든 월화",
    say: "어디서부터 엉켰는지 보이면, 오늘 할 일이 보여요.",
    note: "상대의 속마음이나 재회를 장담하지 않아요. 대신 내가 지금 무엇을 하고, 무엇을 멈출지 정리해요.",
  },
];

export default function WolhwaStory() {
  return (
    <section className="px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">월화가 사연을 읽는 방법</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory [text-wrap:balance] md:text-[2rem]">
          당신의 이야기에서 시작합니다
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-6">
          {PANELS.map((p, i) => (
            <figure key={p.img} className="shadow-paper overflow-hidden rounded-[22px] border border-gold-dim bg-ink-soft">
              <div className="relative aspect-[3/4] w-full">
                <Image src={p.img} alt={p.alt} fill sizes="(min-width: 768px) 360px, 92vw" className="object-cover" />
                <p
                  className={`font-display absolute ${i % 2 ? "right-3" : "left-3"} top-3 max-w-[82%] rounded-2xl ${i % 2 ? "rounded-tr-sm" : "rounded-tl-sm"} bg-[#fbf7f1]/95 px-4 py-3 text-[0.98rem] leading-[1.55] text-[#312b2d] shadow-[0_8px_24px_rgba(0,0,0,0.35)]`}
                >
                  {p.say}
                </p>
              </div>
              <figcaption className="px-5 py-4 text-[0.92rem] leading-[1.7] text-ivory-dim">{p.note}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-4 text-[0.8rem] leading-[1.7] text-ivory-dim">
          상황별 대응 가이드는 월하연이 직접 정리한 10가지 상황(싸우고 끝났을 때 · 매달린 뒤 답이 끊겼을 때 · 차단됐을 때 등)이에요. 다른 고객의 사연은 담지 않아요.
        </p>
      </div>
    </section>
  );
}
