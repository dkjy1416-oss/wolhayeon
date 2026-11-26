"use client";

/**
 * 11/26 운영자 요청: 새 홈 화면 (/home) — 묘수사주 홈 구도에 맞춤 (모바일 390px 기준).
 * 묘수 실측: 상단 바 13px · 칩 16px · 대표 배너 340px 가운데 정렬(양옆 살짝 보임, 비활성 카드는 세로 90%)
 *   · 섹션 제목 20px/800 · 카드 제목 16px · 설명 13px · 분야별 카드 222px 가로 넘김 · 상황 카드 145px 가로 넘김
 * - 누적 숫자는 기존 월계수(Totals) 그대로.
 * - 가격·쿠폰 금액은 어디에도 표시하지 않는다. 후기·평점·숫자는 실제 데이터만.
 * - 들어올 때 붙은 utm 값은 다른 화면으로 이동할 때 그대로 넘긴다.
 * - 카카오 가입·쿠폰·보관함은 아직 정해지지 않아 '준비 중' 안내.
 * 11/26 2차: 칩을 누르면 묘수 /category 처럼 큰 카드만 뜨는 화면(무료는 얇고 긴 카드 · 무료 테스트 3종),
 *   하단 메뉴 '질문' → '칼럼'(/column), '영상' → 유튜브 쇼츠(/watch), '지금 이런 상황이라면' → 칼럼 글.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { readOrder } from "@/components/book/ResumeOrder";
import { BUSINESS } from "@/components/legal/LegalPage";
import { FREE_TESTS, type FreeTest } from "@/lib/home/free-tests";
import { COLUMNS } from "@/lib/home/columns";
import { SAVED_REVIEWS } from "@/lib/home/reviews-saved";
import { ReviewCard, Stars5, maskName } from "@/components/home4/ReviewCard";
import { todayDaily } from "@/lib/home/daily";

/* ⑧ SNS 칸 — 묘수 홈 구도(겹쳐 쌓은 카드 + 세로 영상 2개). 위치는 묘수 실측 비율(358×432) 기준 % */
const SNS_STAGE: Array<{ kind: "img" | "video"; src: string; poster?: string; alt: string; l: number; t: number; w: number; h?: number; z: number; quote?: string; who?: string }> = [
  { kind: "img", src: "/wolhwa/sns/sns_card1.webp?v=2", alt: "내 사연으로 받는 관계 리추얼", l: 40, t: 0, w: 60, z: 1 },
  { kind: "video", src: "/wolhwa/sns/sns_v1.mp4", poster: "", alt: "월하연 후기 영상", l: 0, t: 3, w: 34, h: 50, z: 3, who: "관계 리추얼", quote: "그날은 거기서 멈췄어요" },
  { kind: "img", src: "/wolhwa/sns/sns_card2.webp?v=2", alt: "장문 사과에 단답이 왔을 때", l: 26, t: 14, w: 70, z: 4 },
  { kind: "img", src: "/wolhwa/sns/sns_card3.webp?v=2", alt: "카톡 대화 분석으로 본 연락의 흐름", l: 38, t: 39.5, w: 58, z: 4 },
  { kind: "video", src: "/wolhwa/sns/sns_v2.mp4", poster: "", alt: "월하연 후기 영상", l: 64, t: 50, w: 34, h: 50, z: 3, who: "카톡 대화 분석", quote: "제가 놓친 장면이 있더라고요" },
  { kind: "img", src: "/wolhwa/sns/sns_card4.webp?v=2", alt: "헤어진 뒤, 연락하지 말아야 할 때", l: 0, t: 56, w: 64, z: 5 },
  { kind: "img", src: "/wolhwa/sns/sns_card5.webp?v=2", alt: "월화의 추천 메시지와 맞춤 PDF", l: 8, t: 80, w: 60, z: 6 },
];

/* 상황 카드 — 칼럼으로 (파스텔 + 낙서 캐릭터) */
const SIT_BG = ["#FFE6EC", "#FFF3D1", "#ECE7FF", "#E3F4EA", "#E4F0FF", "#FFEBDD"];
import { BottomNav } from "@/components/home4/SubShell";

type Review = { id: number; rating: number; body: string; name: string; product: string; incentive: boolean };


/* ---------- utm 이어 붙이기 ---------- */
function useUtm() {
  const [q, setQ] = useState("");
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const keep = new URLSearchParams();
      sp.forEach((v, k) => {
        if (k.startsWith("utm_") || k === "fbclid" || k === "gclid") keep.set(k, v);
      });
      setQ(keep.toString());
    } catch {
      /* noop */
    }
  }, []);
  return (href: string) => {
    if (!q || href.startsWith("#")) return href;
    const [path, hash] = href.split("#");
    const own = new URLSearchParams(path.split("?")[1] ?? "");
    const add = new URLSearchParams(q);
    own.forEach((_, k) => add.delete(k));
    const s = add.toString();
    return `${path}${s ? (path.includes("?") ? "&" : "?") + s : ""}${hash ? `#${hash}` : ""}`;
  };
}

