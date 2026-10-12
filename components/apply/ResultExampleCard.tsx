"use client";

/**
 * 전체 분석 결과 예시 (10/12 개발지시서 4) — 흐림 처리만으로 설득하지 않고, 유료 결과의 '형식과 구체성'을 보여준다.
 * - 가상 사연으로 만든 예시 (실제 고객 사연·개인정보 아님) — 화면에 분명히 표시
 * - 실제 전체 결과(part_06 연락 전략: 타이밍 조건 · 첫 메시지 예시 · 반가운 답/단답/무응답 대응)에 들어가는 형식만 사용
 * - 재회·상대 마음·특정 날짜 연락을 보장하는 표현 없음
 */
import { useEffect, useRef } from "react";
import { logPayEvent } from "@/lib/pay-events";

type Kind = "contact" | "lover" | "boundary";

const EX: Record<Kind, {
  story: string;
  condT: string; cond: string;
  draftT: string; draft: string; draftNote: string;
  branchT: string; branches: Array<[string, string]>;
}> = {
  contact: {
    story: "헤어진 지 3주 · 마지막 말은 ‘서로 생각할 시간을 갖자’ · 그 뒤로 연락 없음",
    condT: "연락을 고려할 조건",
    cond: "마지막 대화 뒤 2주 이상 지났고, 상대 SNS를 보고 바로 반응하고 싶은 마음이 가라앉았을 때. 답이 없어도 하루를 버틸 수 있다고 느끼는 날, 한 번만.",
    draftT: "첫 메시지 초안 (일부)",
    draft: "“요즘 날이 많이 추워졌더라. 감기 조심해.”",
    draftNote: "관계를 묻지 않고, 답장을 요구하지 않는 두 줄 이내",
    branchT: "반응별 다음 행동",
    branches: [
      ["따뜻한 답", "같은 온도로 한 번만 답하고 대화를 길게 끌지 않기. 다음 연락은 며칠 두고 상대 반응을 본 뒤에."],
      ["단답", "추가 질문 없이 그대로 마무리. 1~2주는 먼저 연락하지 않고 내 일상 기준 지키기."],
      ["무응답", "다시 보내지 않기. 읽음 확인·프로필 확인을 멈추고 2주 동안 거리 두기."],
    ],
  },
  lover: {
    story: "사귄 지 1년 · 연락 문제로 싸운 뒤 이틀째 서로 말이 없음",
    condT: "다시 이야기를 꺼낼 조건",
    cond: "둘 다 감정이 가라앉은 저녁, 상대가 일상 대화에 평소처럼 답할 때. 싸운 이야기는 메시지보다 얼굴 보는 자리에서.",
    draftT: "첫마디 초안 (일부)",
    draft: "“그날 내가 서운했던 건 너라기보다, 혼자 기다리던 그 시간이었던 것 같아.”",
    draftNote: "상대를 탓하지 않고 내 마음 한 가지만 말하는 문장",
    branchT: "반응별 다음 행동",
    branches: [
      ["받아줄 때", "고맙다고 말하고, 서로 원하는 연락 방식을 하나씩만 정하기."],
      ["짧게 넘길 때", "그날은 더 밀지 않기. 2~3일 뒤 같은 이야기를 한 번만 다시."],
      ["피할 때", "몰아붙이지 않기. 대화가 어려운 이유부터 물어보고 기다리기."],
    ],
  },
  boundary: {
    story: "상대가 ‘연락하지 말아 줘’라고 말한 뒤 연락이 끊김",
    condT: "내가 지킬 거리 기준",
    cond: "상대가 먼저 거리를 풀기 전까지 새 계정·지인·SNS로 연락하지 않기. 이 기준은 기간을 정해 두고 지켜요.",
    draftT: "흔들릴 때 쓸 문장 (일부)",
    draft: "“보내고 싶은 말은 메모장에 쓰고, 내일 아침에 다시 읽어 본다.”",
    draftNote: "상대에게 보내는 말이 아니라 나에게 하는 약속",
    branchT: "상황별 다음 행동",
    branches: [
      ["소식을 들었을 때", "바로 반응하지 않기. 그날은 SNS를 닫고 미리 정한 행동 하나 하기."],
      ["연락하고 싶어질 때", "보내기 전에 정한 순서대로 하기. 그래도 남으면 하루 뒤에 다시 보기."],
      ["상대가 먼저 연락하면", "짧고 차분하게 답하고, 내가 지킬 선을 먼저 확인하기."],
    ],
  },
};

export default function ResultExampleCard({ kind, orderNumber }: { kind: Kind; orderNumber: string }) {
  const e = EX[kind];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          logPayEvent(orderNumber, "example_seen", kind);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [orderNumber, kind]);

  return (
    <div ref={ref} className="rounded-2xl border border-gold/35 bg-ink-soft px-5 py-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.72rem] tracking-wider text-gold/90">전체 분석 결과 예시</p>
        <span className="shrink-0 rounded-full border border-ivory/20 px-2 py-0.5 text-[0.62rem] text-ivory-dim">
          가상 사연으로 만든 예시
        </span>
      </div>
      <p className="mt-2 text-[0.76rem] leading-[1.7] text-ivory-dim">예시 사연 · {e.story}</p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <p className="text-[0.78rem] font-semibold text-gold">① {e.condT}</p>
          <p className="mt-1 text-[0.88rem] leading-[1.85] text-ivory">{e.cond}</p>
        </div>
        <div>
          <p className="text-[0.78rem] font-semibold text-gold">② {e.draftT}</p>
          <p className="mt-1.5 rounded-xl bg-ink/70 px-4 py-3 text-[0.9rem] leading-[1.8] text-ivory">{e.draft}</p>
          <p className="mt-1 text-[0.72rem] text-ivory-dim">{e.draftNote}</p>
        </div>
        <div>
          <p className="text-[0.78rem] font-semibold text-gold">③ {e.branchT}</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {e.branches.map(([k, v]) => (
              <li key={k} className="grid grid-cols-[5.6rem_1fr] gap-2 text-[0.84rem] leading-[1.75]">
                <span className="font-medium text-ivory">{k}</span>
                <span className="min-w-0 font-light text-ivory">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 border-t border-gold-dim/15 pt-3 text-[0.72rem] leading-[1.75] text-ivory-dim">
        실제 결과는 입력한 사연에 맞춰 조건·문장·기간이 달라져요. 이 예시는 내 결과가 아니며, 재회나 상대의 반응을 약속하지 않아요.
      </p>
    </div>
  );
}
