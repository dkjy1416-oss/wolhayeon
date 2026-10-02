import Reveal from "@/components/home/Reveal";
import LoopVideo from "@/components/book/LoopVideo";
import TrackedCtaLink from "@/components/TrackedCtaLink";

/**
 * 메시지와 책은 무엇이 다른가 — 홈 중간 비교 섹션.
 * 메시지: 내 사연 하나를 읽은 '지금~3주'의 맞춤 답장 (웹 화면)
 * 책: 연락이 온 뒤 · 다시 만나기 시작할 때까지, 곁에 두는 개인화 안내서 (PDF)
 */
const ROWS: Array<{ k: string; m: string; b: string }> = [
  { k: "이런 분께", m: "지금 연락할지, 기다릴지 당장 정해야 할 때", b: "연락이 다시 오고, 다시 만나기 시작할 때까지 대비하고 싶을 때" },
  { k: "다루는 때", m: "오늘 밤 ~ 앞으로 3주", b: "재회 전 → 연락이 오는 순간 → 재회 시작" },
  { k: "핵심", m: "내 사연 해석 · 연락 타이밍과 첫 메시지 · 순간별 실전 노트", b: "10가지 상황별로 보낼 문장 · 보내면 안 되는 문장 · 체크리스트" },
  { k: "형태", m: "웹 결과 화면 (영상·카드) + 메일", b: "내 이름이 들어간 PDF 책 약 120쪽" },
  { k: "받는 시간", m: "결제 후 1~3분", b: "결제 후 몇 분 · 메일로도 전송" },
  { k: "보관", m: "30일 동안 언제든 열람", b: "PDF로 저장해 계속 소장" },
];

const MSG_ONLY = ["상대의 지금 행동을 내 사연으로 읽어 줌", "나에게 맞춘 첫 메시지 예시와 반응별 대응", "답장이 오면·안 오면 — 순간별 실전 노트"];
const BOOK_ONLY = ["먼저 연락이 왔을 때 · 보고 싶다고 할 때 · 술 마시고 연락 왔을 때", "재회를 직접 꺼내는 문장, 보내면 안 되는 메시지 7가지", "다시 만나기 전 체크리스트 · 재회 후 꼭 나눌 질문"];

export default function CompareSection() {
  return (
    <section className="border-t border-gold-dim/10 px-5 py-16">
      <Reveal>
        <p className="text-center text-[0.7rem] tracking-[0.3em] text-gold/80">메시지와 책, 무엇이 다른가요</p>
        <h2 className="font-display mt-3 text-center text-[1.4rem] leading-[1.6] text-ivory">
          메시지는 <span className="text-gold">지금</span>을,
          <br />
          책은 <span className="text-gold">그다음</span>을 준비해요
        </h2>
      </Reveal>

      <Reveal>
        <div className="mt-8 grid grid-cols-2 gap-2.5">
          <div className="overflow-hidden rounded-2xl border border-gold-dim/35 bg-ink-soft/70">
            <LoopVideo
              src="/book/v3/w-phone.mp4"
              poster="/book/v3/w-phone.webp"
              label="월화의 메시지"
              fit="contain"
              className="block aspect-[4/5] w-full"
            />
            <div className="px-3 py-3">
              <p className="text-[0.62rem] tracking-[0.18em] text-gold/80">월화의 메시지</p>
              <p className="mt-1 text-[0.86rem] leading-[1.5] text-ivory">내 사연에 대한 맞춤 답장</p>
              <ul className="mt-2 space-y-1.5 text-[0.72rem] font-light leading-[1.6] text-ivory-dim">
                {MSG_ONLY.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span className="text-gold">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gold/45 bg-gradient-to-b from-[#1d1512] to-ink-soft">
            <div className="relative flex aspect-[4/5] w-full items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(226,196,138,0.16),transparent_65%)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book/v2/cover-3d.webp"
                alt="《헤어진 뒤, 연락하지 말아야 할 때》 책"
                loading="lazy"
                className="bk-float w-[70%] drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
              />
            </div>
            <div className="px-3 py-3">
              <p className="text-[0.62rem] tracking-[0.18em] text-gold">개인화 PDF 책</p>
              <p className="mt-1 text-[0.86rem] leading-[1.5] text-ivory">곁에 두고 펼치는 안내서</p>
              <ul className="mt-2 space-y-1.5 text-[0.72rem] font-light leading-[1.6] text-ivory-dim">
                {BOOK_ONLY.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span className="text-gold">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-4 overflow-hidden rounded-2xl border border-gold-dim/25 text-[0.76rem]">
          <div className="grid grid-cols-[4.2rem_1fr_1fr] bg-ink-soft/80 px-3 py-2.5 text-[0.7rem]">
            <span />
            <span className="text-ivory-dim">메시지</span>
            <span className="text-gold">책</span>
          </div>
          {ROWS.map((r) => (
            <div key={r.k} className="grid grid-cols-[4.2rem_1fr_1fr] gap-2 border-t border-gold-dim/10 px-3 py-2.5 leading-[1.65]">
              <span className="text-[0.68rem] text-gold/75">{r.k}</span>
              <span className="min-w-0 font-light text-ivory-dim">{r.m}</span>
              <span className="min-w-0 text-ivory">{r.b}</span>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className="mt-5 rounded-2xl border border-thread/30 bg-thread/5 px-4 py-4 text-center">
          <p className="text-[0.86rem] leading-[1.85] text-ivory">
            둘 다 <span className="text-gold">같은 사연 하나</span>로 만들어요.
            <br />
            지금의 답과 그다음의 문장까지 — 함께 받으면 가장 든든해요.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <TrackedCtaLink
              event="home_cta_click"
              placement="compare_free"
              href="/apply"
              className="flex h-11 items-center justify-center rounded-full border border-gold/45 text-[0.82rem] text-gold"
            >
              무료 미리보기부터
            </TrackedCtaLink>
            <TrackedCtaLink
              event="home_cta_click"
              placement="compare_bundle"
              href="/apply?want=bundle"
              className="flex h-11 items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.82rem] text-ivory"
            >
              함께 받기
            </TrackedCtaLink>
          </div>
          <TrackedCtaLink
            event="home_cta_click"
            placement="compare_book_detail"
            href="/book"
            className="mt-3 inline-block text-[0.76rem] text-gold underline decoration-gold/30 underline-offset-[6px]"
          >
            책 차례와 실제 페이지 보기 →
          </TrackedCtaLink>
        </div>
      </Reveal>
    </section>
  );
}
