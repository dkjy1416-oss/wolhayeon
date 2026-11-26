"use client";

/**
 * 11/26 운영자 요청: 새 홈 화면 (/home) — 시안(모바일 390px) 순서 그대로.
 * - 가격·쿠폰 금액은 어디에도 표시하지 않는다.
 * - 후기·평점·누적 숫자는 실제 데이터만, 없으면 칸을 숨긴다.
 * - 들어올 때 붙은 utm 값은 다른 화면으로 이동할 때 그대로 넘긴다.
 * - 카카오 가입·쿠폰·질문·영상·보관함은 아직 정해지지 않아 1차에서는 '준비 중' 안내.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { readOrder } from "@/components/book/ResumeOrder";
import RollingCount from "@/components/home3/RollingCount";
import { BUSINESS } from "@/components/legal/LegalPage";
import { SHORTS } from "@/components/home2/media";

type Review = { id: number; rating: number; body: string; name: string; product: string; incentive: boolean };
type Totals = { visitors: number; stories: number; previews: number };


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
    const join = path.includes("?") ? "&" : "?";
    /* 링크에 이미 있는 utm 은 덮지 않는다 */
    const own = new URLSearchParams(path.split("?")[1] ?? "");
    const add = new URLSearchParams(q);
    own.forEach((_, k) => add.delete(k));
    const s = add.toString();
    return `${path}${s ? join + s : ""}${hash ? `#${hash}` : ""}`;
  };
}

/* ---------- 작은 부품 ---------- */
function Chev() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
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
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
}

