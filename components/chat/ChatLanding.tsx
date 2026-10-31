"use client";

/**
 * 카톡 대화 분석 상세 화면 (10/31) — 예시 대화·예시 차트·근거 목록으로 "무엇을 받는지" 먼저 보여 준다.
 * 원칙: 예시는 '예시'로 표시 · 지어낸 후기 없음 · 결과 보장 표현 없음.
 */
import LoopVideo from "@/components/book/LoopVideo";
import TempChart from "@/components/chat/TempChart";
import { CHAT_PRICE_KRW } from "@/lib/chat/types";

type Line = { me?: boolean; text: string; time?: string; note?: string };

function Bubbles({ lines, name = "그 사람" }: { lines: Line[]; name?: string }) {
  return (
    <div className="rounded-2xl bg-[#b2c7d9] px-3 py-3.5 text-[0.84rem] text-[#191919]">
      {lines.map((l, i) => (
        <div key={i} className={`mt-2 flex flex-col first:mt-0 ${l.me ? "items-end" : "items-start"}`}>
          {!l.me && (i === 0 || lines[i - 1].me) && <span className="mb-0.5 text-[0.7rem] text-[#3a3a3a]">{name}</span>}
          <div className={`flex items-end gap-1.5 ${l.me ? "flex-row-reverse" : ""}`}>
            <p className={`max-w-[15rem] rounded-2xl px-3 py-1.5 ${l.me ? "rounded-tr-md bg-[#fee500]" : "rounded-tl-md bg-white"}`}>{l.text}</p>
            {l.time && <span className="shrink-0 text-[0.62rem] text-[#55606b]">{l.time}</span>}
          </div>
          {l.note && <span className="mt-0.5 text-[0.7rem] font-semibold text-[#b8325a]">↳ {l.note}</span>}
        </div>
      ))}
    </div>
  );
}

const EX_WEEKS = [
  { label: "9/1주", me: 62, partner: 71 },
  { label: "9/8주", me: 66, partner: 69 },
  { label: "9/15주", me: 71, partner: 52 },
  { label: "9/22주", me: 77, partner: 44 },
  { label: "9/29주", me: 80, partner: 38 },
];

const CARDS: {
  no: string;
  q: string;
  tags: string[];
  chat: Line[];
  chart?: boolean;
  bars?: { k: string; me: number; p: number }[];
  head: string;
  evidence: string[];
}[] = [
  {
    no: "01",
    q: "그 사람은 지금\n나를 어떻게 생각할까?",
    tags: ["#먼저연락", "#답장속도", "#질문빈도"],
    chat: [
      { text: "오늘 회사 어땠어?", time: "9/4 21:12", note: "질문 · 먼저 연락" },
      { me: true, text: "완전 정신없었어ㅠ 너는?", time: "21:15" },
      { me: true, text: "이번 주 금요일 뭐해?", time: "9/23 20:40" },
      { text: "글쎄 아직", time: "23:51", note: "3시간 11분 · 답 4자" },
    ],
    chart: true,
    head: "9월 셋째 주부터 그 사람 쪽 온도가 내려가고 있어요. 마음이 없어졌다기보다, 대화를 이어 갈 힘이 줄어든 흐름이에요.",
    evidence: ["주별 온도(그 사람) 71 → 69 → 52 → 44 → 38", "먼저 말 거는 횟수 9/15주 이후 4회 → 1회", "그 사람 답장 시간 평균 12분 → 2시간대"],
  },
  {
    no: "02",
    q: "우리 관계는 앞으로\n어디로 흘러갈까?",
    tags: ["#만나자는말", "#다음에·언젠가", "#대화마무리"],
    chat: [
      { me: true, text: "우리 담에 한강 가자ㅎㅎ", time: "22:40" },
      { text: "ㅇㅇ 언젠가ㅋㅋ", time: "22:52", note: "'언젠가' · 날짜 없음" },
      { text: "나 이제 잘게 내일 봐", time: "23:05", note: "대화 마무리 · 그 사람" },
    ],
    bars: [
      { k: "만나자는 말", me: 4, p: 0 },
      { k: "'다음에·언젠가'", me: 1, p: 6 },
      { k: "대화를 먼저 끝냄", me: 3, p: 8 },
    ],
    head: "마음이 닫힌 건 아니지만, 약속을 정하는 말은 아직 그 사람 쪽에서 나오지 않아요.",
    evidence: ["만나자는 말 — 나 4회 / 그 사람 0회", "'다음에·언젠가' — 그 사람 6회, 날짜가 붙은 건 0회", "대화 마무리 11번 중 8번이 그 사람"],
  },
  {
    no: "03",
    q: "말하지 않고\n숨기는 마음은 뭘까?",
    tags: ["#감정단어", "#밤연락", "#온도차"],
    chat: [
      { me: true, text: "보고 싶다ㅎㅎ", time: "9/6 23:02" },
      { text: "ㅋㅋ 나도 뭐", time: "23:04", note: "감정 단어 피하기" },
      { text: "자? 약은 챙겨 먹었어?", time: "9/9 23:40", note: "밤 · 먼저 챙김" },
    ],
    bars: [
      { k: "감정 단어", me: 19, p: 2 },
      { k: "밤 11시 이후 먼저 연락", me: 3, p: 5 },
    ],
    head: "표현은 무딘데, 챙기는 행동은 남아 있어요. 말보다 행동으로 마음을 내는 쪽일 수 있어요.",
    evidence: ["좋아·보고 싶어 같은 말 — 나 19회 / 그 사람 2회", "밤 11시 이후 먼저 연락 — 그 사람 5회 (모두 9/15 이전)"],
  },
  {
    no: "04",
    q: "그래서 다음엔\n뭐라고 보내야 할까?",
    tags: ["#보내면안되는말", "#다음메시지3개", "#예상반응"],
    chat: [
      { me: true, text: "요즘 바쁜가 보네! 그때 말한 전시 이번 주까지래, 생각나서ㅎㅎ", note: "추천 1 · 부담 낮음 — 답하기 쉬운 정보형" },
      { me: true, text: "우리 요즘 왜 이래? 나만 연락하는 거 같아", note: "보내면 안 되는 말 — 확인 질문은 방어를 부름" },
    ],
    head: "지금 보내면 안 되는 문장과, 부담 낮은 순서로 다음 메시지 3개를 예상 반응과 함께 드려요.",
    evidence: ["다음 메시지 3개 — 의도 · 예상 반응", "1~2주 실천 계획"],
  },
];

