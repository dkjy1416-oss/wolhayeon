"use client";

/**
 * 11/26 운영자 요청: 무료 테스트 3종 — MBTI 애정 궁합 · 생년월일 애정 점수 · 띠 궁합.
 * 입력하면 바로 결과가 나오는 재미용 테스트. 상대 마음이나 재회를 장담하는 말은 쓰지 않는다.
 * 계산은 모두 화면 안에서 하고, 입력값은 어디에도 저장하지 않는다.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { FREE_TESTS } from "@/lib/home/free-tests";

const D = "/wolhwa/doodle";
const CARD = "rounded-[26px] bg-[#FFFBF5] text-[#2B2326]";
const BTN = "block w-full rounded-2xl bg-[#B3263F] py-[15px] text-center text-[16px] font-extrabold text-white disabled:opacity-40";
const BTN_V = "block w-full rounded-2xl bg-[#5B45B0] py-[15px] text-center text-[16px] font-extrabold text-white disabled:opacity-40";

/* ---------- 공통 ---------- */
function useCount(target: number | null) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (target === null) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100);
      setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    /* 화면이 백그라운드라 애니메이션이 멈춰도 최종 점수는 꼭 보이게 */
    const done = window.setTimeout(() => setN(target), 1300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [target]);
  return n;
}

function Ring({ score, color }: { score: number; color: string }) {
  const n = useCount(score);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-[132px] w-[132px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#F1E4E0" strokeWidth="11" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - n / 100)} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[38px] font-bold leading-none" style={{ color }}>
          {n}
        </span>
        <span className="mt-1 text-[12px] text-[#8a7a7e]">/ 100점</span>
      </span>
    </div>
  );
}

function Intro({ img, title, sub, bg }: { img: string; title: string; sub: string; bg: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] px-4 py-3" style={{ background: bg }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" aria-hidden className="h-[84px] w-[84px] shrink-0 rounded-2xl bg-white object-cover" />
      <span>
        <span className="font-display block text-[21px] font-bold leading-[1.3] text-[#2B2326]">{title}</span>
        <span className="mt-1 block text-[13px] leading-[1.5] text-[#5a4a4e] [word-break:keep-all]">{sub}</span>
      </span>
    </div>
  );
}

type Result = { score: number; label: string; img: string; lines: Array<[string, string]>; tip: string; note: string; head: string };