/* ---------- 본문 ---------- */
export default function HomeV4({ reviews, rating, totals }: { reviews: Review[]; rating: number | null; totals: Totals | null }) {
  const u = useUtm();
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ o: string; n: string } | null>(null);
  const [paid, setPaid] = useState(false);
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState(false);
  const [kw, setKw] = useState("");
  const bannerRef = useRef<HTMLDivElement>(null);

  const soon = (what: string) => {
    setToast(`${what}은(는) 준비 중이에요. 곧 열려요.`);
    window.setTimeout(() => setToast(null), 2200);
  };

  /* ⑤ 이어서 보기: 이 기기에서 무료 미리보기까지 끝낸 사람에게만 (주문번호만 기기에 저장) */
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

  const onBannerScroll = () => {
    const el = bannerRef.current;
    if (!el) return;
    const w = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 10 : el.clientWidth;
    setSlide(Math.max(0, Math.min(2, Math.round(el.scrollLeft / w))));
  };

  const BANNERS = [
    {
      href: "/apply",
      img: "/wolhwa/v3/greet.webp",
      video: "/wolhwa/v3/greet.mp4",
      who: "월화",
      title: "관계 리추얼",
      line: "“보낼까 말까, 내 사연으로 같이 읽어요”",
      tag: null as string | null,
    },
    { href: "/chat", img: "/wolhwa/v3/explain.webp", video: null, who: "월화", title: "카톡 대화 분석", line: "“그 사람 카톡, 숫자로 먼저 읽어 봐요”", tag: "카톡 대화 분석" },
    { href: "/book", img: "/book/cover-3d.webp", video: null, who: "월화의 책", title: "보내기 전, 한 권", line: "“보내기 직전의 나를 붙잡아 줄 책”", tag: "책" },
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
  const found = kw.trim() ? SEARCH.filter(([t]) => t.replace(/\s/g, "").includes(kw.replace(/\s/g, ""))) : SEARCH;

  const sec = "px-4 pt-10";
  const h2 = "text-[1.3rem] font-bold leading-snug text-[#F5F5F5] [word-break:keep-all]";
  const eb = "mb-1.5 text-[0.82rem] font-bold text-[#E4627B]";
  const sub = "mt-1.5 text-[0.9rem] text-[#B5B5BA] [word-break:keep-all]";

  const showTotals = !!totals && (totals.visitors > 0 || totals.stories > 0 || totals.previews > 0);

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-[#0B0B0C] pb-[150px] text-[#F5F5F5]">
        {/* ① 상단 카카오 가입 쿠폰 바 */}
        <button
          type="button"
          onClick={() => soon("카카오 회원가입")}
          className="block w-full bg-[#7A1E31] px-4 py-[11px] text-center text-[0.88rem] font-bold text-white"
        >
          카카오 1초 회원가입 후 쿠폰팩 받기 ›
        </button>

        {/* ② 로고 · 검색 · MY */}
        <header className="flex items-center justify-between px-5 pb-2 pt-3.5">
          <Link href={u("/home")} className="font-display text-[1.6rem] font-bold text-[#E4627B]">
            월하연 <span className="text-[0.88rem] text-[#B5B5BA]">月下緣</span>
          </Link>
          <div className="flex gap-1">
            <button type="button" aria-label="검색" onClick={() => setSearch(true)} className="flex h-11 w-11 items-center justify-center text-[#F5F5F5]">
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="MY"
              onClick={() => (saved && !paid ? (window.location.href = u(`/apply/preview?order=${encodeURIComponent(saved.o)}`)) : soon("MY"))}
              className="relative flex h-11 w-11 items-center justify-center text-[#F5F5F5]"
            >
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
              <span className="absolute -right-1 top-0 rounded-lg bg-[#F5F5F5] px-1.5 py-px text-[0.62rem] font-bold text-[#7A1E31]">쿠폰</span>
            </button>
          </div>
        </header>

        {/* ③ 카테고리 칩 */}
        <nav aria-label="카테고리" className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 pt-1 text-[1rem]">
          <a href="#top" className="shrink-0 rounded-full border border-[#8E2338] bg-[#2A0D15] px-3.5 py-2 font-bold">전체</a>
          <a href="#ritual" className="shrink-0 px-2.5 py-2 text-[#B5B5BA]">리추얼</a>
          <a href="#talk" className="shrink-0 px-2.5 py-2 text-[#B5B5BA]">카톡 분석</a>
          <a href="#book" className="shrink-0 px-2.5 py-2 text-[#B5B5BA]">책</a>
          <a href="#free" className="shrink-0 px-2.5 py-2 text-[#B5B5BA]">무료</a>
        </nav>

        {/* ④ 대표 배너 */}
        <section id="top" aria-label="대표 상품" className="scroll-mt-4 pt-[18px]">
          <div ref={bannerRef} onScroll={onBannerScroll} className="scrollbar-none flex snap-x snap-mandatory gap-2.5 overflow-x-auto pl-4 pr-10">
            {BANNERS.map((b, i) => (
              <Link
                key={b.href}
                href={u(b.href)}
                className={`relative flex h-[480px] w-[82%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl p-6 ${i === 0 ? "bg-[#5A1627]" : "border-2 border-[#E4627B] bg-[#18181B]"}`}
              >
                {b.video ? (
                  <AutoVideo src={b.video} poster={b.img} label={`${b.title} 소개 영상`} className="absolute inset-0 h-full w-full object-cover object-top" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.img} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-top" loading={i === 0 ? "eager" : "lazy"} />
                )}
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-black/60 to-black/90" />
                <span className="absolute right-3.5 top-3.5 rounded-xl bg-black/55 px-2.5 py-1 text-[0.74rem] text-white">
                  {i + 1} / {BANNERS.length}
                </span>
                {b.tag && <span className="absolute left-3.5 top-3.5 rounded-xl bg-[#B3263F] px-2.5 py-1 text-[0.74rem] font-bold text-white">{b.tag}</span>}
                <span className="relative text-[0.94rem] text-[#F3B6C2]">{b.who}</span>
                <span className="font-display relative text-[2.4rem] font-bold leading-[1.25] text-white">{b.title}</span>
                <span className="relative mt-2 text-[0.94rem] text-[#F5F5F5]">{b.line}</span>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
            {BANNERS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${slide === i ? "w-5 bg-[#E4627B]" : "w-1.5 bg-[#2A2A2E]"}`} />
            ))}
          </div>
        </section>

        {/* ⑤ 이어서 보기 — 미리보기를 끝낸 사람에게만 */}
        {saved && (
          <section className="px-4 pt-7" aria-label="이어서 보기">
            <p className={eb}>이어서 보기</p>
            <h2 className={h2}>{saved.n ? `${saved.n}님 ` : ""}미리보기가 완료됐어요</h2>
            <div className="mt-3 flex flex-col gap-2 rounded-[14px] bg-[#18181B] p-4">
              <span className="text-[0.82rem] font-bold text-[#E4627B]">월화의 관계 리추얼</span>
              <span className="text-[0.9rem] leading-[1.6] text-[#F5F5F5]">
                {paid ? "결과는 결제할 때 입력한 메일의 ‘결과 열기’ 링크로 다시 열 수 있어요." : "다시 쓰지 않고, 읽어 둔 미리보기를 그대로 이어볼 수 있어요."}
              </span>
              {!paid && (
                <Link href={u(`/apply/preview?order=${encodeURIComponent(saved.o)}`)} className="mt-1.5 rounded-[10px] bg-[#8E2338] py-3 text-center font-bold text-white">
                  내 결과 이어보기
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ⑥ 소개 영상 */}
        <section className={sec} aria-label="소개 영상">
          <h2 className={h2}>잠 못 드는 밤, 월하연과 함께</h2>
          <p className={sub}>보낼까 말까 고민되는 밤, 내 사연을 읽어 줄 사람을 만나 보세요</p>
          <div className="mt-3.5 overflow-hidden rounded-2xl bg-[#1E1E22]">
            <AutoVideo src="/wolhwa/hero-loop-mobile.mp4" poster="/wolhwa/hero-poster.webp" label="월하연 소개 영상" className="block aspect-[9/16] max-h-[560px] w-full object-cover" />
          </div>
        </section>

        {/* ⑦ 후기 + 평점 — 실제 공개 후기가 있을 때만 */}
        {reviews.length > 0 && (
          <section className="pl-4 pt-10" aria-label="후기">
            <p className={eb}>후기</p>
            <h2 className={h2}>먼저 열어 본 분들의 이야기</h2>
            <div className="scrollbar-none mt-3.5 flex snap-x gap-2.5 overflow-x-auto pr-4">
              {reviews.map((r) => (
                <div key={r.id} className="flex w-[270px] shrink-0 snap-start flex-col gap-2 rounded-[14px] bg-[#18181B] p-4">
                  <span className="text-[0.82rem] text-[#B5B5BA]">
                    {r.name} <span className="text-[#E4627B]">{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</span>
                  </span>
                  <span className="min-h-[90px] text-[0.88rem] leading-[1.6] [word-break:keep-all]">
                    {r.body.length > 120 ? `${r.body.slice(0, 120)}…` : r.body}
                  </span>
                  <span className="border-t border-[#2E2E33] pt-2.5 text-[0.82rem] text-[#B5B5BA]">
                    <b className="text-[0.88rem] text-[#F5F5F5]">{r.product}</b>
                    {r.incentive && <span className="block text-[0.72rem]">후기 혜택 제공</span>}
                  </span>
                </div>
              ))}
            </div>
            {rating !== null && (
              <p className="pr-4 pt-4 text-[0.94rem] font-bold">
                후기 평점 {rating.toFixed(1)} <span className="text-[#E4627B]">★</span>
                <span className="ml-1 text-[0.8rem] font-normal text-[#B5B5BA]">· 공개 동의한 실제 후기 {reviews.length}개 기준</span>
              </p>
            )}
          </section>
        )}

        {/* ⑧ SNS에서 화제인 월하연 — AI 영상에는 'AI 연출' */}
        <section className="pl-4 pt-10" aria-label="SNS 영상">
          <h2 className={h2}>SNS에서 화제인 월하연</h2>
          <div className="scrollbar-none mt-3.5 flex gap-2 overflow-x-auto pr-4">
            {SHORTS.slice(0, 3).map((s) => (
              <div key={s.id} className="relative aspect-[9/16] w-[150px] shrink-0 overflow-hidden rounded-xl bg-[#1E1E22]">
                <AutoVideo src={s.src} poster={s.poster} label={s.title.replace(/\n/g, " ")} className="h-full w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.62rem] text-white">AI 연출</span>
              </div>
            ))}
          </div>
        </section>

        {/* ⑨ 누적 숫자 — 실제 집계만, 0이면 그 칸 숨김 */}
        {showTotals && totals && (
          <section className={`${sec} text-center`} aria-label="누적 숫자">
            <h2 className={`${h2} leading-[1.4]`}>
              이미 많은 분이
              <br />
              월하연을 찾았어요
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(
                [
                  ["누적 방문자", totals.visitors, "명"],
                  ["사연을 들려준 분", totals.stories, "명"],
                  ["무료 미리보기", totals.previews, "번"],
                ] as Array<[string, number, string]>
              )
                .filter(([, v]) => v > 0)
                .map(([k, v, unit]) => (
                  <div key={k} className="rounded-[14px] bg-[#18181B] px-1.5 py-4">
                    <div className="text-[0.78rem] text-[#B5B5BA]">{k}</div>
                    <div className="font-display mt-1.5 text-[1.3rem] font-bold text-[#E4627B]">
                      <RollingCount value={v} />
                      {unit}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ⑩ 카카오 회원 전용 쿠폰팩 배너 — 쿠폰 내용·금액은 정해지면 */}
        <section id="kakao" className="px-4 pt-7">
          <div className="flex flex-col gap-1.5 rounded-2xl bg-[#7A1E31] px-5 py-[22px]">
            <span className="text-[0.82rem] font-bold text-[#F3B6C2]">카카오 회원 전용</span>
            <span className="font-display text-[1.75rem] font-bold text-white">첫 방문 쿠폰팩</span>
            <span className="text-[0.88rem] text-[#F5F5F5]">가입하면 쿠폰함에 바로 들어가요</span>
            <button type="button" onClick={() => soon("카카오 회원가입")} className="mt-2.5 rounded-[10px] bg-[#FEE500] py-3.5 text-center font-bold text-[#191919]">
              카카오 1초 회원가입하고 받기
            </button>
          </div>
        </section>

        {/* ⑪ 매일 무료 카드 — 콘텐츠 정해지면 연결 */}
        <section className="px-4 pt-4">
          <button type="button" onClick={() => soon("오늘 밤의 한 문장")} className="flex w-full items-center justify-between rounded-[14px] bg-[#18181B] px-4 py-[18px] text-left">
            <span className="flex flex-col gap-1">
              <span className="text-[0.82rem] font-bold text-[#E4627B]">매일 · 무료</span>
              <span className="text-[1.12rem] font-bold">오늘 밤의 한 문장</span>
              <span className="text-[0.82rem] text-[#B5B5BA]">월화가 건네는 오늘의 한 줄</span>
            </span>
            <span className="text-[#E4627B]">
              <Chev />
            </span>
          </button>
        </section>

        {/* ⑫ 무료로 보는 월하연 한 입 */}
        <section id="free" className={`${sec} scroll-mt-4`}>
          <h2 className={h2}>무료로 보는 월하연 한 입</h2>
          <ol className="mt-2 list-none p-0">
            {(
              [
                ["그 사람 카톡, 숫자로 읽기", "대화를 올리면 숫자로 먼저 보여 드려요", "/chat"],
                ["보내면 안 되는 메시지 7가지", "연락하기 전에 먼저 읽는 가이드", "/free/no-send"],
                ["내 사연으로 무료 미리보기", "사연을 들려주면 월화가 먼저 읽어 드려요", "/apply"],
              ] as Array<[string, string, string]>
            ).map(([t, d, h], i, arr) => (
              <li key={t} className={i < arr.length - 1 ? "border-b border-[#2A2A2E]" : ""}>
                <Link href={u(h)} className="flex items-center gap-3.5 py-3.5">
                  <span className="font-display w-5 text-[1.4rem] font-bold text-[#E4627B]">{i + 1}</span>
                  <span>
                    <span className="block text-[1rem] font-bold">{t}</span>
                    <span className="block text-[0.82rem] text-[#B5B5BA]">{d}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ⑬ 분야별 카드 */}
        {(
          [
            {
              id: "ritual",
              eb: "리추얼 분야",
              title: "다시 이을 실마리가 궁금하신가요?",
              items: [
                { img: "/wolhwa/v3/write.webp", who: "월화", t: "월화의 관계 리추얼", d: "내 사연으로 쓰는 편지와 가이드", h: "/apply" },
                { img: "/book/v2/cover-3d.webp", who: "월화의 추천", t: "메시지 + 책 패키지", d: "지금 읽을 메시지와 곁에 둘 책", h: "/book" },
              ],
            },
            {
              id: "talk",
              eb: "카톡 분석 분야",
              title: "그 사람 마음, 대화에 이미 남아 있어요",
              items: [
                { img: "/wolhwa/v3/explain.webp", who: "월화", t: "카톡 대화 분석", d: "숫자 분석은 무료, 해석은 리포트로", h: "/chat" },
                { img: "/wolhwa/v3/listen.webp", who: "월화", t: "캡처로 분석하기", d: "파일 내보내기가 어렵다면", h: "/chat?start=quiz" },
              ],
            },
            {
              id: "book",
              eb: "책 분야",
              title: "보내기 직전의 당신을, 한 번만 붙잡아 줄 책",
              items: [
                { img: "/book/cover-3d.webp", who: "월화의 책", t: "헤어진 뒤, 연락하지 말아야 할 때", d: "내 이름으로 다시 쓴 한 권", h: "/book" },
                { img: "/book/pages/p01.webp", who: "월화의 책", t: "책 속 한 장 미리 보기", d: "보내면 안 되는 메시지 7가지", h: "/free/no-send" },
              ],
            },
          ] as const
        ).map((g) => (
          <section key={g.id} id={g.id} className={`${sec} scroll-mt-4`}>
            <p className={eb}>{g.eb}</p>
            <h2 className={h2}>{g.title}</h2>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              {g.items.map((it) => (
                <Link key={it.t} href={u(it.h)} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.img} alt="" aria-hidden loading="lazy" className="mb-1 h-[200px] w-full rounded-xl bg-[#1E1E22] object-cover object-top" />
                  <span className="text-[0.82rem] font-bold text-[#E4627B]">{it.who}</span>
                  <span className="text-[1rem] font-bold leading-snug [word-break:keep-all]">{it.t}</span>
                  <span className="text-[0.82rem] text-[#B5B5BA] [word-break:keep-all]">{it.d}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* ⑭ 지금 이런 상황이라면 */}
        <section className={sec}>
          <h2 className={h2}>지금 이런 상황이라면</h2>
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {SITUATIONS.map(([t, d, k, h]) => (
              <Link key={t} href={u(h)} className="flex min-h-[96px] flex-col gap-1.5 rounded-[14px] bg-[#18181B] p-3.5">
                <span className="text-[0.94rem] font-bold leading-snug [word-break:keep-all]">{t}</span>
                <span className="text-[0.82rem] text-[#B5B5BA]">{d}</span>
                <span className="mt-auto text-[0.82rem] font-bold text-[#E4627B]">{k}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ⑮ 푸터 */}
        <footer className="mt-10 bg-[#050505] px-5 pb-10 pt-6 text-[0.75rem] leading-[1.8] text-[#B5B5BA]">
          <p className="font-display mb-3 text-[1rem] text-[#F5F5F5]">
            월하연 <span className="text-[#E4627B]">月下緣</span>
          </p>
          <p className="m-0">
            {BUSINESS.company} · 대표 {BUSINESS.ceo} · 사업자등록번호 {BUSINESS.regNo}
          </p>
          <p className="m-0">
            통신판매업 신고번호 {BUSINESS.mailOrderNo} · {BUSINESS.address}
          </p>
          <p className="m-0 mb-2">
            고객센터 {BUSINESS.phone} · {BUSINESS.email}
          </p>
          <p className="m-0 mb-2">월하연은 특정 상대방의 감정·연락·재회·행동 또는 미래의 결과를 보장하지 않습니다.</p>
          <p className="m-0">
            <Link href="/guide" className="text-[#B5B5BA]">서비스 소개</Link> · <Link href="/refund" className="text-[#B5B5BA]">환불정책</Link> ·{" "}
            <Link href="/privacy" className="text-[#B5B5BA]">개인정보처리방침</Link> · <Link href="/business" className="text-[#B5B5BA]">사업자정보</Link>
          </p>
        </footer>

        {/* 하단 고정: 카카오 가입 바 + 하단 메뉴 (떠 있는 고객센터 버튼은 사이트 공통 위젯이 이 위에 놓임) */}
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px]">
          <div className="px-4 pb-3.5">
            <button
              type="button"
              onClick={() => soon("카카오 회원가입")}
              className="flex w-full items-center justify-between rounded-[14px] bg-[#FEE500] px-[18px] py-3.5 text-[0.94rem] font-bold text-[#191919] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            >
              카카오 1초 회원가입 후 쿠폰팩 받기
              <Chev />
            </button>
          </div>
          <nav aria-label="하단 메뉴" className="grid h-16 grid-cols-5 border-t border-[#2A2A2E] bg-[#0B0B0C] pb-[env(safe-area-inset-bottom)] text-[0.7rem]">
            <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex flex-col items-center justify-center gap-1 font-bold text-[#E4627B]">
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>
              홈
            </a>
            <a href="#free" className="flex flex-col items-center justify-center gap-1 text-[#B5B5BA]">
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12l3 3 5-6" /></svg>
              무료
            </a>
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

        {/* 안내 토스트 */}
        {toast && (
          <div role="status" className="fixed inset-x-0 bottom-[170px] z-50 mx-auto w-fit max-w-[90%] rounded-full bg-black/85 px-4 py-2.5 text-[0.84rem] text-white">
            {toast}
          </div>
        )}

        {/* 검색 */}
        {search && (
          <div className="fixed inset-0 z-[60] mx-auto max-w-[480px] bg-[#0B0B0C] px-4 pt-4" role="dialog" aria-label="검색">
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="home-search">찾고 싶은 것</label>
              <input
                id="home-search"
                autoFocus
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder="예: 카톡, 단답, 책"
                className="h-12 flex-1 rounded-xl border border-[#2A2A2E] bg-[#18181B] px-4 text-[1rem] text-[#F5F5F5] outline-none placeholder:text-[#8a8a90]"
              />
              <button type="button" onClick={() => { setSearch(false); setKw(""); }} className="h-12 px-3 text-[0.92rem] text-[#B5B5BA]">
                닫기
              </button>
            </div>
            <ul className="mt-3 divide-y divide-[#2A2A2E]">
              {found.map(([t, h]) => (
                <li key={t}>
                  <Link href={u(h)} className="flex items-center justify-between py-3.5 text-[0.95rem]">
                    {t}
                    <span className="text-[#E4627B]"><Chev /></span>
                  </Link>
                </li>
              ))}
              {found.length === 0 && <li className="py-6 text-center text-[0.9rem] text-[#B5B5BA]">찾는 항목이 없어요</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
