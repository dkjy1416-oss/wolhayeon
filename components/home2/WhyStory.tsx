/**
 * 04. 왜 사연부터 묻는가 — 생년월일 풀이와의 차이, 재회에도 여러 상황이 있다는 것.
 * 다른 서비스가 사연을 받지 않는다고 단정하지 않고, 성공률·정확도 우위를 주장하지 않는다.
 * 데이터베이스 = 내부 작성 '재회 상황별 대응 가이드'(lib/situation-guide.ts) — 전체 결과 생성에 실제로 연결돼 있다 (지시문 3.3).
 */
import { SITUATIONS } from "./content";

export default function WhyStory() {
  return (
    <section className="border-y border-gold-dim bg-[#f1ebe4] px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        <p className="text-[0.8rem] tracking-[0.14em] text-gold">왜 사연부터 묻나요</p>
        <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory [text-wrap:balance] md:text-[2rem]">
          같은 이별이라도, 다시 다가가는 방법은 다릅니다.
        </h2>
        <div className="mt-5 grid gap-8 md:grid-cols-[1fr_1fr] md:gap-12">
          <div className="min-w-0">
            <p className="max-w-[36rem] text-[1rem] leading-[1.85] text-ivory">
              생년월일을 중심으로 운세와 궁합을 풀이하는 일반적인 사주와 달리, 월하연은 두 사람이 실제로 겪은 이야기에서 시작합니다. 왜 헤어졌는지, 마지막에
              어떤 말을 주고받았는지, 지금 연락은 가능한지.
            </p>
            <p className="mt-3 max-w-[36rem] text-[1rem] leading-[1.85] text-ivory">
              월하연은 <b className="font-semibold">재회 상황별 대응 가이드를 정리한 데이터베이스</b>와 당신이 들려준 사연을 함께 활용합니다. 이별의 원인,
              마지막 대화, 현재 연락 상태, 반복된 갈등을 살펴 지금의 상황에 맞는 관계 읽기와 행동 가이드를 작성합니다.
            </p>
            <p className="mt-2 text-[0.82rem] leading-[1.7] text-ivory-dim">
              데이터베이스는 월하연이 직접 정리한 10가지 상황별 가이드예요(싸우고 끝났을 때 · 매달린 뒤 답이 끊겼을 때 · 차단됐을 때 등). 다른 고객의 사연은 담지 않아요.
            </p>
            <p className="font-display mt-5 text-[1.15rem] text-burgundy">생년월일보다, 두 사람이 겪은 이야기를 먼저 봅니다.</p>
            <p className="mt-3 text-[0.84rem] leading-[1.7] text-ivory-dim">
              상대의 속마음이나 재회 결과를 확정하지 않아요.
            </p>

            {/* 입력 → 기준 → 결과 일부 */}
            <div className="mt-7 grid gap-2 text-[0.92rem] leading-[1.65]">
              {[
                ["내가 입력한 사실", "긴 사과를 보냈고, ‘응 잘 지내’라는 답 뒤로 연락이 없어요."],
                ["먼저 살필 기준", "추가 연락이 부담을 키우는지, 멈출 기준이 무엇인지"],
                ["결과에 담기는 것", "2주 동안 다시 보내지 않기 · 그 뒤 연락을 고려할 조건 · 보낸다면 두 줄 이내의 문장"],
              ].map(([k, v], n) => (
                <div key={k} className="flex gap-3 rounded-xl border border-gold-dim bg-ink-soft px-4 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-burgundy text-[0.75rem] font-semibold text-[#fbf7f2]">{n + 1}</span>
                  <p className="min-w-0">
                    <b className="block text-[0.8rem] font-semibold text-gold">{k}</b>
                    <span className="text-ivory">{v}</span>
                  </p>
                </div>
              ))}
              <p className="text-[0.76rem] text-ivory-dim">가상 사연 예시</p>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[0.86rem] font-semibold text-ivory">재회에도 여러 상황이 있어요</p>
            <ul className="mt-3 divide-y divide-gold-dim overflow-hidden rounded-2xl border border-gold-dim bg-ink-soft">
              {SITUATIONS.map(([s, d]) => (
                <li key={s} className="px-5 py-4">
                  <p className="text-[0.96rem] font-semibold text-ivory">{s}</p>
                  <p className="mt-1 text-[0.9rem] leading-[1.65] text-ivory-dim">{d}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.92rem] leading-[1.75] text-ivory">
              ‘연락해 보세요’라는 같은 답을 반복하기보다, 내 상황에서 무엇을 먼저 확인하고 어떻게 행동할지 정리합니다.
            </p>
            <p className="mt-1 text-[0.78rem] text-ivory-dim">한 사람을 하나의 유형에 고정하지 않고, 원인·연락 상태·반복 패턴을 함께 봐요.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
