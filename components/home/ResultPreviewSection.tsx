import Reveal from "@/components/home/Reveal";
import HomeImage from "@/components/home/HomeImage";

/**
 * SECTION 08+09 — 결과 대표 비주얼 + teaser 목록 + "누구에게나 같은 결과가 아닙니다"
 * teaser 텍스트만 존재 — 유료 결과 본문은 DOM에 넣지 않음.
 * 카드 명칭은 실제 RitualResult 구성과 일치.
 */
const RESULT_CARDS = [
  { no: "01", title: "월화의 첫 편지" },
  { no: "02", title: "두 사람의 관계 이야기" },
  { no: "03", title: "지금 내 마음 들여다보기" },
  { no: "04", title: "반복되어 온 흐름" },
  { no: "05", title: "내가 정말 원하는 것" },
  { no: "06", title: "지금 내가 바꿀 수 있는 것" },
  { no: "07", title: "나만의 붉은 실 리추얼" },
  { no: "08", title: "24시간 · 7일 · 21일 가이드" },
];

export default function ResultPreviewSection({
  resultCards,
}: {
  resultCards: string | null;
}) {
  return (
    <section className="py-20">
      <div className="px-6">
        <Reveal>
          <h2 className="font-display text-center text-[1.4rem] font-semibold leading-snug text-ivory">
            내 이야기의 전체 결과에서는
          </h2>
        </Reveal>
      </div>

      <div className="px-6">
        <Reveal>
          <p className="mx-auto mt-6 max-w-sm text-center text-[0.88rem] font-light leading-[2.1] text-ivory-dim">
            왜 아직 이 사람이 마음에 남아 있는지,
            <br />
            지금 연락하는 것이 나은지,
            <br />두 사람 사이에서 반복된 흐름,
            <br />
            다시 만난다면 달라져야 할 것,
            <br />
            지금 내가 할 수 있는 행동,
            <br />
            그리고 24시간 · 7일 · 21일 가이드까지.
          </p>
        </Reveal>
      </div>

      {/* 결과를 갖고 싶게 만드는 대표 비주얼 */}
      <Reveal className="mt-10">
        <HomeImage
          src={resultCards}
          alt="붉은 실 위에 펼쳐진 월화의 결과 카드"
          aspect="aspect-[2/3]"
          sizes="(max-width: 520px) 100vw, 520px"
          bleed
          sceneEyebrow="당신만의 결과"
          sceneTitle={"관계에서 반복된 흐름부터\n지금 할 수 있는 일까지"}
        />
      </Reveal>

      <div className="px-6">
        <div className="mx-auto mt-10 max-w-sm">
          <ul className="divide-y divide-gold-dim/15 border-y border-gold-dim/20">
            {RESULT_CARDS.map((c) => (
              <li key={c.no} className="flex items-baseline gap-4 py-3.5">
                <span className="font-display text-[0.7rem] tracking-widest text-gold/70">
                  {c.no}
                </span>
                <span className="text-[0.93rem] font-light text-ivory">
                  {c.title}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Reveal>
          <p className="font-display mt-14 text-center text-[1.05rem] font-medium text-ivory">
            누구에게나 같은 결과가 아닙니다.
          </p>
          <p className="mt-6 text-center text-[0.9rem] font-light leading-[2.1] text-ivory-dim">
            관계가 어떻게 시작됐는지,
            <br />
            얼마나 만났는지,
            <br />
            마지막에 어떤 말을 나눴는지,
            <br />
            지금 무엇이 가장 힘든지,
            <br />
            그리고 내가 정말 원하는 게 무엇인지까지.
          </p>
          <p className="mt-5 text-center text-[0.92rem] font-light leading-[2] text-ivory">
            당신이 들려준 이야기에서
            <br />
            결과가 시작됩니다.
          </p>
        </Reveal>

        {/* 실제 preview UI의 visual language를 따른 예시 카드 (개인정보·유료 본문 없음) */}
        <Reveal className="mx-auto mt-10 max-w-[300px]">
          <div className="flex flex-col gap-3">
            {["월화가 먼저 전하는 말", "01 월화의 첫 편지"].map((label, i) => (
              <div
                key={i}
                className="rounded-xl border border-gold-dim/25 bg-ink-soft px-4 py-4"
              >
                <p className="text-[0.6rem] tracking-[0.2em] text-gold/70">
                  {label}
                </p>
                <div className="mt-2.5 flex flex-col gap-1.5" aria-hidden>
                  <span className="block h-1.5 w-full rounded-full bg-ivory/15" />
                  <span className="block h-1.5 w-10/12 rounded-full bg-ivory/15" />
                  <span className="block h-1.5 w-7/12 rounded-full bg-ivory/8" />
                </div>
              </div>
            ))}
            <p className="text-center text-[0.58rem] text-ivory-dim/60">
              화면 예시
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
