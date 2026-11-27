import type { Metadata } from "next";

/* 11/27 운영자 요청: 지금까지 만든 월화 루프 영상 전부 한눈에 (검색 노출 없음) */
export const metadata: Metadata = {
  title: "월화 루프 영상 모음 | 월하연 月下緣",
  robots: { index: false, follow: false },
};

type Loop = { src: string; poster?: string; name: string; use: string };

const GROUPS: { title: string; items: Loop[] }[] = [
  {
    title: "말하는 월화 (얼굴 가까이) · wolhwa/v3",
    items: [
      { src: "/wolhwa/v3/greet.mp4", poster: "/wolhwa/v3/greet.webp", name: "greet 인사", use: "프로토타입: 월화 소개 · 이름 질문" },
      { src: "/wolhwa/v3/listen.mp4", poster: "/wolhwa/v3/listen.webp", name: "listen 듣기", use: "프로토타입: 그 사람·관계·마음 질문" },
      { src: "/wolhwa/v3/explain.mp4", poster: "/wolhwa/v3/explain.webp", name: "explain 설명", use: "프로토타입: 기간·연락·안전 질문" },
      { src: "/wolhwa/v3/smile.mp4", poster: "/wolhwa/v3/smile.webp", name: "smile 미소", use: "프로토타입: 감정·이메일 질문" },
      { src: "/wolhwa/v3/offer.mp4", poster: "/wolhwa/v3/offer.webp", name: "offer 권함", use: "프로토타입: 알고 싶은 것 질문" },
      { src: "/wolhwa/v3/write.mp4", poster: "/wolhwa/v3/write.webp", name: "write 쓰기", use: "프로토타입: 이야기 쓰기 질문" },
    ],
  },
  {
    title: "월화 장면 (상반신·소품) · book/v3",
    items: [
      { src: "/book/v3/w-reading.mp4", poster: "/book/v3/w-reading.webp", name: "w-reading 편지 읽기", use: "프로토타입: 읽는 중 · 두 이름 카드" },
      { src: "/book/v3/w-final.mp4", poster: "/book/v3/w-final.webp", name: "w-final 마무리 편지", use: "" },
      { src: "/book/v3/w-mirror.mp4", poster: "/book/v3/w-mirror.webp", name: "w-mirror 거울", use: "" },
      { src: "/book/v3/w-phone2.mp4", poster: "/book/v3/w-phone2.webp", name: "w-phone2 휴대폰 보는 월화", use: "" },
      { src: "/book/v3/w-phone.mp4", poster: "/book/v3/w-phone.webp", name: "w-phone 테이블 위 휴대폰", use: "" },
      { src: "/book/v3/w-thread.mp4", poster: "/book/v3/w-thread.webp", name: "w-thread 붉은 실 찻잔", use: "프로토타입: 이동 · 붉은 실 고르기" },
      { src: "/book/v3/w-cups.mp4", poster: "/book/v3/w-cups.webp", name: "w-cups 찻잔 두 개", use: "" },
    ],
  },
  {
    title: "월화 대표 루프 · wolhwa/v4 · v5 · 메인",
    items: [
      { src: "/wolhwa/v4/wait.mp4", poster: "/wolhwa/v4/wait.webp", name: "wait 잠깐 (손 든 월화)", use: "프로토타입: '잠깐.'" },
      { src: "/wolhwa/v5/loop_ritual.mp4", poster: "/wolhwa/v5/p_ritual.webp", name: "loop_ritual 재회 분석", use: "홈 배너 · 프로토타입 표지" },
      { src: "/wolhwa/v5/loop_kakao.mp4", poster: "/wolhwa/v5/p_kakao.webp", name: "loop_kakao 카톡 분석", use: "홈 배너" },
      { src: "/wolhwa/v5/loop_book.mp4", poster: "/wolhwa/v5/p_book.webp", name: "loop_book 심층 리포트", use: "홈 배너" },
      { src: "/wolhwa/hero-loop-mobile.mp4", poster: "/wolhwa/hero-poster.webp", name: "hero-loop 메인 첫 화면", use: "" },
      { src: "/wolhwa/wolhwa-reading-loop.mp4", poster: "/wolhwa/reading-poster.webp", name: "reading-loop 편지 읽는 월화", use: "" },
    ],
  },
];

export default function LoopsPage() {
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);
  return (
    <main className="min-h-[100svh] bg-[#0b0809] px-4 pb-16 pt-8 text-ivory">
      <div className="mx-auto max-w-[920px]">
        <h1 className="font-display text-[1.5rem]">월화 루프 영상 모음</h1>
        <p className="mt-1 text-[0.82rem] text-ivory/60">지금 사이트에 올라가 있는 월화 루프 {total}개 · 소리 없이 반복 재생 · 아래 이름(파일)로 말씀해 주시면 바로 바꿔 넣을게요</p>
        {GROUPS.map((g) => (
          <section key={g.title} className="mt-8">
            <h2 className="text-[0.95rem] font-bold text-gold">{g.title}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {g.items.map((it) => (
                <figure key={it.src} className="overflow-hidden rounded-2xl border border-white/10 bg-[#161113]">
                  <video src={it.src} poster={it.poster} autoPlay muted loop playsInline preload="metadata" className="aspect-[9/16] w-full object-cover" />
                  <figcaption className="px-3 py-2">
                    <p className="text-[0.8rem] font-semibold">{it.name}</p>
                    {it.use && <p className="mt-0.5 text-[0.68rem] leading-snug text-ivory/55">쓰는 곳: {it.use}</p>}
                    <p className="mt-0.5 break-all text-[0.6rem] text-ivory/35">{it.src}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