function AutoVideo({ src, poster, className = "", label }: { src: string; poster: string; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (typeof IntersectionObserver === "undefined") {
      v.play().catch(() => undefined);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} className={className} src={src} poster={poster} muted loop playsInline preload="metadata" aria-label={label} />;
}

/* ⑥ 소개 영상 — 커플 영상으로 다시 편집한 월하연 광고 (11/26). 11/27: 소리 버튼 없이 꽉 찬 화면으로 소리 없이 계속 재생 */
function AdVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.4 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <div className="relative mt-3 aspect-video overflow-hidden rounded-2xl bg-[#1E1E22]">
      <video
        ref={ref}
        src="/wolhwa/v5/ad_couple.mp4"
        poster="/wolhwa/v5/ad_couple_poster.jpg"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="월하연 소개 영상"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function Stars({ n }: { n: number }) {
  const k = Math.max(1, Math.min(5, Math.round(n)));
  return (
    <span className="tracking-[1px] text-[#E4627B]" aria-label={`별점 ${n}점`}>
      {"★".repeat(k)}
      <span className="text-[#3a3a40]">{"★".repeat(5 - k)}</span>
    </span>
  );
}

const Chev = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/* 묘수 실측 글씨 */
const H2 = "m-0 text-[20px] font-extrabold leading-[1.35] tracking-[-0.02em] text-[#F5F5F5] [word-break:keep-all]";
const EB = "m-0 mb-1 text-[13px] text-[#B5B5BA]";

const BANNERS = [
  { href: "/apply", img: "/wolhwa/v5/p_ritual.webp", video: "/wolhwa/v5/loop_ritual.mp4", logo: "/wolhwa/v5/logo_ritual.webp", title: "월화의 재회 분석", line: "보낼까 말까, 내 사연으로 같이 읽어요", tag: "무료 미리보기" },
  { href: "/chat", img: "/wolhwa/v5/p_kakao.webp", video: "/wolhwa/v5/loop_kakao.mp4", logo: "/wolhwa/v5/logo_kakao.webp", title: "카톡 대화 분석", line: "그 사람 카톡, 숫자로 먼저 읽어 봐요", tag: "숫자 분석 무료" },
  { href: "/book", img: "/wolhwa/v5/p_book.webp", video: "/wolhwa/v5/loop_book.mp4", logo: "/wolhwa/v5/logo_book.webp", title: "심층 재회 리포트", line: "120쪽 · 6만 자 이상, 내 사연으로 쓰는 심층 분석", tag: "NEW" },
];

/* 누르면 칼럼 글로 (11/26 운영자 요청) */
const SITUATIONS: Array<[string, string, string, string, string]> = [
  ["제가 너무 많이 매달렸어요", "지금부터 할 수 있는 것", "칼럼", "/column/held-on-too-much", "/wolhwa/doodle/girl_worry.webp"],
  ["사과했는데 단답만 왔어요", "두 번째 사과 대신", "칼럼", "/column/short-reply-after-apology", "/wolhwa/doodle/girl_think.webp"],
  ["같은 일로 또 싸웠어요", "반복되는 이유 정리", "칼럼", "/column/same-fight-again", "/wolhwa/doodle/girl_angry.webp"],
  ["놓고 싶은데 SNS를 계속 봐요", "본 것과 상상한 것", "칼럼", "/column/checking-their-sns", "/wolhwa/doodle/girl_bed.webp"],
  ["답장이 점점 짧아져요", "대화 온도 읽는 법", "칼럼", "/column/shorter-replies", "/wolhwa/doodle/bunny_laptop.webp"],
  ["지금 당장 보내고 싶어요", "보내기 전 3단계", "칼럼", "/column/before-you-send", "/wolhwa/doodle/boy_bed.webp"],
];

const SEARCH: Array<[string, string]> = [
  ["월화의 관계 리추얼 · 내 사연으로 무료 미리보기", "/apply"],
  ["카톡 대화 분석 · 그 사람 카톡 숫자로 읽기", "/chat"],
  ["캡처로 카톡 분석하기", "/chat?start=quiz"],
  ["심층 재회 리포트 · 120쪽 고급 분석", "/book"],
  ["보내면 안 되는 메시지 7가지 (무료)", "/free/no-send"],
  ...FREE_TESTS.map((t) => [`${t.title} (무료 테스트)`, t.href] as [string, string]),
  ["월하연 영상 · 유튜브 쇼츠", "/watch"],
  ...SITUATIONS.map(([t, , , h]) => [t, h] as [string, string]),
  ...COLUMNS.map((c) => [`칼럼 · ${c.title}`, `/column/${c.slug}`] as [string, string]),
];

/* ---------- 칩을 누르면 뜨는 카테고리 화면 (묘수 /category/love 구도: 큰 카드 + 오른쪽 아래 재생 버튼) ---------- */
type CatCard = { img: string; logo?: string; t: string; d: string; h: string; tag?: string };
const CAT: Record<string, { title: string; cards: CatCard[] }> = {
  ritual: {
    title: "리추얼",
    cards: [
      { img: "/wolhwa/v5/p_ritual.webp", logo: "/wolhwa/v5/logo_ritual.webp", t: "월화의 재회 분석", d: "보낼까 말까, 내 사연으로 같이 읽어요", h: "/apply", tag: "무료 미리보기" },
      { img: "/wolhwa/v5/p_pack.webp", t: "리추얼 + 심층 리포트", d: "지금 읽을 메시지와 120쪽 심층 리포트", h: "/book" },
      { img: "/wolhwa/v5/t_free3.webp", t: "상황을 골라 바로 시작", d: "매달렸을 때 · 단답이 왔을 때 · 또 싸웠을 때", h: "/apply?sit=1" },
    ],
  },
  talk: {
    title: "카톡 분석",
    cards: [
      { img: "/wolhwa/v5/p_kakao.webp", logo: "/wolhwa/v5/logo_kakao.webp", t: "카톡 대화 분석", d: "그 사람 카톡, 숫자로 먼저 읽어 봐요", h: "/chat", tag: "숫자 분석 무료" },
      { img: "/wolhwa/v5/p_capture.webp", t: "캡처로 분석하기", d: "파일 내보내기가 어렵다면 캡처로", h: "/chat?start=quiz" },
    ],
  },
  book: {
    title: "심층 리포트",
    cards: [
      { img: "/wolhwa/v5/p_book.webp", logo: "/wolhwa/v5/logo_book.webp", t: "심층 재회 리포트", d: "120쪽 · 6만 자 이상 — 내 사연으로 쓰는 고급 재회 분석", h: "/book", tag: "NEW" },
      { img: "/wolhwa/v5/t_free2.webp", t: "리포트 한 장 미리 보기", d: "보내면 안 되는 메시지 7가지", h: "/free/no-send" },
    ],
  },
};

/* 무료 테스트 카드 — 얇고 긴 카드 (11/26 운영자 요청) */
function FreeTestCard({ t, u }: { t: FreeTest; u: (h: string) => string }) {
  return (
    <Link href={u(t.href)} className="relative flex h-[132px] items-center overflow-hidden rounded-2xl pl-5" style={{ background: t.bg }}>
      <span className="relative z-[1] flex max-w-[60%] flex-col">
        <span className="w-fit rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-extrabold" style={{ color: t.ink }}>
          무료 · 바로 결과
        </span>
        <span className="font-display mt-1.5 text-[22px] font-bold leading-[1.25] text-[#2B2326]">{t.title}</span>
        <span className="mt-1 text-[12.5px] leading-[1.45] text-[#5a4a4e] [word-break:keep-all]">{t.sub}</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.img} alt="" aria-hidden className="absolute bottom-0 right-2 h-[124px] w-[124px] object-contain mix-blend-multiply" />
      <span className="absolute bottom-3 right-3 z-[1] flex h-8 w-8 items-center justify-center rounded-full bg-white text-[12px] shadow" style={{ color: t.ink }}>
        ▶
      </span>
    </Link>
  );
}

