"use client";

/**
 * 11/26 운영자 요청: 새 홈 화면 (/home) — 묘수사주 홈 구도에 맞춤 (모바일 390px 기준).
 * 묘수 실측: 상단 바 13px · 칩 16px · 대표 배너 340px 가운데 정렬(양옆 살짝 보임, 비활성 카드는 세로 90%)
 *   · 섹션 제목 20px/800 · 카드 제목 16px · 설명 13px · 분야별 카드 222px 가로 넘김 · 상황 카드 145px 가로 넘김
 * - 누적 숫자는 기존 월계수(Totals) 그대로.
 * - 가격·쿠폰 금액은 어디에도 표시하지 않는다. 후기·평점·숫자는 실제 데이터만.
 * - 들어올 때 붙은 utm 값은 다른 화면으로 이동할 때 그대로 넘긴다.
 * - 카카오 가입·쿠폰·질문·영상·보관함은 아직 정해지지 않아 1차에서는 '준비 중' 안내.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { readOrder } from "@/components/book/ResumeOrder";
import { BUSINESS } from "@/components/legal/LegalPage";
import { SHORTS } from "@/components/home2/media";

type Review = { id: number; rating: number; body: string; name: string; product: string; incentive: boolean };

const PRODUCT_LINE: Record<string, string> = {
  "관계 리추얼": "보낼까 말까 고민되는 밤",
  책: "보내기 직전의 나를 붙잡아 줄 책",
  "메시지 + 책": "지금 읽을 메시지와 곁에 둘 책",
  "카톡 대화 분석": "그 사람 마음, 대화에 남아 있어요",
};

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
const TT = "text-[16px] font-bold leading-[1.4] text-[#F5F5F5] [word-break:keep-all]";
const DS = "text-[13px] leading-[1.5] text-[#B5B5BA] [word-break:keep-all]";

const BANNERS = [
  { href: "/apply", img: "/wolhwa/v3/greet.webp", video: "/wolhwa/v3/greet.mp4" as string | null, who: "월화", title: "관계 리추얼", line: "보낼까 말까, 내 사연으로 같이 읽어요", tag: "무료 미리보기" },
  { href: "/chat", img: "/wolhwa/v3/explain.webp", video: null, who: "월화", title: "카톡 대화 분석", line: "그 사람 카톡, 숫자로 먼저 읽어 봐요", tag: "숫자 분석 무료" },
  { href: "/book", img: "/book/cover-3d.webp", video: null, who: "월화의 책", title: "보내기 전, 한 권", line: "보내기 직전의 나를 붙잡아 줄 책", tag: "책" },
];

const SITUATIONS: Array<[string, string, string, string]> = [
  ["제가 너무 많이 매달렸어요", "연락해도 되는 때", "관계 리추얼", "/apply?sit=1"],
  ["사과했는데 단답만 왔어요", "다시 건넬 말", "관계 리추얼", "/apply?sit=2"],
  ["같은 일로 또 싸웠어요", "반복되는 이유", "관계 리추얼", "/apply?sit=3"],
  ["놓고 싶은데 SNS를 계속 봐요", "잠 못 드는 밤", "관계 리추얼", "/apply?sit=4"],
  ["답장이 점점 짧아져요", "대화 온도 읽기", "카톡 분석", "/chat"],
  ["지금 당장 보내고 싶어요", "보내기 전 한 장", "월화의 책", "/book"],
];

const SEARCH: Array<[string, string]> = [
  ["월화의 관계 리추얼 · 내 사연으로 무료 미리보기", "/apply"],
  ["카톡 대화 분석 · 그 사람 카톡 숫자로 읽기", "/chat"],
  ["캡처로 카톡 분석하기", "/chat?start=quiz"],
  ["월화의 책 · 메시지 + 책 패키지", "/book"],
  ["보내면 안 되는 메시지 7가지 (무료)", "/free/no-send"],
  ...SITUATIONS.map(([t, , , h]) => [t, h] as [string, string]),
];

const CHIPS: Array<[string, string]> = [
  ["top", "전체"],
  ["ritual", "리추얼"],
  ["talk", "카톡 분석"],
  ["book", "책"],
  ["free", "무료"],
];

const FREE: Array<[string, string, string, string]> = [
  ["그 사람 카톡, 숫자로 읽기", "대화를 올리면 숫자로 먼저 보여 드려요", "/chat", "/wolhwa/v3/explain.webp"],
  ["보내면 안 되는 메시지 7가지", "연락하기 전에 먼저 읽는 가이드", "/free/no-send", "/book/pages/p01.webp"],
  ["내 사연으로 무료 미리보기", "사연을 들려주면 월화가 먼저 읽어 드려요", "/apply", "/wolhwa/v3/listen.webp"],
];

const GROUPS = [
  {
    id: "ritual",
    eb: "리추얼 분야",
    title: "다시 이을 실마리가 궁금하신가요?",
    items: [
      { img: "/wolhwa/v3/write.webp", who: "월화", t: "월화의 관계 리추얼", h: "/apply" },
      { img: "/book/v2/cover-3d.webp", who: "월화의 추천", t: "메시지 + 책 패키지", h: "/book" },
    ],
  },
  {
    id: "talk",
    eb: "카톡 분석 분야",
    title: "그 사람 마음, 대화에 이미 남아 있어요",
    items: [
      { img: "/wolhwa/v3/explain.webp", who: "월화", t: "카톡 대화 분석", h: "/chat" },
      { img: "/wolhwa/v3/listen.webp", who: "월화", t: "캡처로 분석하기", h: "/chat?start=quiz" },
    ],
  },
  {
    id: "book",
    eb: "책 분야",
    title: "보내기 직전의 당신을, 붙잡아 줄 책",
    items: [
      { img: "/book/cover-3d.webp", who: "월화의 책", t: "헤어진 뒤, 연락하지 말아야 할 때", h: "/book" },
      { img: "/book/pages/p01.webp", who: "월화의 책", t: "책 속 한 장 미리 보기", h: "/free/no-send" },
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
            {b.video && i >= N && i < 2 * N ? (
              <AutoVideo src={b.video} poster={b.img} label={`${b.title} 소개 영상`} className="absolute inset-0 h-full w-full object-cover object-top" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-top" />
            )}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-b from-transparent via-[#0B0B0C]/60 to-[#0B0B0C]/95" />
            <span className="absolute left-3 top-3 rounded-full bg-[#B3263F] px-2.5 py-1 text-[11px] font-bold text-white">{b.tag}</span>
            <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-bold text-white">
              {(i % N) + 1} / {N}
            </span>
            <span className="relative text-[13px] font-semibold text-[#F3B6C2]">{b.who}</span>
            <span className="font-display relative mt-0.5 text-[30px] leading-[1.25] text-white [word-break:keep-all]">{b.title}</span>
            <span className="relative mt-1.5 text-[14px] leading-[1.5] text-[#F5F5F5]/90 [word-break:keep-all]">{b.line}</span>
          </Link>
        ))}
      </div>
    </section>
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

  const goCat = (id: string) => {
    setCat(id);
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const found = kw.trim() ? SEARCH.filter(([t]) => t.replace(/\s/g, "").includes(kw.replace(/\s/g, ""))) : SEARCH;
  const resumeHref = saved ? saved.u || `/apply/preview?order=${encodeURIComponent(saved.o)}` : "/apply";

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] overflow-x-hidden bg-[#0B0B0C] text-[#F5F5F5]">
        {/* ① 상단 카카오 가입 쿠폰 바 */}
        <button type="button" onClick={() => soon("카카오 회원가입")} className="block h-[34px] w-full bg-[#7A1E31] px-4 text-center text-[13px] font-semibold text-white">
          카카오 1초 회원가입 후 쿠폰팩 받기 ›
        </button>

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
        <nav aria-label="카테고리" className="scrollbar-none flex gap-1 overflow-x-auto px-4 pt-1.5">
          {CHIPS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => goCat(id)}
              className={`h-[36px] shrink-0 rounded-full px-3 text-[16px] ${cat === id ? "bg-[#2A0D15] font-extrabold text-[#F5F5F5] ring-1 ring-[#8E2338]" : "font-medium text-[#B5B5BA]"}`}
            >
              {label}
            </button>
          ))}
        </nav>

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
                <img src="/wolhwa/v3/smile.webp" alt="" aria-hidden className="h-full w-full object-cover object-[50%_20%]" />
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
          <div className="mt-3 aspect-[16/10] overflow-hidden rounded-2xl bg-[#1E1E22]">
            <AutoVideo src="/wolhwa/wolhwa-reading-loop.mp4" poster="/wolhwa/reading-poster.webp" label="월하연 소개 영상" className="h-full w-full object-cover" />
          </div>
        </section>

        {/* ⑦ 후기 + 평점 — 실제 공개 후기만 */}
        <section className="px-4 pt-9" aria-label="후기">
          <p className="m-0 mb-1 text-[12.5px] font-semibold text-[#E4627B]">후기</p>
          <h2 className="m-0 text-[21px] font-black leading-[1.35] tracking-[-0.02em]">먼저 열어 본 분들의 이야기</h2>
          {reviews.length > 0 ? (
            <>
              <div className="scrollbar-none -mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4">
                {reviews.map((r) => (
                  <div key={r.id} className="flex w-full shrink-0 snap-center flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
                    <span className="text-[14px] font-bold">
                      {r.name} <Stars n={r.rating} />
                    </span>
                    <span className="line-clamp-3 text-[15px] leading-[1.65] text-[#F5F5F5] [word-break:keep-all]">{r.body}</span>
                    <span className="mt-1 flex items-center justify-between rounded-xl bg-[#232327] px-3 py-2.5">
                      <span>
                        <span className="block text-[14px] font-bold">{r.product}</span>
                        <span className={`block ${DS}`}>{PRODUCT_LINE[r.product] ?? "월하연"}</span>
                      </span>
                      <span className="text-[#B5B5BA]"><Chev /></span>
                    </span>
                    {r.incentive && <span className="text-[11px] text-[#8a8a90]">후기 작성 혜택을 받고 쓴 후기예요</span>}
                  </div>
                ))}
              </div>
              {rating !== null && (
                <div className="mt-4 text-center">
                  <p className="m-0 text-[16px] font-bold">
                    후기 평점 <span className="text-[#E4627B]">{rating.toFixed(1)}</span>
                  </p>
                  <p className="m-0 mt-1 text-[20px]"><Stars n={rating} /></p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="relative mt-3 pb-2">
                <span aria-hidden className="absolute inset-x-3 bottom-0 top-3 rounded-2xl border border-[#2A2A2E] bg-[#141417]" />
                <div className="relative flex flex-col gap-2 rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-4">
                  <span className="text-[14px] font-bold">실제 이용 후기</span>
                  <span className="text-[15px] leading-[1.65] text-[#F5F5F5] [word-break:keep-all]">
                    결과를 받은 분의 후기 중, 공개에 동의해 주신 것만 이 자리에 그대로 올려요. 지금 첫 후기를 모으고 있어요.
                  </span>
                  <span className="mt-1 flex items-center justify-between rounded-xl bg-[#232327] px-3 py-2.5">
                    <span>
                      <span className="block text-[14px] font-bold">월화의 관계 리추얼</span>
                      <span className={`block ${DS}`}>보낼까 말까 고민되는 밤</span>
                    </span>
                    <span className="text-[#B5B5BA]"><Chev /></span>
                  </span>
                </div>
              </div>
              <p className="m-0 mt-4 text-center text-[13px] text-[#B5B5BA]">후기 평점은 공개 후기가 모이면 표시돼요</p>
            </>
          )}
        </section>

        {/* ⑧ SNS에서 화제인 월하연 */}
        <section className="px-4 pt-11" aria-label="SNS 영상">
          <h2 className="m-0 text-center text-[24px] font-extrabold tracking-[-0.02em]">
            SNS에서 화제인 <span className="text-[#E4627B]">월하연</span>
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {SHORTS.slice(0, 3).map((s) => (
              <div key={s.id} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#1E1E22]">
                <AutoVideo src={s.src} poster={s.poster} label={s.title.replace(/\n/g, " ")} className="h-full w-full object-cover" />
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1 py-px text-[9px] text-white">AI 연출</span>
              </div>
            ))}
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
          <button type="button" onClick={() => soon("오늘 밤의 한 문장")} className="flex h-[100px] w-full items-center overflow-hidden rounded-2xl border border-[#2A2A2E] bg-[#18181B] text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wolhwa/v3/write.webp" alt="" aria-hidden className="h-full w-[40%] object-cover object-[50%_30%] [mask-image:linear-gradient(to_right,black_60%,transparent)]" />
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
          <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
            {FREE.map(([t, d, h, img], i) => (
              <li key={t}>
                <Link href={u(h)} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" aria-hidden loading="lazy" className="h-[72px] w-[104px] shrink-0 rounded-xl bg-[#1E1E22] object-cover object-[50%_25%]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#2A2A2E] text-[11px] font-bold text-[#E4627B]">{i + 1}</span>
                      <span className={TT}>{t}</span>
                    </span>
                    <span className={`mt-0.5 block truncate ${DS}`}>{d}</span>
                  </span>
                  <span className="text-[#B5B5BA]"><Chev /></span>
                </Link>
              </li>
            ))}
          </ol>
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
                  <img src={it.img} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover object-top" />
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-black/85" />
                  <span className="absolute inset-x-3.5 bottom-3.5">
                    <span className="block text-[12px] font-semibold text-[#F3B6C2]">{it.who}</span>
                    <span className="block text-[17px] font-bold leading-[1.35] text-white [word-break:keep-all]">{it.t}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* ⑭ 지금 이런 상황이라면 — 145px 가로 넘김 */}
        <section className="pt-9">
          <div className="flex items-baseline justify-between px-4">
            <h2 className="m-0 text-[16px] font-extrabold">지금 이런 상황이라면</h2>
            <button type="button" onClick={() => setSearch(true)} className="text-[12px] text-[#B5B5BA]">
              전체보기 ›
            </button>
          </div>
          <div className="scrollbar-none mt-3 flex snap-x gap-2 overflow-x-auto px-4">
            {SITUATIONS.map(([t, d, k, h]) => (
              <Link key={t} href={u(h)} className="flex h-[150px] w-[145px] shrink-0 snap-start flex-col rounded-2xl border border-[#2A2A2E] bg-[#18181B] p-3">
                <span className="text-[11px] font-bold text-[#E4627B]">{k}</span>
                <span className="mt-auto text-[16px] font-extrabold leading-[1.35] [word-break:keep-all]">{t}</span>
                <span className="mt-1 text-[13px] text-[#B5B5BA]">{d}</span>
              </Link>
            ))}
          </div>
        </section>

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
          <nav aria-label="하단 메뉴" className="pointer-events-auto grid h-[60px] grid-cols-5 border-t border-[#2A2A2E] bg-[#0B0B0C] text-[11px]">
            <button type="button" onClick={() => goCat("top")} className="flex flex-col items-center justify-center gap-1 font-bold text-[#E4627B]">
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>
              홈
            </button>
            <button type="button" onClick={() => goCat("free")} className="flex flex-col items-center justify-center gap-1 text-[#B5B5BA]">
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></svg>
              무료
            </button>
            {(
              [
                ["질문", <path key="q" d="M4 5h16v11H9l-5 4z" />],
                ["영상", <g key="v"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3z" /></g>],
                ["보관함", <g key="b"><path d="M4 8l8-4 8 4v8l-8 4-8-4z" /><path d="M4 8l8 4 8-4M12 12v8" /></g>],
              ] as Array<[string, React.ReactNode]>
            ).map(([label, icon]) => (
              <button key={label} type="button" onClick={() => soon(label)} className="flex flex-col items-center justify-center gap-1 text-[#B5B5BA]">
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">{icon}</svg>
                {label}
              </button>
            ))}
          </nav>
        </div>

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
                placeholder="예: 카톡, 단답, 책"
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
