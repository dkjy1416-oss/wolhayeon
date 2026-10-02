"use client";

/**
 * 예시 답변 미리보기 — 가상의 신청자 '지수'(책 샘플과 같은 인물)의 사연으로 만든 예시.
 * 실제 미리보기·전체 결과의 항목 구성(lib/ritual-preview-schema, lib/ritual-result-schema)을 그대로 따른다.
 * 후기가 아니며, 화면에 '예시 · 가상의 사연'을 항상 표시한다.
 */
import { useState } from "react";
import TrackedCtaLink from "@/components/TrackedCtaLink";

const STORY_CHIPS = ["3년 연애", "헤어진 지 3주", "마지막 대화: 크게 다툼", "그 뒤 긴 메시지 2번", "짧은 답만 옴"];

function Box({ tag, title, children }: { tag: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gold-dim/20 bg-ink/60 px-4 py-4">
      <p className="text-[0.66rem] tracking-[0.18em] text-gold/80">{tag}</p>
      {title && <p className="mt-1.5 text-[0.95rem] text-ivory">{title}</p>}
      <div className="mt-2 text-[0.82rem] font-light leading-[1.9] text-ivory-dim">{children}</div>
    </div>
  );
}

function FreeTab() {
  return (
    <div className="space-y-2.5">
      <Box tag="월화의 첫 마디">
        <p className="font-display text-[0.88rem] leading-[1.95] text-ivory">
          지수 님, 밤마다 메시지를 썼다 지우는 그 마음이 얼마나 큰지 알아요. 그 마음을 줄이라고 하지 않을게요. 다만 지금은
          그 마음이 서두르다 다치지 않게, 순서부터 같이 볼게요.
        </p>
      </Box>

      <Box tag="A. 지금 관계 상태" title="다툼의 피로가 남은 거리 두기 단계">
        마지막 장면이 다툼이었고, 그 뒤 두 번의 긴 메시지에 짧은 답이 돌아왔어요. 마음이 끝났다기보다, 지금은 ‘그 이야기를 다시
        꺼내는 것’ 자체가 지친 시기로 읽혀요.
      </Box>

      <Box tag="B. 민준 님은 왜 이럴까">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {["감정소진", "방어"].map((m) => (
            <span key={m} className="rounded-full border border-thread/40 px-2.5 py-0.5 text-[0.7rem] text-thread">
              {m}
            </span>
          ))}
        </div>
        짧은 답은 ‘무관심’보다 ‘더는 다투고 싶지 않다’는 방어에 가까워요. 지금 긴 말을 더 보내면, 내용과 상관없이 ‘또 그
        얘기’로 받아들여질 가능성이 커요.
      </Box>

      <Box tag="C. 지금 하면 안 되는 것">
        <ul className="space-y-2">
          {[
            ["긴 사과문 한 번 더 보내기", "사과가 쌓일수록 상대에겐 ‘숙제’가 돼요."],
            ["스토리 보고 바로 반응하기", "작은 반응도 ‘아직 기다리고 있다’는 신호로 읽혀요."],
            ["친구 통해 마음 떠보기", "전해 들은 말은 대부분 더 차갑게 도착해요."],
          ].map(([a, w]) => (
            <li key={a}>
              <span className="text-ivory line-through decoration-thread/60">✕ {a}</span>
              <span className="block text-[0.76rem]">{w}</span>
            </li>
          ))}
        </ul>
      </Box>

      <div className="rounded-xl border border-gold/50 bg-gold/5 px-4 py-4">
        <p className="text-[0.66rem] tracking-[0.18em] text-gold">D. 지금 할 일</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="rounded-md bg-gold px-2 py-0.5 text-[0.72rem] font-medium text-ink">기다림</span>
          <span className="font-display text-[1.05rem] text-ivory">약 18일</span>
        </div>
        <p className="mt-2 text-[0.82rem] font-light leading-[1.9] text-ivory-dim">
          다툼의 피로가 가라앉을 시간을 주는 게 지금은 관계를 지키는 쪽이에요. 그 사이 민준 님이 먼저 가벼운 연락을 해 오면,
          길게 답하지 말고 짧고 따뜻하게만 받아 주세요.
        </p>
      </div>
    </div>
  );
}