function ResultView({ r, color, onAgain, self }: { r: Result; color: string; onAgain: () => void; self: string }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className={`${CARD} px-5 pb-6 pt-5 text-center`}>
        <p className="m-0 text-[13px] font-bold text-[#8a7a7e]">{r.head}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r.img} alt="" aria-hidden className="mx-auto mt-2 h-[120px] w-[120px] object-contain" />
        <Ring score={r.score} color={color} />
        <p className="font-display m-0 mt-3 text-[22px] font-bold" style={{ color }}>
          {r.label}
        </p>
        <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0 text-left">
          {r.lines.map(([k, v]) => (
            <li key={k} className="rounded-2xl bg-[#F7EFEA] px-4 py-3">
              <span className="block text-[12px] font-bold" style={{ color }}>
                {k}
              </span>
              <span className="mt-0.5 block text-[14.5px] leading-[1.6] [word-break:keep-all]">{v}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-dashed border-[#E4B7C0] px-4 py-3 text-left">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${D}/bunny_point.webp`} alt="" aria-hidden className="h-11 w-11 shrink-0 rounded-full bg-white object-cover" />
          <span>
            <span className="block text-[12px] font-bold text-[#B3263F]">월화의 한 줄</span>
            <span className="block text-[14px] leading-[1.6] [word-break:keep-all]">{r.tip}</span>
          </span>
        </div>
        <p className="m-0 mt-3 text-[11.5px] leading-[1.6] text-[#8a7a7e] [word-break:keep-all]">{r.note}</p>
        <button type="button" onClick={onAgain} className="mt-4 text-[14px] font-bold text-[#B3263F] underline underline-offset-4">
          다시 해 보기
        </button>
      </div>

      <Link href="/apply" className="flex items-center gap-3 rounded-[22px] bg-[#7A1E31] px-4 py-4 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${D}/bunny_search.webp`} alt="" aria-hidden className="h-[60px] w-[60px] shrink-0 rounded-2xl bg-white object-cover" />
        <span className="flex-1">
          <span className="block text-[12px] text-[#F3B6C2]">점수 말고, 진짜 우리 이야기는?</span>
          <span className="block text-[16px] font-extrabold">내 사연으로 무료 미리보기 ›</span>
        </span>
      </Link>
      <Link href="/chat" className="flex items-center gap-3 rounded-[22px] border border-[#2A2A2E] bg-[#18181B] px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${D}/bunny_laptop.webp`} alt="" aria-hidden className="h-[60px] w-[60px] shrink-0 rounded-2xl bg-white object-cover" />
        <span className="flex-1">
          <span className="block text-[12px] text-[#B5B5BA]">그 사람과 나눈 대화가 있다면</span>
          <span className="block text-[16px] font-extrabold">카톡 숫자 분석 무료 ›</span>
        </span>
      </Link>
      <OtherTests self={self} />
    </div>
  );
}

export function OtherTests({ self }: { self: string }) {
  return (
    <div className="mt-2">
      <p className="m-0 mb-2 text-[15px] font-extrabold text-[#F5F5F5]">다른 무료 테스트</p>
      <div className="flex flex-col gap-2">
        {FREE_TESTS.filter((t) => t.id !== self).map((t) => (
          <Link key={t.id} href={t.href} className="flex h-[76px] items-center gap-3 overflow-hidden rounded-[18px] pl-4" style={{ background: t.bg }}>
            <span className="flex-1">
              <span className="block text-[16px] font-extrabold text-[#2B2326]">{t.title}</span>
              <span className="block text-[12.5px] text-[#5a4a4e]">{t.sub}</span>
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.img} alt="" aria-hidden className="h-full w-[76px] bg-white object-cover" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------- 1. MBTI 애정 궁합 ---------- */
const TYPES = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"];
const GOLD = new Set(["INFP-ENFJ", "INFP-ENTJ", "ENFP-INFJ", "ENFP-INTJ", "INFJ-ENTP", "INTJ-ENTP", "INTP-ENTJ", "INTP-ESTJ", "ISFP-ENFJ", "ISFP-ESFJ", "ISFP-ESTJ", "ESFP-ISFJ", "ESFP-ISTJ", "ISTP-ESFJ", "ISTP-ESTJ", "ESTP-ISFJ", "ESTP-ISTJ"]);

function mbtiResult(a: string, b: string): Result {
  const ei = a[0] !== b[0];
  const sn = a[1] === b[1];
  const tf = a[2] !== b[2];
  const jp = a[3] !== b[3];
  let s = 62 + (sn ? 10 : 0) + (ei ? 6 : 3) + (tf ? 5 : 3) + (jp ? 4 : 2);
  if (GOLD.has(`${a}-${b}`) || GOLD.has(`${b}-${a}`)) s += 6;
  s = Math.min(97, s);
  const band = s >= 88 ? 0 : s >= 81 ? 1 : s >= 75 ? 2 : 3;
  const label = ["찰떡 궁합", "서로 배우는 사이", "맞춰 가는 재미", "다른 언어를 쓰는 둘"][band];
  const img = [`${D}/girl_heart.webp`, `${D}/bunny_love.webp`, `${D}/girl_thumb.webp`, `${D}/girl_think.webp`][band];
  const good: string[] = [];
  const care: string[] = [];
  if (sn) good.push("같은 장면을 보고 비슷하게 상상해서, 설명하지 않아도 통하는 순간이 많아요.");
  else care.push("한 사람은 지금 이야기를, 한 사람은 가능성을 이야기해요. 약속은 날짜까지 구체적으로 정해 두면 좋아요.");
  if (ei) good.push("한 사람이 대화를 열고 한 사람이 깊게 들어 줘서, 대화의 균형이 잘 맞아요.");
  else care.push(a[0] === "E" ? "둘 다 말로 푸는 편이라 다툴 때 말이 빨라질 수 있어요. 한 박자 쉬기." : "둘 다 혼자 정리하는 시간이 필요해서, 침묵이 길어지면 오해가 생길 수 있어요.");
  if (tf) good.push("이성과 감정이 서로를 채워 줘서, 한쪽으로 치우친 결정을 막아 줘요.");
  else good.push(a[2] === "F" ? "마음을 먼저 알아봐 주는 둘이라 서운함을 빨리 알아채요." : "문제를 차분하게 풀어 가는 둘이라 큰 싸움이 길어지지 않아요.");
  if (jp) care.push("계획파와 즉흥파가 만났어요. 데이트는 ‘큰 틀만 정하고 나머지는 자유롭게’가 좋아요.");
  else good.push(a[3] === "J" ? "생활 리듬이 비슷해서 약속과 일정이 잘 맞아요." : "즉흥적인 재미를 함께 즐길 줄 알아요.");
  const tip = ei
    ? "답장 속도는 성향 차이일 때가 많아요. 속도를 마음의 크기로 읽지 않기."
    : sn
    ? "잘 통하는 사이일수록 ‘말 안 해도 알겠지’가 쌓여요. 고마운 건 말로 한 번 더."
    : "다른 점이 많을수록 질문이 좋은 무기예요. ‘너는 이럴 때 어때?’";
  return {
    score: s,
    label,
    img,
    head: `${a} × ${b}`,
    lines: [
      ["잘 맞는 점", good[0] ?? "서로에게 없는 걸 가지고 있어서 배우는 게 많은 사이예요."],
      ["부딪히기 쉬운 점", care[0] ?? "비슷한 만큼 같은 지점에서 같이 지칠 수 있어요. 번갈아 기대기."],
      ["이런 순간에 빛나요", good[1] ?? "서로의 다른 점을 웃으며 이야기할 수 있을 때 가장 가까워져요."],
    ],
    tip,
    note: "MBTI 궁합은 재미로 보는 참고예요. 실제 관계는 두 사람이 나눈 대화와 시간이 만들어요.",
  };
}

function TypeGrid({ value, onPick, label }: { value: string; onPick: (t: string) => void; label: string }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 text-[15px] font-extrabold">{label}</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={value === t}
            onClick={() => onPick(t)}
            className={`h-[42px] rounded-xl text-[14px] font-bold ${value === t ? "bg-[#B3263F] text-white" : "bg-[#F4EAE6] text-[#5a4a4e]"}`}
          >
            {t}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function MbtiTest() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [r, setR] = useState<Result | null>(null);
  const t = FREE_TESTS[0];
  return (
    <div className="px-4 pt-3">
      <Intro img={t.img} title={t.title} sub="내 MBTI와 그 사람 MBTI를 고르면 바로 점수가 나와요" bg={t.bg} />
      {!r ? (
        <div className={`${CARD} mt-4 flex flex-col gap-5 p-5`}>
          <TypeGrid label="나의 MBTI" value={a} onPick={setA} />
          <TypeGrid label="그 사람의 MBTI" value={b} onPick={setB} />
          <button type="button" disabled={!a || !b} onClick={() => setR(mbtiResult(a, b))} className={BTN}>
            궁합 보기
          </button>
        </div>
      ) : (
        <ResultView r={r} color="#B3263F" self="mbti" onAgain={() => setR(null)} />
      )}
    </div>
  );
}

/* ---------- 2. 생년월일 애정 점수 ---------- */
const LP: Record<number, string> = {
  1: "앞에서 이끄는",
  2: "곁을 살피는",
  3: "말로 마음을 여는",
  4: "약속을 지키는",
  5: "새로움을 찾는",
  6: "챙겨 주는",
  7: "혼자 생각을 정리하는",
  8: "현실을 책임지는",
  9: "마음이 넓은",
};
function lifePath(d: string) {
  let n = d.replace(/\D/g, "").split("").reduce((s, x) => s + Number(x), 0);
  while (n > 9) n = String(n).split("").reduce((s, x) => s + Number(x), 0);
  return n || 9;
}
function loveResult(d1: string, d2: string): Result {
  const a = lifePath(d1);
  const b = lifePath(d2);
  const [, m1, x1] = d1.split("-").map(Number);
  const [, m2, x2] = d2.split("-").map(Number);
  const s = 66 + ((a * b + a + b + m1 + m2 + x1 + x2) % 30);
  const band = s >= 88 ? 0 : s >= 80 ? 1 : s >= 73 ? 2 : 3;
  const label = ["뜨끈한 애정 온도", "따뜻한 애정 온도", "미지근, 그래서 편안한", "천천히 데워지는 사이"][band];
  const img = [`${D}/girl_curly.webp`, `${D}/bunny_love.webp`, `${D}/girl_thumb.webp`, `${D}/girl_think.webp`][band];
  const tips = [
    "온도가 높을수록 작은 서운함도 크게 느껴져요. 고마운 건 바로, 서운한 건 하루 뒤에.",
    "편하게 기대도 되는 사이예요. 다만 익숙함이 무심함으로 보이지 않게 안부 한 줄.",
    "같은 속도로 데워지는 사이예요. 상대 속도를 재촉하지 않는 게 가장 큰 배려예요.",
    "서로를 알아 가는 데 시간이 필요한 사이예요. 결론보다 대화를 먼저.",
  ];
  return {
    score: s,
    label,
    img,
    head: `${d1.split("-").join(".")} × ${d2.split("-").join(".")}`,
    lines: [
      ["나는", `${LP[a]} 사람 (${a}번 기운)`],
      ["그 사람은", `${LP[b]} 사람 (${b}번 기운)`],
      ["두 사람이 만나면", a === b ? "닮은 기운끼리라 말하지 않아도 통하는 부분이 많아요." : Math.abs(a - b) >= 4 ? "서로 다른 기운이라 상대에게 없는 걸 채워 줄 수 있어요." : "비슷하면서 조금씩 달라서, 함께 있으면 편하고 심심하지 않아요."],
    ],
    tip: tips[band],
    note: "생년월일 숫자를 더해 보는 재미용 점수예요. 두 사람의 관계나 상대의 마음을 정해 주지 않아요.",
  };
}

export function LoveScoreTest() {
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [r, setR] = useState<Result | null>(null);
  const t = FREE_TESTS[1];
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(d1) && /^\d{4}-\d{2}-\d{2}$/.test(d2);
  const inp = "mt-2 h-[52px] w-full rounded-xl border border-[#EADBD6] bg-white px-4 text-[16px] text-[#2B2326] outline-none focus:border-[#B3263F]";
  return (
    <div className="px-4 pt-3">
      <Intro img={t.img} title={t.title} sub="두 사람의 생년월일을 넣으면 애정 점수가 바로 나와요" bg={t.bg} />
      {!r ? (
        <div className={`${CARD} mt-4 flex flex-col gap-4 p-5`}>
          <label className="block text-[15px] font-extrabold">
            나의 생년월일
            <input type="date" min="1940-01-01" max="2012-12-31" value={d1} onChange={(e) => setD1(e.target.value)} className={inp} />
          </label>
          <label className="block text-[15px] font-extrabold">
            그 사람의 생년월일
            <input type="date" min="1940-01-01" max="2012-12-31" value={d2} onChange={(e) => setD2(e.target.value)} className={inp} />
          </label>
          <p className="m-0 text-[12px] text-[#8a7a7e]">입력한 날짜는 저장하지 않아요.</p>
          <button type="button" disabled={!ok} onClick={() => setR(loveResult(d1, d2))} className={BTN}>
            애정 점수 보기
          </button>
        </div>
      ) : (
        <ResultView r={r} color="#C2410C" self="love-score" onAgain={() => setR(null)} />
      )}
    </div>
  );
}

/* ---------- 3. 띠 궁합 ---------- */
const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const animalOf = (y: number) => ((y - 4) % 12 + 12) % 12;
const pair = (a: number, b: number, list: number[][]) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const YUKHAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const CHUNG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const SAMHAP = [[8, 0, 4], [5, 9, 1], [2, 6, 10], [11, 3, 7]];

function zodiacResult(y1: number, y2: number): Result {
  const a = animalOf(y1);
  const b = animalOf(y2);
  let s = 78;
  let label = "무난하게 맞춰 가는 사이";
  let desc = "특별히 부딪히는 기운 없이, 함께 보낸 시간만큼 편해지는 사이예요.";
  let tip = "무난한 사이일수록 표현이 줄기 쉬워요. 좋은 건 좋다고 말해 주기.";
  let img = `${D}/girl_thumb.webp`;
  if (a === b) {
    s = 85;
    label = "닮은 꼴 같은 띠";
    desc = "같은 띠라 생각하는 방식이 비슷해요. 말하지 않아도 아는 부분이 많아요.";
    tip = "닮은 만큼 같은 데서 고집이 생겨요. 다툴 땐 한 사람이 먼저 쉬어 가기.";
    img = `${D}/bunny_love.webp`;
  } else if (pair(a, b, YUKHAP)) {
    s = 96;
    label = "서로를 채워 주는 육합";
    desc = "전통 궁합에서 가장 잘 맞는다고 보는 짝이에요. 서로에게 없는 걸 채워 줘요.";
    tip = "잘 맞는 사이일수록 ‘원래 이런 사람’이라고 넘기기 쉬워요. 작은 고마움도 말로.";
    img = `${D}/girl_heart.webp`;
  } else if (SAMHAP.some((g) => g.includes(a) && g.includes(b))) {
    s = 92;
    label = "같은 방향을 보는 삼합";
    desc = "같은 목표를 향해 힘을 모으는 짝이에요. 함께 계획을 세울 때 가장 빛나요.";
    tip = "함께 하고 싶은 것 하나를 정해 보세요. 같이 하는 일이 있을 때 더 가까워져요.";
    img = `${D}/girl_curly.webp`;
  } else if (pair(a, b, WONJIN)) {
    s = 66;
    label = "가끔 서운함이 쌓이는 원진";
    desc = "이유 없이 서운한 순간이 생기기 쉬운 짝이에요. 대신 대화로 풀면 오래가요.";
    tip = "서운할 때는 쌓아 두지 말고, 그날 안에 짧게 말하기.";
    img = `${D}/girl_think.webp`;
  } else if (pair(a, b, CHUNG)) {
    s = 62;
    label = "부딪히며 배우는 충";
    desc = "성향이 정반대라 부딪히기 쉽지만, 그만큼 서로에게 배울 게 많은 짝이에요.";
    tip = "다툴 때는 이기는 것보다 ‘우리 둘 다 뭘 바랐는지’를 먼저 찾아보기.";
    img = `${D}/girl_angry.webp`;
  }
  return {
    score: s,
    label,
    img,
    head: `${ANIMALS[a]}띠 × ${ANIMALS[b]}띠`,
    lines: [
      ["나", `${y1}년생 ${ANIMALS[a]}띠`],
      ["그 사람", `${y2}년생 ${ANIMALS[b]}띠`],
      ["두 띠가 만나면", desc],
    ],
    tip,
    note: "띠는 태어난 해 기준이에요. 1~2월 설날 전에 태어났다면 앞 해의 띠로 보세요. 전통 궁합을 재미로 풀어 본 결과예요.",
  };
}

export function ZodiacTest() {
  const years = Array.from({ length: 2012 - 1950 + 1 }, (_, i) => 2012 - i);
  const [y1, setY1] = useState(0);
  const [y2, setY2] = useState(0);
  const [r, setR] = useState<Result | null>(null);
  const t = FREE_TESTS[2];
  const sel = "mt-2 h-[52px] w-full rounded-xl border border-[#EADBD6] bg-white px-4 text-[16px] text-[#2B2326] outline-none focus:border-[#5B45B0]";
  return (
    <div className="px-4 pt-3">
      <Intro img={t.img} title={t.title} sub="태어난 해만 고르면 두 띠의 궁합이 바로 나와요" bg={t.bg} />
      {!r ? (
        <div className={`${CARD} mt-4 flex flex-col gap-4 p-5`}>
          <label className="block text-[15px] font-extrabold">
            내가 태어난 해
            <select value={y1 || ""} onChange={(e) => setY1(Number(e.target.value))} className={sel}>
              <option value="">선택해 주세요</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년 · {ANIMALS[animalOf(y)]}띠
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[15px] font-extrabold">
            그 사람이 태어난 해
            <select value={y2 || ""} onChange={(e) => setY2(Number(e.target.value))} className={sel}>
              <option value="">선택해 주세요</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}년 · {ANIMALS[animalOf(y)]}띠
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={!y1 || !y2} onClick={() => setR(zodiacResult(y1, y2))} className={BTN_V}>
            띠 궁합 보기
          </button>
        </div>
      ) : (
        <ResultView r={r} color="#5B45B0" self="zodiac" onAgain={() => setR(null)} />
      )}
    </div>
  );
}