export default function ChatLanding({ onFile, onQuiz }: { onFile: () => void; onQuiz: () => void }) {
  const cta = (label: string) => (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={onFile} className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#e46b8a] px-5 text-[1rem] font-bold text-white shadow-[0_0_40px_rgba(228,107,138,0.35)] active:opacity-85">
        {label}
      </button>
      <button type="button" onClick={onQuiz} className="text-[0.84rem] text-white/60 underline underline-offset-4">
        파일 내보내기가 어렵다면 — 캡처로 분석하기
      </button>
    </div>
  );
  return (
    <div className="bg-[#120e10] text-white">
      {/* 히어로 */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          <LoopVideo src="/book/v3/w-phone.mp4" poster="/book/v3/w-phone.webp" className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#120e10]/30 via-[#120e10]/40 to-[#120e10]" />
        </div>
        <div className="relative mx-auto max-w-[560px] px-5 pb-12 pt-32">
          <p className="text-[0.78rem] tracking-[0.25em] text-[#e8b04a]">月下緣 · 월화의 대화 읽기</p>
          <h1 className="font-display mt-4 text-[2rem] font-bold leading-[1.35]">
            그 사람 마음,
            <br />
            대화에 이미 남아 있어요.
          </h1>
          <p className="mt-4 text-[1rem] leading-[1.85] text-white/80">
            두 사람이 나눈 카톡을 월화가 처음부터 끝까지 읽고,
            <br />
            말투·답장 속도·대화의 흐름을 <b className="text-white">숫자와 문장</b>으로 짚어 드려요.
          </p>
          <div className="mt-7">{cta("내 카톡으로 무료 분석 시작")}</div>
          <a href="/chat/sample" className="mt-3 block text-center text-[0.84rem] text-white/70 underline underline-offset-4">결과 리포트 예시 보기</a>
          <p className="mt-3 text-center text-[0.76rem] text-white/50">파일을 올리면 숫자 분석은 바로 무료 · 해석 리포트 {CHAT_PRICE_KRW.toLocaleString()}원 · 구독 없음</p>
        </div>
      </section>

      {/* 무엇을 보는지 */}
      <section className="mx-auto max-w-[560px] px-5 pt-6">
        <p className="text-[0.74rem] font-semibold tracking-[0.2em] text-[#e46b8a]">WHAT WE READ</p>
        <h2 className="font-display mt-2 text-[1.45rem] font-bold leading-snug">
          대화에는 마음이 남아요.
          <br />
          말보다 흐름에서 더 잘 보일 때도 있어요.
        </h2>
      </section>

      {CARDS.map((c) => (
        <section key={c.no} className="mx-auto mt-8 max-w-[560px] px-5">
          <div className="rounded-3xl bg-[#1d181b] px-5 py-6">
            <p className="text-[0.8rem] font-bold text-[#e46b8a]">{c.no}</p>
            <h3 className="font-display mt-1 whitespace-pre-line text-[1.3rem] font-bold leading-snug">{c.q}</h3>
            <p className="mt-2 text-[0.76rem] text-white/45">{c.tags.join(" ")}</p>
            <div className="mt-4">
              <Bubbles lines={c.chat} />
            </div>
            <div className="mt-4 rounded-2xl bg-[#262024] px-4 py-4 text-white">
              {c.chart ? (
                <TempChart weeks={EX_WEEKS} example />
              ) : c.bars ? (
                <div className="flex flex-col gap-3">
                  {c.bars.map((b) => {
                    const max = Math.max(b.me, b.p, 1);
                    return (
                      <div key={b.k}>
                        <p className="text-[0.76rem] text-white/70">{b.k}</p>
                        <div className="mt-1 flex items-center gap-2 text-[0.72rem]">
                          <span className="w-12 text-white/60">나</span>
                          <div className="h-2.5 flex-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#e8b04a]" style={{ width: `${(b.me / max) * 100}%` }} /></div>
                          <span className="w-6 text-right tabular-nums">{b.me}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[0.72rem]">
                          <span className="w-12 text-white/60">그 사람</span>
                          <div className="h-2.5 flex-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-[#e46b8a]" style={{ width: `${(b.p / max) * 100}%` }} /></div>
                          <span className="w-6 text-right tabular-nums">{b.p}</span>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-right text-[0.68rem] text-white/40">예시</p>
                </div>
              ) : (
                <p className="text-[0.84rem] text-white/70">결과 화면에서 실제 문장으로 받아요 · 예시</p>
              )}
            </div>
            <p className="mt-4 text-[1rem] font-semibold leading-[1.75]">{c.head}</p>
            <div className="mt-3 rounded-2xl border border-white/10 px-4 py-3">
              <p className="text-[0.72rem] font-semibold text-white/50">근거</p>
              <ul className="mt-1 flex flex-col gap-1 text-[0.82rem] text-white/80">
                {c.evidence.map((e) => (
                  <li key={e}>
                    <span className="mr-1.5 text-[#e46b8a]">[대화]</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {/* 3단계 */}
      <section className="mx-auto mt-14 max-w-[560px] px-5">
        <h2 className="font-display text-[1.35rem] font-bold">딱 3단계면 끝</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {[
            ["대화 내보내기", "카톡 대화방 → 메뉴 → 대화 내보내기 (텍스트만). 인스타 DM 파일도 돼요."],
            ["파일 올리고 무료 숫자 분석", "주별 대화 온도, 먼저 연락한 횟수, 답장 시간 변화를 바로 보여 드려요. 이 단계는 무료예요."],
            ["해석 리포트 받기", "결제하면 1~2분 안에 월화가 대화 전체를 읽고 해석과 다음 메시지까지 정리해 드려요."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-2xl bg-[#1d181b] px-4 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e46b8a] text-[0.9rem] font-bold">{i + 1}</span>
              <span className="min-w-0">
                <b className="block text-[0.98rem]">{t}</b>
                <span className="mt-0.5 block text-[0.84rem] leading-[1.7] text-white/65">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 자주 묻는 질문 */}
      <section className="mx-auto mt-14 max-w-[560px] px-5">
        <h2 className="font-display text-[1.35rem] font-bold">자주 묻는 질문</h2>
        <div className="mt-4 flex flex-col gap-2">
          {[
            ["내 대화가 밖으로 새어 나가진 않나요?", "무료 숫자 분석은 내 휴대폰 안에서만 계산하고 서버로 보내지 않아요. 결제하면 리포트를 만들 때만 대화를 보내고, 리포트가 완성되면 원문은 바로 삭제해요. 결제하지 않으면 48시간 안에 삭제돼요."],
            ["상대방이 분석한 걸 알 수 있나요?", "아니요. 상대에게 어떤 알림이나 메시지도 가지 않아요. 내가 올린 파일만 읽어요."],
            ["상대 이름이 결과에 나오나요?", "아니요. 대화 속 이름은 정해 주신 호칭(예: 그 사람)으로 바꿔서 읽고, 결과에도 호칭만 써요."],
            ["대화는 얼마나 있어야 하나요?", "개수 제한은 없지만 30개보다 적으면 분석이 얕아질 수 있어요. 두 사람이 나눈 1:1 대화방이 가장 정확해요."],
            ["파일 내보내기가 어려워요.", "캡처(최대 10장)로도 분석할 수 있어요. 다만 시간 정보가 없어 숫자 분석은 줄어들어요."],
            ["재회나 연애가 꼭 되나요?", "결과를 보장하지 않아요. 대화에서 보이는 패턴과, 지금 할 수 있는 가장 부담 낮은 다음 걸음을 정리해 드려요."],
            ["환불되나요?", "리포트를 열어 보기 전이면 7일 안에 전액 환불돼요. 만 14세 미만은 결제할 수 없고, 미성년자는 보호자 동의가 필요해요."],
          ].map(([q, a]) => (
            <details key={q} className="rounded-2xl bg-[#1d181b] px-4 py-3.5">
              <summary className="cursor-pointer list-none text-[0.92rem] font-semibold">{q}</summary>
              <p className="mt-2 text-[0.84rem] leading-[1.8] text-white/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[560px] px-5 pb-28 pt-12">
        <a href="/chat/sample" className="mb-4 flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 text-[0.92rem] text-white/85">
          결과 리포트 예시 먼저 보기
        </a>
        {cta("그 사람 마음 확인하기")}
      </section>
    </div>
  );
}