function PaidTab() {
  return (
    <div className="space-y-2.5">
      <Box tag="01 · 월화의 첫 편지" title="그날의 말보다, 그 전의 3년을">
        싸운 날의 말이 3년 전체를 대신하지는 않아요. 지수 님이 정말 붙잡고 싶은 건 그날 이긴 쪽이 되는 게 아니라, 다시 편하게
        웃던 두 사람이었을 거예요…
      </Box>

      <Box tag="02 · 관계 읽기 5편">
        <ul className="space-y-1.5">
          <li><b className="font-normal text-ivory">두 사람의 이야기</b> — 서운함이 말이 되기까지 걸린 시간</li>
          <li><b className="font-normal text-ivory">지금 내 마음</b> — 그리움과 억울함이 섞인 자리</li>
          <li><b className="font-normal text-ivory">반복된 흐름</b> — ‘참다가 한 번에 터지는’ 패턴</li>
          <li><b className="font-normal text-ivory">내가 정말 원하는 것</b> — 사과받는 것과 다시 만나는 것의 차이</li>
          <li><b className="font-normal text-ivory">지금 바꿀 수 있는 것</b> — 상대가 아니라 내 쪽의 세 가지</li>
        </ul>
      </Box>

      <Box tag="03 · 24시간 · 7일 가이드">
        <ul className="space-y-1.5">
          <li>· 오늘 밤: 보내고 싶은 말은 메모장에만 쓰고, 휴대폰은 다른 방에</li>
          <li>· 3일째: 그날 싸움을 ‘후회되는 말 / 억울한 것’ 두 칸으로 나눠 적기</li>
          <li>· 7일째: 민준 님 없이도 버틴 하루를 한 줄로 기록하기</li>
        </ul>
      </Box>

      <Box tag="04 · 21일 하루 플랜">
        <ul className="space-y-1.5">
          <li><span className="text-gold">DAY 1</span> 연락 충동이 온 시간대를 적어 두기</li>
          <li><span className="text-gold">DAY 8</span> 그날 내가 정말 하고 싶었던 말 한 문장 찾기</li>
          <li><span className="text-gold">DAY 18</span> 첫 연락을 보낼지, 조금 더 둘지 스스로 정하기</li>
        </ul>
      </Box>

      <div className="relative overflow-hidden rounded-xl border border-gold-dim/20 bg-ink/60 px-4 py-4">
        <p className="text-[0.66rem] tracking-[0.18em] text-gold/80">05 · 붉은 실 리추얼 · 06 · 마지막 편지 · 마음 기록장</p>
        <p aria-hidden className="mt-2 select-none text-[0.82rem] font-light leading-[1.9] text-ivory-dim blur-[5px]">
          흔들리는 밤에는 붉은 실을 손가락에 한 번 감고, 오늘 보내지 않은 말을 종이에 적어 접어 두세요. 그리고 나에게 이렇게
          말해 주세요. 나는 지금 기다리는 중이지, 멈춰 있는 게 아니라고.
        </p>
        <p className="absolute inset-x-0 bottom-3 text-center text-[0.74rem] text-gold">이어지는 내용은 내 사연으로 받아 보세요</p>
      </div>
    </div>
  );
}

export default function SampleAnswerSection() {
  const [tab, setTab] = useState<"free" | "paid">("free");
  return (
    <section className="border-t border-gold-dim/10 px-5 py-16">
      <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">이런 답을 받아요</p>
      <h2 className="font-display mt-3 text-center text-[1.4rem] leading-[1.55] text-ivory">
        한 사람의 사연으로
        <br />
        <span className="text-gold">미리 보여 드릴게요</span>
      </h2>

      <div className="mt-7 rounded-2xl border border-gold-dim/25 bg-ink-soft/60 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[0.86rem] text-ivory">지수 님의 사연</p>
          <span className="rounded-full border border-ivory-dim/30 px-2 py-0.5 text-[0.62rem] text-ivory-dim">예시 · 가상의 사연</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {STORY_CHIPS.map((c) => (
            <span key={c} className="rounded-full bg-ink px-2.5 py-1 text-[0.72rem] text-ivory-dim">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[0.8rem] font-light leading-[1.85] text-ivory-dim">
          “아직 너무 보고 싶은데, 지금 연락하면 완전히 끝날까 봐 무서워요.”
        </p>
      </div>

      <div role="tablist" aria-label="예시 답변" className="mt-5 grid grid-cols-2 gap-1 rounded-full border border-gold-dim/30 p-1">
        {(
          [
            ["free", "무료 미리보기"],
            ["paid", "결제 후 전체 결과"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-10 rounded-full text-[0.84rem] transition-colors ${
              tab === k ? "bg-gradient-to-b from-burgundy to-burgundy-deep text-ivory" : "text-ivory-dim"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">{tab === "free" ? <FreeTab /> : <PaidTab />}</div>

      {tab === "free" ? (
        <button
          type="button"
          onClick={() => setTab("paid")}
          className="mt-3 w-full text-center text-[0.8rem] text-gold underline decoration-gold/30 underline-offset-[6px]"
        >
          결제하면 이어지는 답 보기 →
        </button>
      ) : null}

      <TrackedCtaLink
        event="home_cta_click"
        placement="sample_answer"
        href="/apply"
        className="cta-glow mt-6 flex h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory active:opacity-85"
      >
        내 사연으로 무료 미리보기 받기
      </TrackedCtaLink>
      <p className="mt-2.5 text-center text-[0.7rem] font-light leading-[1.8] text-ivory-dim/80">
        위 내용은 가상의 사연으로 만든 예시예요. 실제 답은 들려주신 이야기에 맞춰 달라져요.
      </p>
    </section>
  );
}