function CategoryView({ id, u }: { id: string; u: (h: string) => string }) {
  if (id === "free") {
    return (
      <section className="px-4 pt-4" aria-label="무료">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">무료</h1>
        <p className="m-0 mt-1 text-[13px] text-[#B5B5BA]">누르면 바로 결과가 나오는 무료 테스트</p>
        <div className="mt-4 flex flex-col gap-3">
          {FREE_TESTS.map((t) => (
            <FreeTestCard key={t.id} t={t} u={u} />
          ))}
        </div>
      </section>
    );
  }
  const c = CAT[id];
  if (!c) return null;
  return (
    <section className="px-4 pt-4" aria-label={c.title}>
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">{c.title}</h1>
      <div className="mt-4 flex flex-col gap-4">
        {c.cards.map((k) => (
          <Link key={k.t} href={u(k.h)} className="relative block aspect-[398/332] overflow-hidden rounded-2xl bg-[#18181B]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={k.img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" />
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent to-black/85" />
            {k.tag && <span className="absolute left-3 top-3 rounded-full bg-[#B3263F] px-2.5 py-1 text-[11px] font-bold text-white">{k.tag}</span>}
            <span className="absolute bottom-4 left-4 right-16">
              {k.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={k.logo} alt={k.t} className="-mb-1 -ml-2 w-[78%] drop-shadow-[0_3px_10px_rgba(0,0,0,0.7)]" />
              ) : (
                <span className="block text-[22px] font-extrabold leading-[1.3] text-white">{k.t}</span>
              )}
              <span className="mt-1 block text-[13.5px] leading-[1.45] text-white/85 [word-break:keep-all]">{k.d}</span>
            </span>
            <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/90 text-white">
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const CHIPS: Array<[string, string]> = [
  ["top", "전체"],
  ["ritual", "리추얼"],
  ["talk", "카톡 분석"],
  ["book", "심층 리포트"],
  ["free", "무료"],
];


const GROUPS: Array<{ id: string; eb: string; title: string; items: Array<{ img: string; logo?: string; who: string; t: string; h: string }> }> = [
  {
    id: "ritual",
    eb: "리추얼 분야",
    title: "다시 이을 실마리가 궁금하신가요?",
    items: [
      { img: "/wolhwa/v5/p_ritual.webp", logo: "/wolhwa/v5/logo_ritual.webp", who: "월화", t: "월화의 재회 분석", h: "/apply" },
      { img: "/wolhwa/v5/p_pack.webp", who: "월화의 추천", t: "리추얼 + 심층 리포트", h: "/book" },
    ],
  },
  {
    id: "talk",
    eb: "카톡 분석 분야",
    title: "그 사람 마음, 대화에 이미 남아 있어요",
    items: [
      { img: "/wolhwa/v5/p_kakao.webp", logo: "/wolhwa/v5/logo_kakao.webp", who: "월화", t: "카톡 대화 분석", h: "/chat" },
      { img: "/wolhwa/v5/p_capture.webp", who: "월화", t: "캡처로 분석하기", h: "/chat?start=quiz" },
    ],
  },
  {
    id: "book",
    eb: "심층 리포트",
    title: "120쪽, 6만 자로 다시 읽는 우리 관계",
    items: [
      { img: "/wolhwa/v5/p_book.webp", logo: "/wolhwa/v5/logo_book.webp", who: "심층 재회 리포트", t: "120쪽 고급 재회 분석", h: "/book" },
      { img: "/wolhwa/v5/t_free2.webp", who: "심층 재회 리포트", t: "리포트 한 장 미리 보기", h: "/free/no-send" },
    ],
  },
];

/* ---------- 대표 배너: 가운데 정렬 넘김 (묘수 구도) ----------
   첫 카드에서도 양옆 카드가 살짝 보이게 3벌을 이어 붙이고 가운데 벌에서 시작, 끝에 닿으면 가운데 벌로 순간 이동 */
const LOOP = [...BANNERS, ...BANNERS, ...BANNERS];
const N = BANNERS.length;

function HeroCarousel({ u }: { u: (h: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cur, setCur] = useState(N);
  const touching = useRef(false);
  const settle = useRef(0);

  const leftOf = (el: HTMLDivElement, i: number) => {
    const n = el.children[i] as HTMLElement | undefined;
    return n ? n.offsetLeft - (el.clientWidth - n.offsetWidth) / 2 : 0;
  };

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = leftOf(el, N);
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bd = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const n = c as HTMLElement;
      const d = Math.abs(n.offsetLeft + n.offsetWidth / 2 - mid);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setCur(best);
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      if (best < N || best >= 2 * N) {
        const j = best < N ? best + N : best - N;
        el.scrollTo({ left: leftOf(el, j), behavior: "auto" });
        setCur(j);
      }
    }, 180);
  };

  /* 4.5초마다 다음 카드 (손으로 넘기는 중엔 멈춤) */
  useEffect(() => {
    const t = window.setInterval(() => {
      const el = ref.current;
      if (!el || touching.current || document.hidden) return;
      el.scrollTo({ left: leftOf(el, cur + 1), behavior: "smooth" });
    }, 4500);
    return () => window.clearInterval(t);
  }, [cur]);

  return (
    <section id="top" aria-label="대표 상품" className="scroll-mt-4 pt-3">
      <div
        ref={ref}
        onScroll={onScroll}
        onTouchStart={() => (touching.current = true)}
        onTouchEnd={() => window.setTimeout(() => (touching.current = false), 1500)}
        className="scrollbar-none flex snap-x snap-mandatory gap-1 overflow-x-auto"
      >
        {LOOP.map((b, i) => (
          <Link
            key={i}
            href={u(b.href)}
            aria-label={`${b.title} — ${b.line}`}
            aria-hidden={i < N || i >= 2 * N ? true : undefined}
            tabIndex={i < N || i >= 2 * N ? -1 : undefined}
            className={`relative flex aspect-[340/490] w-[87%] max-w-[340px] shrink-0 snap-center flex-col justify-end overflow-hidden rounded-2xl bg-[#18181B] p-5 transition-transform duration-300 ${cur === i ? "scale-y-100" : "scale-y-[0.9]"}`}
          >
            {i >= N && i < 2 * N ? (
              <AutoVideo src={b.video} poster={b.img} label={`${b.title} 소개 영상`} className="absolute inset-0 h-full w-full object-cover object-top" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-top" />
            )}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-transparent via-[#0B0B0C]/55 to-[#0B0B0C]/90" />
            <span className="absolute left-3 top-3 rounded-full bg-[#B3263F] px-2.5 py-1 text-[11px] font-bold text-white">{b.tag}</span>
            <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-bold text-white">
              {(i % N) + 1} / {N}
            </span>
            <span className="sr-only">{b.title}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.logo} alt="" aria-hidden className="relative mx-auto -mb-1 w-[92%] drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)]" />
            <span className="relative text-center text-[13px] leading-[1.5] text-[#F5F5F5]/90 [word-break:keep-all]">{b.line}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- ① 상단 띠: 묘수처럼 문구가 위로 올라가며 바뀜 (가격·쿠폰 금액·수상 없음) ---------- */
const TICKER: Array<{ t: string; h?: string; bg: string }> = [
  { t: "카카오 1초 회원가입 후 쿠폰팩 받기", bg: "#7A1E31" },
  { t: "내 사연으로 무료 미리보기 · 월화가 먼저 읽어 드려요", h: "/apply", bg: "#5A1627" },
  { t: "그 사람 카톡, 숫자 분석은 무료예요", h: "/chat", bg: "#7A1E31" },
  { t: "NEW! 120쪽 심층 재회 리포트", h: "/book", bg: "#5A1627" },
  { t: "보내면 안 되는 메시지 7가지 · 무료로 보기", h: "/free/no-send", bg: "#7A1E31" },
];

function TopTicker({ u, onSoon }: { u: (h: string) => string; onSoon: (w: string) => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % TICKER.length), 2800);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="relative h-[34px] overflow-hidden transition-colors duration-500" style={{ background: TICKER[i].bg }}>
      <div className="transition-transform duration-500 ease-out" style={{ transform: `translateY(-${i * 34}px)` }}>
        {TICKER.map((m, k) =>
          m.h ? (
            <Link key={k} href={u(m.h)} tabIndex={k === i ? 0 : -1} aria-hidden={k !== i} className="flex h-[34px] items-center justify-center gap-1 px-4 text-[13px] font-semibold text-white">
              {m.t} <span aria-hidden>›</span>
            </Link>
          ) : (
            <button key={k} type="button" tabIndex={k === i ? 0 : -1} aria-hidden={k !== i} onClick={() => onSoon("카카오 회원가입")} className="flex h-[34px] w-full items-center justify-center gap-1 px-4 text-[13px] font-semibold text-white">
              {m.t} <span aria-hidden>›</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

/* ---------- 본문 ---------- */
export default function HomeV4({ reviews, rating, totalsNode }: { reviews: Review[]; rating: number | null; totalsNode: React.ReactNode }) {
  const u = useUtm();
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ o: string; n: string; l: string; u: string } | null>(null);
  const [paid, setPaid] = useState(false);
  const [search, setSearch] = useState(false);
  const [kw, setKw] = useState("");
  const [cat, setCat] = useState("top");
  const [daily, setDaily] = useState(false);
  const today = todayDaily();

  const soon = (what: string) => {
    setToast(`${what}은(는) 준비 중이에요. 곧 열려요.`);
    window.setTimeout(() => setToast(null), 2200);
  };

  /* ⑤ 이어서 보기: 이 기기에서 무료 미리보기까지 끝낸 사람에게만 */
  useEffect(() => {
    const s = readOrder();
    if (!s) return;
    fetch(`/api/orders/price?order=${encodeURIComponent(s.o)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok || j.status === "refunded") return;
        setSaved(s);
        setPaid(j.status === "paid");
      })
      .catch(() => {});
  }, []);

  /* 칩 → 카테고리 화면 (주소에 ?cat= 을 남겨 뒤로가기·공유 가능) */
  useEffect(() => {
    const read = () => {
      const c = new URLSearchParams(window.location.search).get("cat");
      setCat(c && (c === "free" || CAT[c]) ? c : "top");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const goCat = (id: string) => {
    if (id !== cat) {
      const sp = new URLSearchParams(window.location.search);
      if (id === "top") sp.delete("cat");
      else sp.set("cat", id);
      const q = sp.toString();
      window.history.pushState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}`);
    }
    setCat(id);
    window.scrollTo({ top: 0 });
  };

  const found = kw.trim() ? SEARCH.filter(([t]) => t.replace(/\s/g, "").includes(kw.replace(/\s/g, ""))) : SEARCH;
  const resumeHref = saved ? saved.u || `/apply/preview?order=${encodeURIComponent(saved.o)}` : "/apply";

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] overflow-x-hidden bg-[#0B0B0C] text-[#F5F5F5]">
        {/* ① 상단 카카오 가입 쿠폰 바 */}
        <TopTicker u={u} onSoon={soon} />

        {/* ② 로고 · 검색 · MY */}
        <header className="flex items-center justify-between pl-4 pr-2 pt-2">
          <Link href={u("/home")} className="font-display text-[24px] leading-none text-[#E4627B]">
            월하연 <span className="text-[12px] text-[#B5B5BA]">月下緣</span>
          </Link>
          <div className="flex">
            <button type="button" onClick={() => setSearch(true)} className="flex h-[52px] w-[48px] flex-col items-center justify-center gap-0.5 text-[#F5F5F5]">
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span className="text-[10.5px] font-extrabold">검색</span>
            </button>
            <button
              type="button"
              onClick={() => (saved && !paid ? (window.location.href = u(resumeHref)) : soon("MY"))}
              className="relative flex h-[52px] w-[48px] flex-col items-center justify-center gap-0.5 text-[#F5F5F5]"
            >
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
              <span className="text-[10.5px] font-extrabold">MY</span>
              <span className="absolute right-0 top-0.5 rounded-full bg-[#B3263F] px-1.5 text-[9px] font-extrabold leading-[14px] text-white">쿠폰</span>
            </button>
          </div>
        </header>

        {/* ③ 카테고리 칩 */}
        <nav aria-label="카테고리" className="flex justify-between gap-1 px-4 pt-1.5">
          {CHIPS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => goCat(id)}
              className={`h-[36px] flex-1 rounded-full text-[16px] ${cat === id ? "bg-[#2A0D15] font-extrabold text-[#F5F5F5] ring-1 ring-[#8E2338]" : "font-medium text-[#B5B5BA]"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {cat !== "top" && <CategoryView id={cat} u={u} />}

        {cat === "top" && (
        <>
        {/* ④ 대표 배너 */}
        <HeroCarousel u={u} />

        {/* ⑤ 이어서 보기 */}
        {saved && (
          <section className="px-4 pt-8" aria-label="이어서 보기">
            <p className="m-0 mb-1 text-[12.5px] font-semibold text-[#E4627B]">이어서 보기</p>
            <h2 className="m-0 text-[21px] font-black leading-[1.35] tracking-[-0.02em]">{saved.n ? `${saved.n}님 ` : ""}미리보기가 완료됐어요</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#18181B]">
              <div className="relative h-[150px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wolhwa/v5/p_ritual.webp" alt="" aria-hidden className="h-full w-full object-cover object-[50%_22%]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent to-[#18181B]" />
                <span className="absolute bottom-3 left-4 text-[16px] font-bold text-white">월화의 관계 리추얼</span>
              </div>
              <div className="px-4 pb-4 pt-2">
                <p className="m-0 line-clamp-2 text-[13.5px] leading-[1.6] text-[#E7E7EA] [word-break:keep-all]">
                  {paid ? "결과는 결제할 때 입력한 메일의 ‘결과 열기’ 링크로 다시 열 수 있어요." : saved.l || "다시 쓰지 않고, 읽어 둔 미리보기를 그대로 이어볼 수 있어요."}
                </p>
                {!paid && (
                  <Link href={u(resumeHref)} className="mt-3 block rounded-xl bg-[#8E2338] py-3 text-center text-[15px] font-extrabold text-white">
                    내 결과 이어보기
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ⑥ 소개 영상 */}
        <section className="px-4 pt-9" aria-label="소개 영상">
          <h2 className="m-0 text-[15px] font-semibold text-[#F5F5F5]">잠 못 드는 밤, 월하연과 함께</h2>
          <p className="m-0 mt-1 text-[13px] text-[#B5B5BA]">보낼까 말까 고민되는 밤, 내 사연을 읽어 줄 사람을 만나 보세요</p>
          <AdVideo />
        </section>

        {/* ⑦ 후기 — DB 승인 후기 + 운영자가 저장해 둔 후기(11/26 운영자 지시). 이름·별점은 원본에 있는 것만 */}
        <section className="px-4 pt-9" aria-label="후기">
          <p className="m-0 mb-1 text-[12.5px] font-semibold text-[#E4627B]">실시간 이용 후기</p>
          <div className="flex items-end justify-between">
            <h2 className="m-0 text-[21px] font-black leading-[1.35] tracking-[-0.02em]">먼저 열어 본 분들의 이야기</h2>
            <Link href={u("/reviews")} className="shrink-0 pb-1 text-[12.5px] text-[#B5B5BA]">
              전체보기 ›
            </Link>
          </div>
          <div className="scrollbar-none -mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4">
            {[
              ...reviews.map((r) => ({ key: `d${r.id}`, id: r.id + 100, name: r.name, stars: r.rating, body: r.body, product: r.product })),
              ...SAVED_REVIEWS.filter((_, i) => i % 5 === 0 || i % 5 === 2).map((r) => ({ key: `s${r.id}`, id: r.id, name: maskName(r.id), stars: 5, body: r.body, product: r.product, age: r.age })),
            ].map((r) => (
              <div key={r.key} className="w-[86%] max-w-[330px] shrink-0 snap-center">
                <ReviewCard r={r} clamp={4} href={u("/reviews")} />
              </div>
            ))}
          </div>
          <Link href={u("/reviews")} className="mt-3 block rounded-xl border border-[#2A2A2E] py-3 text-center text-[14px] font-bold text-[#E7E7EA]">
            후기 {reviews.length + SAVED_REVIEWS.length}개 모두 보기 ›
          </Link>
          {rating !== null && (
            <p className="m-0 mt-3 text-center text-[14px] font-bold">
              결제 고객 후기 평점 <span className="text-[#E4627B]">{rating.toFixed(1)}</span> <Stars n={rating} />
            </p>
          )}
        </section>

        {/* ⑧ SNS에서 화제인 월하연 — 묘수 구도 */}
        <section className="px-4 pt-11" aria-label="SNS에서 화제인 월하연">
          <h2 className="m-0 text-center text-[24px] font-extrabold tracking-[-0.02em]">
            SNS에서 화제인 <span className="text-[#E4627B]">월하연</span>
          </h2>
          <div className="relative mx-auto mt-5 aspect-[358/432] w-full max-w-[358px]">
            {SNS_STAGE.map((c, i) =>
              c.kind === "video" ? (
                <div
                  key={i}
                  className="absolute overflow-hidden rounded-2xl bg-[#1E1E22] shadow-[0_10px_28px_rgba(25,25,25,0.45)]"
                  style={{ left: `${c.l}%`, top: `${c.t}%`, width: `${c.w}%`, height: `${c.h}%`, zIndex: c.z }}
                >
                  <AutoVideo src={c.src} poster={c.poster ?? ""} label={c.alt} className="h-full w-full object-cover" />
                  {/* 후기 영상처럼: 위에 별점·상품, 아래 자막 한 줄 */}
                  <span className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-1.5 pb-3 pt-1.5">
                    <Stars5 size={9} />
                    <span className="block truncate text-[8.5px] font-bold text-white">{c.who} 후기</span>
                  </span>
                  {c.quote && (
                    <span className="absolute inset-x-1 bottom-5 rounded bg-black/65 px-1 py-0.5 text-center text-[9px] font-bold leading-[1.3] text-white [word-break:keep-all]">
                      “{c.quote}”
                    </span>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 py-px text-[7.5px] text-white/70">AI 연출</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={c.src}
                  alt={c.alt}
                  loading="lazy"
                  className="absolute h-auto rounded-xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)]"
                  style={{ left: `${c.l}%`, top: `${c.t}%`, width: `${c.w}%`, zIndex: c.z }}
                />
              )
            )}
          </div>
        </section>

        {/* ⑨ 누적 숫자 — 기존 월계수 그대로 */}
        <div className="-mx-2">{totalsNode}</div>

        {/* ⑩ 카카오 회원 전용 쿠폰팩 */}
        <section id="kakao" className="px-4">
          <div className="relative flex min-h-[132px] items-center overflow-hidden rounded-2xl bg-[#7A1E31] p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wolhwa/v4/thread.webp" alt="" aria-hidden className="absolute inset-y-0 right-0 h-full w-[44%] object-cover object-[50%_25%] [mask-image:linear-gradient(to_right,transparent,black_45%)]" />
            <div className="relative flex flex-col gap-1">
              <span className="text-[11.5px] font-bold text-[#F3B6C2]">카카오 회원 전용</span>
              <span className="text-[20px] font-black leading-[1.3] text-white">첫 방문 쿠폰팩</span>
              <span className="text-[12px] text-white/85">가입하면 쿠폰함에 바로 들어가요</span>
              <button type="button" onClick={() => soon("카카오 회원가입")} className="mt-2 w-fit rounded-full bg-[#FEE500] px-4 py-2 text-[12.5px] font-bold text-[#191919]">
                카카오 1초 회원가입하고 받기 ›
              </button>
            </div>
          </div>
        </section>

        {/* ⑪ 매일 무료 */}
        <section className="px-4 pt-4">
          <button type="button" onClick={() => setDaily(true)} className="flex h-[100px] w-full items-center overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#18181B] text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wolhwa/v5/t_daily.webp" alt="" aria-hidden className="h-full w-[40%] object-cover object-[50%_30%] [mask-image:linear-gradient(to_right,black_60%,transparent)]" />
            <span className="flex flex-1 flex-col gap-0.5 pl-1">
              <span className="text-[11px] font-semibold text-[#E4627B]">매일 · 무료</span>
              <span className="text-[20px] font-bold">오늘 밤의 한 문장</span>
              <span className="text-[13px] text-[#B5B5BA]">월화가 건네는 오늘의 한 줄</span>
            </span>
            <span className="mr-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#3a3a40] text-[#F5F5F5]"><Chev /></span>
          </button>
        </section>

        {/* ⑫ 무료로 보는 월하연 한 입 */}
        <section id="free" className="scroll-mt-4 px-4 pt-9">
          <h2 className={H2}>무료로 보는 월하연 한 입</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {FREE_TESTS.map((t) => (
              <FreeTestCard key={t.id} t={t} u={u} />
            ))}
          </div>
        </section>

        {/* ⑬ 분야별 카드 — 222px 가로 넘김 */}
        {GROUPS.map((g) => (
          <section key={g.id} id={g.id} className="scroll-mt-4 pt-9">
            <div className="px-4">
              <p className={EB}>{g.eb}</p>
              <h2 className={H2}>{g.title}</h2>
            </div>
            <div className="scrollbar-none mt-3 flex snap-x gap-3 overflow-x-auto px-4">
              {g.items.map((it) => (
                <Link key={it.t} href={u(it.h)} className="relative block aspect-[3/4] w-[222px] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#1E1E22]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.img} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover object-[50%_18%]" />
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/85" />
                  <span className="absolute inset-x-3 bottom-3 text-center">
                    {it.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.logo} alt={it.t} loading="lazy" className="mx-auto w-full drop-shadow-[0_3px_10px_rgba(0,0,0,0.7)]" />
                    ) : (
                      <>
                        <span className="block text-[12px] font-semibold text-[#F3B6C2]">{it.who}</span>
                        <span className="block text-[17px] font-bold leading-[1.35] text-white [word-break:keep-all]">{it.t}</span>
                      </>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* ⑭ 지금 이런 상황이라면 — 누르면 칼럼 (파스텔 카드 재디자인) */}
        <section className="pt-9">
          <div className="flex items-baseline justify-between px-4">
            <h2 className={H2}>지금 이런 상황이라면</h2>
            <Link href={u("/column")} className="text-[12.5px] text-[#B5B5BA]">
              칼럼 전체보기 ›
            </Link>
          </div>
          <p className="m-0 mt-1 px-4 text-[13px] text-[#B5B5BA]">월화가 미리 적어 둔 3분 칼럼</p>
          <div className="scrollbar-none mt-3 flex snap-x gap-2.5 overflow-x-auto px-4">
            {SITUATIONS.map(([t, d, , h, img], i) => (
              <Link
                key={t}
                href={u(h)}
                className="relative flex h-[214px] w-[158px] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] p-3.5"
                style={{ background: SIT_BG[i % SIT_BG.length] }}
              >
                <span className="w-fit rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-extrabold text-[#B3263F]">월화의 칼럼</span>
                <span className="mt-2 text-[16px] font-extrabold leading-[1.35] text-[#2B2326] [word-break:keep-all]">{t}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" aria-hidden loading="lazy" className="absolute -bottom-1 -right-2 h-[112px] w-[112px] object-contain mix-blend-multiply" />
                <span className="relative mt-auto w-fit rounded-full bg-[#2B2326] px-2.5 py-1 text-[11px] font-bold text-white">{d} →</span>
              </Link>
            ))}
          </div>
        </section>

        </>
        )}

        {/* ⑮ 푸터 */}
        <footer className="mt-10 bg-[#050505] px-5 pb-[170px] pt-6 text-[11.5px] leading-[1.8] text-[#8f8f96]">
          <p className="font-display m-0 mb-2 text-[15px] text-[#F5F5F5]">
            월하연 <span className="text-[#E4627B]">月下緣</span>
          </p>
          <p className="m-0">
            상호 {BUSINESS.company} · 대표 {BUSINESS.ceo}
          </p>
          <p className="m-0">사업자등록번호 {BUSINESS.regNo} · 통신판매업 신고번호 {BUSINESS.mailOrderNo}</p>
          <p className="m-0 [word-break:keep-all]">주소 {BUSINESS.address}</p>
          <p className="m-0 mb-2">
            고객센터 {BUSINESS.phone} · {BUSINESS.email}
          </p>
          <p className="m-0 mb-2 [word-break:keep-all]">월하연은 특정 상대방의 감정·연락·재회·행동 또는 미래의 결과를 보장하지 않습니다.</p>
          <p className="m-0">
            <Link href="/guide" className="text-[#B5B5BA]">서비스 소개</Link> · <Link href="/refund" className="text-[#B5B5BA]">환불정책</Link> ·{" "}
            <Link href="/privacy" className="text-[#B5B5BA]">개인정보처리방침</Link> · <Link href="/business" className="text-[#B5B5BA]">사업자정보</Link>
          </p>
        </footer>

        {/* 하단 고정: 카카오 가입 바 + 하단 메뉴 */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px]">
          <div className="pointer-events-auto px-4 pb-3">
            <button
              type="button"
              onClick={() => soon("카카오 회원가입")}
              className="flex h-[52px] w-full items-center justify-between rounded-[14px] bg-[#FEE500] px-4 text-[14px] font-bold text-[#191919] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            >
              <span className="flex items-center gap-2">
                <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4C6.5 4 2 7.5 2 11.8c0 2.8 1.9 5.2 4.7 6.6l-1 3.6 4.1-2.7c.7.1 1.4.2 2.2.2 5.5 0 10-3.5 10-7.8S17.5 4 12 4z" /></svg>
                카카오 1초 회원가입 후 쿠폰팩 받기
              </span>
              <span aria-hidden>›</span>
            </button>
          </div>
          <BottomNav
            active={cat === "free" ? "free" : "home"}
            onSoon={soon}
            onTab={(t) => {
              if (t === "home" || t === "free") {
                goCat(t === "home" ? "top" : "free");
                return true;
              }
              return false;
            }}
          />
        </div>

        {daily && (
          <div className="fixed inset-0 z-[65] mx-auto flex max-w-[480px] items-end bg-black/60" role="dialog" aria-label="오늘 밤의 한 문장" onClick={() => setDaily(false)}>
            <div className="w-full rounded-t-[28px] bg-[#FFFBF5] px-5 pb-8 pt-3 text-[#2B2326]" onClick={(e) => e.stopPropagation()}>
              <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-[#E6D9D3]" />
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-[#FFE6EC] px-2.5 py-1 text-[12px] font-extrabold text-[#B3263F]">{today.date} · 오늘 밤의 한 문장</span>
                <button type="button" onClick={() => setDaily(false)} className="text-[14px] text-[#8a7a7e]">
                  닫기
                </button>
              </div>
              <div className="mt-4 flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/wolhwa/doodle/girl_book.webp" alt="" aria-hidden className="h-[76px] w-[76px] shrink-0 object-contain mix-blend-multiply" />
                <p className="font-display m-0 text-[21px] font-bold leading-[1.5] [word-break:keep-all]">“{today.line}”</p>
              </div>
              <p className="m-0 mt-4 text-[15px] leading-[1.75] text-[#4a3d41] [word-break:keep-all]">{today.body}</p>
              <div className="mt-4 rounded-2xl border border-dashed border-[#E4B7C0] px-4 py-3">
                <span className="block text-[12px] font-bold text-[#B3263F]">오늘 밤 해 볼 한 가지</span>
                <span className="mt-0.5 block text-[15px] font-bold [word-break:keep-all]">{today.act}</span>
              </div>
              <Link href={u(`/column/${today.slug}`)} className="mt-4 block rounded-2xl bg-[#B3263F] py-3.5 text-center text-[15px] font-extrabold text-white">
                이어지는 칼럼 읽기 ›
              </Link>
              <p className="m-0 mt-3 text-center text-[12px] text-[#8a7a7e]">매일 밤 새 문장이 열려요</p>
            </div>
          </div>
        )}

        {toast && (
          <div role="status" className="fixed inset-x-0 bottom-[160px] z-50 mx-auto w-fit max-w-[90%] rounded-full bg-black/85 px-4 py-2.5 text-[13px] text-white">
            {toast}
          </div>
        )}

        {search && (
          <div className="fixed inset-0 z-[60] mx-auto max-w-[480px] overflow-y-auto bg-[#0B0B0C] px-4 pt-4" role="dialog" aria-label="검색">
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="home-search">찾고 싶은 것</label>
              <input
                id="home-search"
                autoFocus
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder="예: 카톡, 단답, 리포트"
                className="h-12 flex-1 rounded-xl border border-[#2A2A2E] bg-[#18181B] px-4 text-[16px] text-[#F5F5F5] outline-none placeholder:text-[#8a8a90]"
              />
              <button type="button" onClick={() => { setSearch(false); setKw(""); }} className="h-12 px-3 text-[15px] text-[#B5B5BA]">
                닫기
              </button>
            </div>
            <ul className="m-0 mt-3 list-none divide-y divide-[#2A2A2E] p-0">
              {found.map(([t, h]) => (
                <li key={t}>
                  <Link href={u(h)} className="flex items-center justify-between py-[14px] text-[15px] text-[#F5F5F5]">
                    {t}
                    <span className="text-[#E4627B]"><Chev /></span>
                  </Link>
                </li>
              ))}
              {found.length === 0 && <li className="py-6 text-center text-[14px] text-[#B5B5BA]">찾는 항목이 없어요</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
