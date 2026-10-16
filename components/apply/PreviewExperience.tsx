"use client";

/**
 * 결제 전 무료 미리보기 화면 (읽기 몰입판).
 * 흐름: 읽는 중(loop 영상) → 같은 화면에서 fade 전환 → 개인화 preview → 처음으로 가격 노출.
 * - 개인화 preview가 ready일 때만 미리보기+결제 CTA 표시.
 *   실패 시에는 loop 영상 + "다시 읽어보기"만 (결제 버튼 절대 없음).
 * - 특정 시간 약속 / 가짜 진행률 / 가짜 단계 없음.
 * - 일시적 생성 실패(failed)는 짧게 자동 재시도 후에만 실패 화면으로.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  getOrCreateSubmissionId,
  loadApplication,
} from "@/lib/ritual-storage";
import {
  RITUAL_PRICE_KRW,
  isAllowedPrice,
  listPriceKRW,
  priceBadge,
  PROMO_DEADLINE_TEXT,
  isPromoActive,
  BOOK_PRICE_KRW,
  BUNDLE_REGULAR_PRICE_KRW,
  bundlePrice,
  FIRST_OFFER_BUNDLE_PRICE_KRW,
  regularPriceFor,
  optionLabel,
  RELATIONSHIP_DURATION_OPTIONS,
  BREAKUP_ELAPSED_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  PARTNER_NEW_RELATIONSHIP_OPTIONS,
  PRODUCTS,
} from "@/lib/ritual-types";
import DevPaymentNotice from "@/components/apply/DevPaymentNotice";
import { PAYMENTS_OPEN, BOOK_SALES_OPEN } from "@/lib/payment-availability";
import PreviewWaiting from "@/components/apply/PreviewWaiting";
import ShareStoryCard from "@/components/apply/ShareStoryCard";
import OfferCountdown from "@/components/pay/OfferCountdown";
import ResultExampleCard from "@/components/apply/ResultExampleCard";
import LoopVideo from "@/components/book/LoopVideo";
import { DELIVERY_TIME_TEXT, DELIVERY_DELAY_TEXT, HOW_IT_WORKS } from "@/lib/service-facts";
import { rememberOrder } from "@/components/book/ResumeOrder";
import { logPayEvent } from "@/lib/pay-events";
import { loadWant, type WantProduct } from "@/lib/purchase-intent";
import { trackEvent } from "@/lib/analytics";
import { pickSituationGuides, type GuidePick } from "@/lib/situation-guide";
import { CONTENT_VIEW_DAYS } from "@/lib/content-access-policy";
import { REFUND_WINDOW_DAYS } from "@/lib/refund-policy";
import {
  NOW_STANCE_LABELS,
} from "@/lib/preview-display";

interface Preview {
  intro_lines: string[];
  preview_letter_excerpt: string[];
  relationship_state: { label: string; text: string };
  partner_reading: { modes: string[]; text: string };
  cautions: { action: string; why: string }[];
  now_plan: {
    stance: "wait" | "light_contact" | "hold_boundary";
    period: string;
    why: string;
    watch: string[];
    decide_rule: string;
  };
  love100?: string[];
  cta_lead_text?: string;
  /* v5 — 판정 카드 · 판단 근거 · 감정 연결 (구버전 저장본엔 없음 → 화면에서 대체) */
  verdict?: { risk: string; need: string };
  reasons?: string[];
  bridge?: string[];
}

/* 상황 구분: 서버(신청 내용 + 무료 결과)가 정해서 코드만 보낸다 */
type Situation = "boundary" | "lover" | "light" | "wait";
type Stance = Preview["now_plan"]["stance"];

/** 판정 카드 '지금 연락' — 무료에서는 방향까지만 (기간·날짜는 전체 결과에서) */
const CONTACT_VERDICT: Record<Stance, string> = {
  wait: "잠시 멈추는 편이 좋아요",
  light_contact: "짧고 가볍게는 괜찮아요",
  hold_boundary: "지금은 거리를 지켜요",
};
const NEED_DEFAULT: Record<Stance, string> = {
  wait: "상대의 피로부터 낮추기",
  light_contact: "가볍게 답할 수 있는 거리",
  hold_boundary: "거리 존중하며 내 하루 지키기",
};

/** 구버전 저장본: 긴 행동 문장을 카드용으로 짧게 */
function shortAction(text: string): string {
  const t = text.replace(/[“”"']/g, "").trim();
  return t.length <= 16 ? t : `${t.slice(0, 15).trim()}…`;
}

/** 잠금 영역·비교표·하단 문구 — 실제 전체 결과에 들어 있는 것만 적는다 (UI 고정, AI가 약속을 늘리지 못하게).
 *  ph는 흐림 처리용 자리표시 문장(실제 결과 아님 — 유출 불가). */
type LockCopy = {
  title: string;
  desc: string;
  items: Array<{ t: string; ph: string }>;
  compare: Array<[string, boolean]>;
  recap: [string, string];
  bottomCta: string;
  bridge: string[];
};
const CONTACT_LOCK: LockCopy = {
  title: "그렇다면 언제 연락해야 할까요?",
  desc: "지금부터는 관계를 다시 움직이기 위한 실제 행동이 필요합니다.",
  items: [
    { t: "나에게 맞는 연락 시점", ph: "이 조건이 채워진 다음, 그때 한 번 짧고 가볍게" },
    { t: "첫 연락 실제 문장", ph: "잘 지내? 갑자기 생각나서 연락했어 부담 갖지 말고" },
    { t: "상대가 답장했을 때 다음 답장", ph: "반가운 답이 오면 이렇게 이어서 한 번만" },
    { t: "단답·읽씹·무응답일 때 대응", ph: "답이 짧거나 없을 때는 여기서 멈추고 기다리기" },
    { t: "24시간·7일·21일 행동 플랜", ph: "첫날 할 일과 일주일 동안 지킬 것, 셋째 주의 기준" },
  ],
  compare: [
    ["관계 상태 분석", true],
    ["상대 감정 분석", true],
    ["연락 타이밍", true],
    ["실제 메시지 문장", true],
    ["21일 행동 플랜", true],
    ["개인 맞춤 PDF 책", false],
    ["PDF로 내려받아 보관", false],
  ],
  recap: ["이미 지금 해야 할 행동은 어느 정도 보였어요.", "이제 필요한 건 타이밍과 실제 문장입니다."],
  bottomCta: "내 연락 타이밍과 메시지 보기",
  bridge: [
    "지금 아무것도 하지 않는 것이 가장 답답할 수 있어요.",
    "하지만 관계가 다시 움직이려면, 연락보다 먼저 상대가 느끼는 감정의 압박을 낮추는 시간이 필요해요.",
    "문제는 기다릴지 말지가 아니라, 얼마나 기다리고 어떤 말로 다시 시작하느냐예요.",
  ],
};
const LOCK_COPY: Record<Situation, LockCopy> = {
  wait: CONTACT_LOCK,
  light: CONTACT_LOCK,
  lover: {
    ...CONTACT_LOCK,
    title: "그렇다면 언제, 어떻게 다시 이야기를 꺼내야 할까요?",
    desc: "지금부터는 같은 싸움을 반복하지 않기 위한 실제 행동이 필요합니다.",
    items: [
      { t: "이야기를 다시 꺼낼 시점", ph: "감정이 가라앉은 다음, 이 조건일 때 한 번" },
      { t: "비난 없이 꺼내는 첫마디 문장", ph: "그때 내가 서운했던 건 네가 아니라 그 순간이었어" },
      { t: "상대가 답했을 때 다음 말", ph: "이렇게 답이 오면 이어서 이 말까지만" },
      { t: "단답·회피할 때 대응", ph: "짧게 넘기려 할 때는 여기서 멈추고" },
      { t: "24시간·7일·21일 행동 플랜", ph: "첫날 할 일과 일주일 동안 지킬 것, 셋째 주의 기준" },
    ],
    compare: [
      ["관계 상태 분석", true],
      ["상대 감정 분석", true],
      ["대화를 꺼낼 타이밍", true],
      ["실제 대화 문장", true],
      ["21일 행동 플랜", true],
      ["개인 맞춤 PDF 책", false],
      ["PDF로 내려받아 보관", false],
    ],
    recap: ["이미 지금 하지 말아야 할 것은 보였어요.", "이제 필요한 건 꺼낼 타이밍과 실제 문장입니다."],
    bottomCta: "내 대화 타이밍과 문장 보기",
    bridge: [
      "지금 아무 말도 하지 않는 게 가장 답답할 수 있어요.",
      "하지만 대화가 다시 열리려면, 서운함을 설명하기보다 상대가 느끼는 부담을 먼저 낮추는 시간이 필요해요.",
      "문제는 말할지 말지가 아니라, 언제 어떤 말로 다시 이야기를 꺼내느냐예요.",
    ],
  },
  boundary: {
    title: "그렇다면 지금, 무엇을 해야 할까요?",
    desc: "지금부터는 거리를 지키면서 내 하루를 붙잡는 실제 행동이 필요합니다.",
    items: [
      { t: "내가 지킬 거리의 기준", ph: "상대가 먼저 거리를 풀기 전까지 이 선은 넘지 않기" },
      { t: "연락하고 싶어질 때 바로 할 행동", ph: "보내기 전에 이것부터 하고 그래도 남으면" },
      { t: "상대 소식을 접했을 때 대처", ph: "SNS나 지인을 통해 소식을 들었을 때는" },
      { t: "흔들리는 밤에 꺼내 볼 문장", ph: "오늘 하루를 지킨 나에게 먼저 건네는 말" },
      { t: "24시간·7일·21일 행동 플랜", ph: "첫날 할 일과 일주일 동안 지킬 것, 셋째 주의 기준" },
    ],
    compare: [
      ["관계 상태 분석", true],
      ["상대 반응 해석", true],
      ["거리를 지키는 기준", true],
      ["흔들릴 때 대처", true],
      ["21일 행동 플랜", true],
      ["개인 맞춤 PDF 책", false],
      ["PDF로 내려받아 보관", false],
    ],
    recap: ["이미 지금 하지 말아야 할 것은 보였어요.", "이제 필요한 건 흔들릴 때 붙잡을 기준입니다."],
    bottomCta: "내 다음 행동 플랜 보기",
    bridge: [
      "아무것도 하지 않는 지금이 가장 답답할 수 있어요.",
      "하지만 지금은 거리를 좁히는 것보다, 내 하루가 흔들리지 않는 게 먼저예요.",
      "문제는 기다릴지 말지가 아니라, 얼마나 거리를 지키고 흔들릴 때 무엇을 하느냐예요.",
    ],
  },
};

/** 전체 분석의 역할 (무료와 구분) · 주 구매 버튼 문구 — 실제 결과 part_06 범위 안에서만 (10/12 개발지시서 3·5) */
const ROLE_PAID: Record<Situation, string> = {
  wait: "내 상황에 맞는 연락 기준 · 메시지 초안 · 반응별 대응까지",
  light: "내 상황에 맞는 연락 기준 · 메시지 초안 · 반응별 대응까지",
  lover: "다시 이야기할 기준 · 첫마디 초안 · 반응별 대응까지",
  boundary: "내가 지킬 거리 기준 · 흔들릴 때 행동 · 상황별 대응까지",
};

/** 결제 직전 FAQ — 실제 운영 기준과 일치하는 고정 문구 */
const FAQ = [
  {
    q: "결과가 모두 똑같은가요?",
    a: "아닙니다. 입력한 관계 상태, 마지막 연락, 상대 반응 등을 기준으로 결과 내용이 달라집니다.",
  },
  {
    q: "언제 결과를 볼 수 있나요?",
    a: "결제 후 결과 생성이 완료되면 바로 확인할 수 있어요. 보통 1~3분이면 완성되고, 링크를 이메일로도 보내 드려요. 늦어지면 결과 화면과 메일 링크에서 진행 상태를 확인할 수 있어요.",
  },
  {
    q: "다시 볼 수 있나요?",
    a: `결과는 결제일로부터 ${CONTENT_VIEW_DAYS}일 동안 같은 링크로 다시 확인할 수 있어요. 월화 패키지의 PDF 책은 결제일로부터 60일 안에 내려받으면 계속 보관할 수 있어요.`,
  },
];

/** 첫 문장만 (마침표·물음표·느낌표 기준, 너무 짧거나 없으면 전체) */
function firstSentence(text: string): string {
  const t = (text ?? "").trim();
  const m = t.match(/^(.{12,}?[.!?。])(\s|$)/);
  return m ? m[1] : t;
}

/** full-bleed 몰입형 루프 배경 — 플레이어/카드처럼 보이지 않게.
 *  상하단은 ink로 녹아들고, 텍스트 가독성용 하단 오버레이 포함 */
function FullBleedReading({
  src,
  poster,
  minH = "min-h-[88svh]",
  children,
}: {
  src: string | null;
  poster: string | null;
  minH?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative ${minH} overflow-hidden`}>
      <div className="absolute inset-0" aria-hidden>
        {src ? (
          <video
            className="h-full w-full object-cover object-[50%_26%]"
            src={src}
            poster={poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-[#141019] via-ink-soft to-ink" />
        )}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink via-ink/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink via-ink/85 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(13,13,15,0.5)_100%)]" />
      </div>
      <div className={`relative flex ${minH} flex-col justify-end px-6 pb-12`}>
        {children}
      </div>
    </section>
  );
}

export default function PreviewExperience({
  orderNumber,
  previewToken,
  continueToken,
  readingVideo,
  readingPoster,
}: {
  orderNumber: string;
  previewToken: string | null;
  continueToken: string | null;
  readingVideo: string | null;
  readingPoster: string | null;
}) {
  const [phase, setPhase] = useState<"loading" | "ready" | "delayed" | "expired">(
    "loading"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState<string>("");
  /* 주문별 결제 금액 — 사과 쿠폰 적용 주문이면 쿠폰가 */
  const [price, setPrice] = useState<number>(() => listPriceKRW());
  const [situation, setSituation] = useState<Situation | null>(null);
  /* 첫 구매가 마감 시각 (신청 후 24시간 · 서버가 정함) */
  const [offerEndsAt, setOfferEndsAt] = useState<number | null>(null);
  const [showLoading, setShowLoading] = useState(false);
  const [slowNote, setSlowNote] = useState(false); // 15초 이상 걸릴 때 안심 문구
  const tries = useRef(0); // pending 폴링 횟수
  const genFails = useRef(0); // 생성 실패(failed) 자동 재시도 횟수
  const fallbackRetries = useRef(0); // 템플릿 폴백 수신 시 AI 재시도 횟수
  const started = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* 내 사연에서 반영한 사실 (10/16 지시문 6) — 이 기기의 신청 데이터 중 선택 항목 라벨만 (자유 입력 원문은 쓰지 않음) */
  const [facts, setFacts] = useState<string[]>([]);
  const [guides, setGuides] = useState<GuidePick[]>([]);
  useEffect(() => {
    /* 같은 브라우저 세션의 신청 데이터에서 표시용 이름·선택 항목만 */
    try {
      const a = loadApplication();
      setName(a.applicant_name?.trim() ?? "");
      const f: string[] = [];
      const dur = optionLabel(RELATIONSHIP_DURATION_OPTIONS, a.relationship_duration || null);
      const el = optionLabel(BREAKUP_ELAPSED_OPTIONS, a.breakup_elapsed || null);
      if (dur || el) f.push([dur && `함께한 기간 ${dur}`, el && `헤어진 지 ${el}`].filter(Boolean).join(" · "));
      const lc = optionLabel(LAST_CONVERSATION_OPTIONS, a.last_conversation || null);
      if (lc) f.push(`마지막 대화 · ${lc}`);
      const cs = optionLabel(CONTACT_STATUS_OPTIONS, a.contact_status || null);
      if (cs) f.push(`지금 연락 상태 · ${cs}`);
      const nr = optionLabel(PARTNER_NEW_RELATIONSHIP_OPTIONS, a.partner_new_relationship || null);
      if (nr && f.length < 3) f.push(`상대의 새 사람 · ${nr}`);
      setFacts(f.filter(Boolean).slice(0, 3));
      setGuides(pickSituationGuides(a));
    } catch {
      /* 이름 없이 진행 */
    }
  }, []);

  const scheduleRetry = (delayMs: number) => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => {
      retryTimer.current = null;
      fetchPreview();
    }, delayMs);
  };

  const fetchPreview = async () => {
    tries.current += 1;
    const startedAt = Date.now();
    try {
      const res = await fetch("/api/rituals/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          submissionId: getOrCreateSubmissionId(),
          previewToken,
          continueToken,
        }),
      });
      const json = await res.json().catch(() => null);
      if (json?.status === "ready" && json.preview) {
        /* 템플릿 폴백(generated === false)이면 화면에 바로 보여주지 않고
           읽는 화면을 유지한 채 AI 생성을 한 번 더 기다린다.
           - 폴백은 서버에 저장되지 않으므로 재요청 시 AI를 다시 시도한다.
           - 한 번 더 실패하면 그때는 폴백이라도 보여준다 (화면이 비면 안 됨). */
        /* 첫 시도가 오래 걸렸으면(AI가 느린 상황) 손님을 또 기다리게 하지 않고 바로 보여준다 */
        if (json.generated === false && fallbackRetries.current < 1 && Date.now() - startedAt < 20_000) {
          fallbackRetries.current += 1;
          scheduleRetry(1500);
          return;
        }
        if (typeof json.applicantName === "string" && json.applicantName.trim()) {
          setName(json.applicantName.trim());
        }
        if (isAllowedPrice(json.paymentAmount)) setPrice(json.paymentAmount);
        if (typeof json.situation === "string" && json.situation in LOCK_COPY)
          setSituation(json.situation as Situation);
        setOfferEndsAt(typeof json.offerEndsAt === "number" ? json.offerEndsAt : null);
        setPreview(json.preview as Preview);
        setPhase("ready");
        try {
          const key = `wh_ev_preview_${orderNumber}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            trackEvent("preview_view", { order: orderNumber });
          }
        } catch {
          /* storage 사용 불가 시 중복보다 이벤트 누락을 선택 */
        }
        return;
      }
      if (json?.status === "pending") {
        if (tries.current < 14) {
          scheduleRetry(2500);
          return;
        }
        /* 안내 화면으로 바뀌어도 자동 폴링을 계속한다.
           stale claim(70초)을 넘길 수 있도록 여유를 둔다. */
        if (tries.current < 32) {
          setPhase("delayed");
          scheduleRetry(2500);
          return;
        }
        setPhase("delayed");
        return;
      }

      /* 링크(접근 토큰)가 만료된 경우 — 재시도해도 소용없으니 바로 안내 화면으로 */
      if (res.status === 404 || json?.error === "not_found") {
        setPhase("expired");
        return;
      }

      const transientFailure =
        json?.status === "failed" ||
        json?.error === "failed" ||
        json?.status === "server_error" ||
        json?.error === "server_error" ||
        [500, 502, 503, 504].includes(res.status);

      if (transientFailure && genFails.current < 2) {
        genFails.current += 1;
        scheduleRetry(3000);
        return;
      }
      setPhase("delayed");
    } catch {
      if (tries.current < 4) {
        scheduleRetry(2500);
      } else {
        setPhase("delayed");
        if (tries.current < 32) scheduleRetry(2500);
      }
    }
  };

  useEffect(() => {
    if (started.current) return; // StrictMode/재마운트 중복 호출 방지
    started.current = true;

    /* 직전 확인 화면에서 주문 저장과 동시에 만들어 둔 preview가 있으면
       두 번째 네트워크 왕복 없이 바로 공개한다. */
    try {
      const key = `wolhayeon_preview_prefetch:${orderNumber}`;
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const cached = JSON.parse(raw);
        if (
          cached?.preview &&
          Array.isArray(cached.preview.intro_lines) &&
          cached.preview.intro_lines.length === 3 &&
          Array.isArray(cached.preview.preview_letter_excerpt) &&
          Array.isArray(cached.preview.cautions) &&
          !!cached.preview.now_plan &&
          !!cached.preview.relationship_state
        ) {
          if (
            typeof cached.applicantName === "string" &&
            cached.applicantName.trim()
          ) {
            setName(cached.applicantName.trim());
          }
          setPreview(cached.preview as Preview);
          setPhase("ready");
          sessionStorage.removeItem(key);
          return;
        }
      }
    } catch {
      /* cache가 없거나 손상되면 기존 서버 조회로 안전하게 fallback */
    }

    fetchPreview();

    /* 정상적인 빠른 응답에서는 로딩 문구 자체가 보이지 않게 하고,
       350ms 이상 걸릴 때만 영상 로딩 화면을 표시한다. */
    const loadingTimer = setTimeout(() => setShowLoading(true), 350);
    /* AI 생성이 길어지는 경우(사연이 길수록) 15초부터 안심 문구 추가 */
    const slowTimer = setTimeout(() => setSlowNote(true), 15_000);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(slowTimer);
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  /* 하단 고정 결제 버튼 — 02번 카드를 지나고, 본문 결제 버튼이 안 보일 때만 */
  const [showSticky, setShowSticky] = useState(false);
  /* 책 소개 페이지에서 책·패키지를 고르고 온 손님 → 그 상품으로 결제 이어가기 */
  const [want, setWant] = useState<WantProduct | null>(null);
  useEffect(() => {
    if (!BOOK_SALES_OPEN) return;
    const w = loadWant();
    if (w) {
      setWant(w);
    }
  }, []);
  /* 미리보기까지 마친 주문을 이 기기에 기억 → /book·홈에서 다시 와도 사연 그대로 결제 */
  useEffect(() => {
    if (phase === "ready") rememberOrder(orderNumber, name);
  }, [phase, orderNumber, name]);
  const stickyStartRef = useRef<HTMLDivElement>(null);
  const mainCtaRef = useRef<HTMLDivElement>(null);
  /* 책 소개가 보이는 동안엔 하단 고정 버튼(메시지 결제)을 숨겨 책 버튼을 가리지 않게 */
  const bookRef = useRef<HTMLDivElement>(null);
  const endSeen = useRef(false);
  /* 유료 안내(전체 분석에서 추가로 확인할 내용) 도달 — 주문당 1회 */
  const offerRef = useRef<HTMLDivElement>(null);
  const offerSeen = useRef(false);
  useEffect(() => {
    if (phase !== "ready" || !PAYMENTS_OPEN) return;
    const onScroll = () => {
      const s0 = stickyStartRef.current?.getBoundingClientRect();
      const m = mainCtaRef.current?.getBoundingClientRect();
      const pastStart = !!s0 && s0.top < 0;
      const ctaVisible = !!m && m.top < window.innerHeight && m.bottom > 0;
      const bk = bookRef.current?.getBoundingClientRect();
      const bookVisible = !!bk && bk.top < window.innerHeight && bk.bottom > 0;
      /* 결제 안내까지 읽은 손님 수 측정 (주문당 1회) — "도달"과 "결정" 중 어디가 문제인지 보기 위함 */
      const of = offerRef.current?.getBoundingClientRect();
      if (of && of.top < window.innerHeight * 0.75 && !offerSeen.current) {
        offerSeen.current = true;
        logPayEvent(orderNumber, "offer_seen");
      }
      if (ctaVisible && !endSeen.current) {
        endSeen.current = true;
        logPayEvent(orderNumber, "preview_end_seen");
      }
      setShowSticky(pastStart && !ctaVisible && !bookVisible);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [phase]);

  /* ---------- 오래된 링크: 미리보기는 메일 링크로, 결제·책은 바로 이어서 ---------- */
  if (phase === "expired") {
    const o = encodeURIComponent(orderNumber);
    return (
      <div className="fade-in mx-auto max-w-lg">
        <FullBleedReading src={readingVideo} poster={readingPoster} minH="min-h-[92svh]">
          <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
          <p className="font-display mt-5 text-[1.2rem] leading-[1.8] text-ivory">
            이 미리보기 링크는
            <br />
            보안을 위해 시간이 지나 닫혔어요.
          </p>
          <p className="mt-3 text-[0.86rem] font-light leading-[1.95] text-ivory-dim">
            사연은 그대로 저장돼 있어요.
            <br />
            신청할 때 받은 메일 <span className="text-ivory">「이야기가 저장되었어요」</span>의 링크로
            <br />
            언제든 다시 열 수 있어요.
          </p>
          <div className="mt-7 flex flex-col gap-2.5">
            <Link
              href={`/apply/complete?order=${o}`}
              className="cta-glow inline-flex h-14 w-full items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.95rem] font-medium text-ivory"
            >
              저장된 사연으로 바로 결제하기
            </Link>
            {BOOK_SALES_OPEN && (
              <Link
                href={`/book?order=${o}`}
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-gold-dim/40 text-[0.88rem] text-gold"
              >
                책 자세히 보기
              </Link>
            )}
          </div>
        </FullBleedReading>
      </div>
    );
  }

  /* ---------- 실패: full-bleed 유지 + 재시도만 (개인화 실패 시 결제 버튼 금지) ---------- */
  if (phase === "delayed") {
    return (
      <div className="fade-in mx-auto max-w-lg">
        <FullBleedReading src={readingVideo} poster={readingPoster} minH="min-h-[86svh]">
          <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
          <p className="font-display mt-5 text-[1.15rem] leading-[1.85] text-ivory">
            월화가 이야기를 읽는 과정이
            <br />
            조금 늦어지고 있어요.
          </p>
          <p className="mt-3 text-[0.85rem] font-light leading-[1.95] text-ivory-dim">
            입력하신 내용은 그대로 남아 있어요.
            <br />
            잠시 후 다시 읽어볼게요.
          </p>
          <button
            type="button"
            onClick={() => {
              if (retryTimer.current) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
              }
              tries.current = 0;
              genFails.current = 0;
              setPhase("loading");
              fetchPreview();
            }}
            className="mt-7 inline-flex h-13 w-full items-center justify-center rounded-full border border-gold-dim/40 text-sm text-ivory active:opacity-85"
          >
            다시 읽어보기
          </button>
        </FullBleedReading>
      </div>
    );
  }

  /* ---------- 읽는 중: full-bleed 몰입 전환 (응답 오면 즉시 전환) ---------- */
  if (phase === "loading") {
    if (!showLoading) {
      return <div className="min-h-[100svh] bg-ink" />;
    }
    return (
      <div className="mx-auto max-w-lg">
        <PreviewWaiting name={name} slow={slowNote} />
      </div>
    );
  }

  /* ---------- ready: 무료 = 이해 → 잠금(실행) → 결제 (10/9 개발지시서) ---------- */
  if (!preview) return null;
  const payHref = `/apply/complete?order=${encodeURIComponent(orderNumber)}`;
  /* 메시지 결제는 항상 product=message 를 명시 (책·패키지를 봤다가 돌아와도 메시지 가격으로) */
  const messageHref = `${payHref}&product=message`;
  const bundleHref = `${payHref}&product=bundle`;
  /* 첫 구매 24시간이면 패키지도 할인가 (서버가 보낸 마감 시각이 있을 때만) */
  const offerOn = !!offerEndsAt && offerEndsAt > Date.now();
  const bundleNow = offerOn ? FIRST_OFFER_BUNDLE_PRICE_KRW : bundlePrice();

  const stance = preview.now_plan.stance;
  /* 서버가 준 상황 구분이 없으면(구버전 응답) 무료 결과의 방향으로 판단 */
  const sit: Situation =
    situation ??
    (stance === "hold_boundary" ? "boundary" : stance === "light_contact" ? "light" : "wait");
  const priceText = `${price.toLocaleString()}원`;
  const mainHref = want ? `${payHref}&product=${want}` : messageHref;
  const mainLabel =
    want === "book"
      ? `${name ? `${name}님의 ` : "나의 "}책 받기 · ${BOOK_PRICE_KRW.toLocaleString()}원`
      : want === "bundle"
        ? `월화 패키지로 보기 · ${bundleNow.toLocaleString()}원`
        : `전체 리추얼 구성 받기 · ${priceText}`;
  const onCtaClick = (where: string) => {
    trackEvent("payment_cta_click", { order: orderNumber });
    logPayEvent(orderNumber, "preview_cta_click", where);
  };
  const lock = LOCK_COPY[sit];
  const badge = priceBadge(price);

  /* 판정 카드 4개 — 짧게, 1~2초 안에 읽히게 */
  const verdictCards: Array<{ k: string; v: string }> = [
    { k: sit === "lover" ? "지금 대화" : "지금 연락", v: CONTACT_VERDICT[stance] },
    { k: "현재 관계", v: preview.relationship_state.label },
    { k: "가장 위험한 행동", v: preview.verdict?.risk ?? shortAction(preview.cautions[0]?.action ?? "") },
    { k: "지금 필요한 것", v: preview.verdict?.need ?? NEED_DEFAULT[stance] },
  ];
  /* 왜 이렇게 판단했는지 — 구버전 저장본은 기존 해석 문장으로 */
  const reasons =
    preview.reasons && preview.reasons.length
      ? preview.reasons
      : [firstSentence(preview.relationship_state.text), firstSentence(preview.partner_reading.text)];
  const bridge = preview.bridge && preview.bridge.length ? preview.bridge : lock.bridge;
  const donts = preview.cautions.slice(0, 3);

  const ctaButton = (where: string, label: string, href = mainHref) => (
    <Link
      href={href}
      onClick={() => onCtaClick(where)}
      className="cta-glow inline-flex min-h-14 w-full items-center justify-center rounded-full border border-gold/30 bg-gradient-to-b from-burgundy to-burgundy-deep px-5 py-3 text-center text-[0.97rem] font-semibold text-ivory transition-opacity active:opacity-85"
    >
      {label}
    </Link>
  );

  return (
    <div className="paper fade-in min-h-[100svh] pb-28">
      {/* ---------- 01. 결과 헤더 — 장식 없이 바로 결과 ---------- */}
      <header className="px-6 pb-2 pt-10">
        <div className="mx-auto max-w-[640px]">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wolhwa/v2/listen.webp" alt="" aria-hidden className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-full border-2 border-gold-dim object-cover object-[50%_18%]" />
            <div className="min-w-0">
              <p className="text-[0.72rem] tracking-[0.2em] text-gold">月下緣 · 무료 미리보기</p>
              <h1 className="font-display mt-1.5 text-[1.45rem] font-bold leading-snug text-ivory">
                {name ? `${name}님의 사연을 읽었어요` : "들려준 사연을 읽었어요"}
              </h1>
            </div>
          </div>
          <p className="mt-2 text-[0.92rem] leading-[1.75] text-ivory-dim">
            입력한 사연을 바탕으로 지금의 흐름과 오늘 할 수 있는 것을 먼저 정리했어요.
          </p>
          {facts.length > 0 && (
            <div className="mt-5 rounded-2xl border border-gold-dim bg-ink-soft px-5 py-4">
              <p className="text-[0.76rem] font-semibold tracking-[0.08em] text-gold">내 사연에서 반영한 사실</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[0.95rem] leading-[1.6] text-ivory">
                {facts.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden className="text-thread">·</span>
                    <span className="min-w-0">{f}</span>
                  </li>
                ))}
              </ul>
              {guides.length > 0 && (
                <div className="mt-3 border-t border-gold-dim pt-3">
                  <p className="text-[0.76rem] font-semibold tracking-[0.08em] text-gold">전체 구성에서 참고할 상황 가이드</p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-[0.9rem] leading-[1.55] text-ivory">
                    {guides.map((g) => (
                      <li key={g.n}>
                        {g.title}
                        <span className="block text-[0.78rem] text-ivory-dim">{g.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-2 text-[0.8rem] leading-[1.6] text-ivory-dim">이 사실들 때문에, 아래 판단은 ‘지금 무엇을 먼저 확인할지’를 기준으로 썼어요.</p>
            </div>
          )}
        </div>
      </header>

      {/* ---------- 02. 관계 판정 카드 4개 ---------- */}
      <section className="mt-5 px-6" aria-label="관계 판정">
        <div className="mx-auto grid max-w-[640px] grid-cols-2 gap-2.5">
          {verdictCards.map((c, i) => (
            <div
              key={c.k}
              className={`min-w-0 rounded-2xl border px-4 py-4 ${
                i === 0 ? "border-burgundy/60 bg-[#f6e9ec]" : "border-gold-dim bg-ink-soft"
              }`}
            >
              <p className="text-[0.7rem] tracking-wider text-ivory-dim">{c.k}</p>
              <p className="mt-1.5 break-keep text-[0.98rem] font-semibold leading-[1.45] text-ivory">{c.v}</p>
            </div>
          ))}
        </div>
      </section>
      <div ref={stickyStartRef} aria-hidden />

      {/* ---------- 03. 왜 이렇게 판단했는지 (입력한 사실 기반) ---------- */}
      <section className="mt-10 px-6">
        <div className="mx-auto max-w-[640px]">
          <p className="text-[0.76rem] font-semibold tracking-wider text-gold">왜 이렇게 판단했는지 · 입력한 사실 기준</p>
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-gold-dim/25 bg-ink-soft px-5 py-5">
            {reasons.map((r, i) => (
              <p key={i} className={`text-[0.92rem] leading-[1.95] ${i === 0 ? "text-ivory" : "font-light text-ivory"}`}>
                {r}
              </p>
            ))}
            {preview.partner_reading.modes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preview.partner_reading.modes.map((m) => (
                  <span key={m} className="rounded-full border border-thread/40 bg-thread/10 px-2.5 py-0.5 text-[0.72rem] text-thread">
                    상대 반응 · {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- 04. 오늘은 이것만 하지 마세요 (최대 3개) ---------- */}
      <section className="mt-10 px-6">
        <div className="mx-auto max-w-[640px]">
          <p className="font-display text-[1.08rem] font-semibold text-ivory">오늘은 이것만 하지 마세요</p>
          <ul className="mt-3 flex flex-col gap-2">
            {donts.map((c, i) => (
              <li key={i} className="rounded-xl border border-gold-dim/20 bg-ink-soft px-4 py-3">
                <p className="flex gap-2 text-[0.92rem] font-medium leading-[1.6] text-ivory">
                  <span aria-hidden className="text-thread">✕</span>
                  <span className="min-w-0">{c.action}</span>
                </p>
                <p className="mt-1 pl-5 text-[0.8rem] font-light leading-[1.8] text-ivory-dim">{c.why}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- 05. 무료 미리보기 vs 전체 리추얼 구성 (10/16 지시문 6) ---------- */}
      <section className="mt-12 px-6">
        <div ref={offerRef} className="shadow-paper mx-auto max-w-[640px] rounded-2xl border border-gold-dim bg-ink-soft px-5 py-6">
          <p className="font-display text-[1.25rem] font-bold leading-snug text-ivory">{lock.title}</p>
          <p className="mt-2 text-[0.92rem] leading-[1.75] text-ivory-dim">{lock.desc}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[0.86rem] leading-[1.6]">
            <div className="rounded-xl bg-ink px-3.5 py-3">
              <p className="text-[0.78rem] font-semibold text-ivory-dim">무료 미리보기 · 지금 받음</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-ivory">
                <li>· 사연에서 읽히는 현재 흐름</li>
                <li>· 오늘 피할 행동</li>
                <li>· 결과 일부</li>
              </ul>
            </div>
            <div className="rounded-xl border border-burgundy/40 bg-[#f6e9ec] px-3.5 py-3">
              <p className="text-[0.78rem] font-semibold text-burgundy">전체 리추얼 구성</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-ivory">
                <li>· 관계 흐름·반복 패턴 상세 읽기</li>
                <li>· 월화의 편지 · 나만의 리추얼</li>
                <li>· 첫날·7일·21일 실천 가이드</li>
                <li>· {ROLE_PAID[sit]}</li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-[0.76rem] font-semibold tracking-wider text-gold">내 사연으로 이어서 열리는 것</p>
          <ul className="mt-2 flex flex-col gap-2">
            {lock.items.slice(0, 3).map((it) => (
              <li key={it.t} className="rounded-xl border border-gold-dim bg-ink px-4 py-2.5">
                <p className="text-[0.92rem] font-medium text-ivory">{it.t}</p>
                <p aria-hidden className="mt-0.5 select-none text-[0.82rem] leading-[1.6] text-ivory-dim blur-[4px]">
                  {it.ph}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {PAYMENTS_OPEN ? (
        <>
          {/* ---------- 06. 전체 분석 결과 예시 (가상 사연) ---------- */}
          <section className="mt-6 px-6">
            <div className="mx-auto max-w-[640px]">
              <ResultExampleCard kind={sit === "lover" ? "lover" : sit === "boundary" ? "boundary" : "contact"} orderNumber={orderNumber} />
            </div>
          </section>

          {/* ---------- 07. 가격 · 제공 방식 · 구매 버튼 ---------- */}
          <section className="mt-6 px-6">
            <div className="mx-auto max-w-[640px]">
              {!want && (
                <div className="mb-3 overflow-hidden rounded-2xl border-2 border-burgundy bg-ink-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/wolhwa/v2/set.webp" alt="편지 · 리추얼 카드 · 실천 가이드" className="block aspect-[16/9] w-full object-cover" />
                  <div className="px-5 py-4">
                  <p className="text-[0.78rem] font-semibold text-burgundy">{offerEndsAt ? "이 사연의 첫 구매 혜택" : PRODUCTS.message.name}</p>
                  <p className="mt-1 text-[0.92rem] text-ivory">{PRODUCTS.message.name}</p>
                  <p className="mt-0.5 text-[0.8rem] leading-[1.6] text-ivory-dim">내 사연을 반영한 관계 읽기 · 월화의 편지 · 개인 리추얼 · 단계별 실천 가이드</p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                    {badge.strike !== null && <span className="text-[0.9rem] text-ivory-dim line-through">{badge.strike.toLocaleString()}원</span>}
                    <span className="font-display text-[1.7rem] text-burgundy">{priceText}</span>
                    {badge.strike !== null && badge.strike > price && (
                      <span className="rounded-full bg-[#f1e6e9] px-2.5 py-0.5 text-[0.76rem] font-semibold text-burgundy">{(badge.strike - price).toLocaleString()}원 할인</span>
                    )}
                  </p>
                  {offerEndsAt && <OfferCountdown endsAt={offerEndsAt} after={regularPriceFor("message")} showEnd className="mt-1" />}
                  </div>
                </div>
              )}
              <div ref={mainCtaRef} />
              {ctaButton("main", mainLabel)}
              <ul className="mt-4 grid grid-cols-2 gap-2 text-center text-[0.74rem] leading-[1.5] text-ivory">
                <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">1회 결제<span className="block text-ivory-dim">정기결제 없음</span></li>
                <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">결과 제공<span className="block text-ivory-dim">결제 후 {DELIVERY_TIME_TEXT}</span></li>
                <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">{CONTENT_VIEW_DAYS}일 동안<span className="block text-ivory-dim">다시 열람</span></li>
                <li className="rounded-xl border border-gold-dim/20 bg-ink/50 px-2 py-2.5">결과 링크<span className="block text-ivory-dim">이메일로도 발송</span></li>
              </ul>
              <p className="mt-2.5 text-center text-[0.74rem] leading-[1.8] text-ivory-dim">
                결과를 열어보기 전이면 {REFUND_WINDOW_DAYS}일 안에 전액 환불 ·{" "}
                <Link href="/refund" className="underline underline-offset-2">환불정책</Link> ·{" "}
                <Link href="/guide" className="underline underline-offset-2">이용안내</Link>
              </p>
              <div className="mt-4 rounded-xl border border-gold-dim/15 bg-ink/40 px-4 py-3">
                <p className="text-[0.72rem] font-semibold tracking-wider text-gold/80">어떻게 만들어지나요</p>
                <ul className="mt-1.5 flex flex-col gap-1 text-[0.74rem] leading-[1.75] text-ivory-dim">
                  {HOW_IT_WORKS.map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                  <li>· {DELIVERY_DELAY_TEXT}</li>
                  <li>· 입력하신 사연은 결과를 만드는 데에만 사용됩니다</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ---------- 08. 월화의 짧은 위로 (영상 없이 짧은 문장만) ---------- */}
          <section className="night mx-auto mt-10 max-w-[640px] overflow-hidden px-0 sm:rounded-2xl">
            <div className="relative">
              <LoopVideo
                src={`/book/v3/${sit === "boundary" ? "w-mirror" : "w-phone"}.mp4`}
                poster={`/book/v3/${sit === "boundary" ? "w-mirror" : "w-phone"}.webp`}
                className="block aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#201d20] via-[#201d20]/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-6 pb-5">
                <p className="text-[0.76rem] tracking-[0.2em] text-gold">月華 · 월화의 한마디</p>
                <p className="font-display mt-2 text-[1.12rem] leading-[1.75] text-ivory">{bridge[0] ?? ""}</p>
              </div>
            </div>
          </section>
          <section className="px-6">
            <div className="mx-auto flex max-w-[640px] flex-col gap-3">
              {bridge.slice(1).map((b, i, arr) => (
                <p
                  key={i}
                  className={`text-[0.95rem] leading-[2] ${
                    i === arr.length - 1 ? "font-display font-semibold text-gold" : "font-light text-ivory"
                  }`}
                >
                  {b}
                </p>
              ))}
            </div>
          </section>

          {/* ---------- 09. 선택형: PDF 책도 함께 받고 싶다면 (접힘) ---------- */}
          {!want && (
            <section className="mt-10 px-6">
              <details
                className="group mx-auto max-w-[640px] rounded-2xl border border-gold-dim/25 bg-ink-soft"
                onToggle={(e) => {
                  if ((e.currentTarget as HTMLDetailsElement).open) logPayEvent(orderNumber, "package_open", "preview");
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                  <span>
                    <span className="block text-[0.9rem] font-medium text-ivory">PDF 책도 함께 받고 싶다면</span>
                    <span className="mt-0.5 block text-[0.74rem] text-ivory-dim">
                      월화 패키지 · {bundleNow.toLocaleString()}원
                      {offerOn && <span className="ml-1 text-thread">첫 구매 24시간 가격 · 이후 {BUNDLE_REGULAR_PRICE_KRW.toLocaleString()}원</span>}
                    </span>
                  </span>
                  <span aria-hidden className="text-ivory-dim transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t border-gold-dim/15 px-5 pb-5 pt-4">
                  <ul className="flex flex-col gap-2.5 text-[0.82rem] leading-[1.75]">
                    <li>
                      <b className="font-semibold text-ivory">월화의 관계 리추얼</b>
                      <span className="block font-light text-ivory-dim">지금 제출한 사연에 대한 판단과 다음 행동 · 웹 화면으로 {CONTENT_VIEW_DAYS}일 열람</span>
                    </li>
                    <li>
                      <b className="font-semibold text-ivory">개인 맞춤 PDF 책</b>
                      <span className="block font-light text-ivory-dim">여러 상황에서 다시 펼쳐 보는 문장 · 체크리스트 · 7일/21일 기록장 · 약 120쪽, 60일 안에 내려받아 계속 보관</span>
                    </li>
                    <li>
                      <b className="font-semibold text-gold">월화 패키지</b>
                      <span className="block font-light text-ivory-dim">내 사연 분석과 반복해서 꺼내 볼 자료를 함께 받는 구성</span>
                    </li>
                  </ul>
                  <p className="mt-3 rounded-xl bg-ink/60 px-3.5 py-2.5 text-[0.74rem] leading-[1.75] text-ivory-dim">
                    책에도 연락 시점·문장 이야기가 일부 들어 있어요. 차이는 형식과 쓰는 때예요 — 분석은 지금 내 사연에 대한 답, 책은 흔들릴 때마다 다시 펼치는 자료예요.
                  </p>
                  <Link
                    href={bundleHref}
                    onClick={() => onCtaClick("bundle")}
                    className="mt-3 flex h-12 items-center justify-center rounded-full border border-gold/45 text-[0.9rem] font-medium text-gold active:opacity-80"
                  >
                    월화 패키지로 보기 · {bundleNow.toLocaleString()}원
                  </Link>
                  {BOOK_SALES_OPEN && (
                    <Link
                      href={`/book?order=${encodeURIComponent(orderNumber)}`}
                      onClick={() => logPayEvent(orderNumber, "book_view", "preview")}
                      className="mt-2 block text-center text-[0.74rem] text-ivory-dim underline underline-offset-4"
                    >
                      PDF 책 실제 페이지 넘겨 보기
                    </Link>
                  )}
                </div>
              </details>
            </section>
          )}

          {/* ---------- 결제 직전 FAQ (접힘) ---------- */}
          <section className="mt-10 px-6">
            <div className="mx-auto max-w-[640px]">
              <p className="text-[0.72rem] tracking-wider text-gold/80">결제 전에 많이 묻는 것</p>
              <div className="mt-2 divide-y divide-gold-dim/15 rounded-2xl border border-gold-dim/20 bg-ink-soft">
                {FAQ.map((f) => (
                  <details key={f.q} className="group px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[0.88rem] text-ivory">
                      <span>Q. {f.q}</span>
                      <span aria-hidden className="text-ivory-dim transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2 text-[0.82rem] font-light leading-[1.85] text-ivory-dim">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- 하단 재결제 CTA (끝까지 읽은 손님) ---------- */}
          <section className="mt-12 px-6">
            <div ref={bookRef} className="mx-auto max-w-[640px] text-center">
              <p className="text-[0.92rem] font-light leading-[1.95] text-ivory">{lock.recap[0]}</p>
              <p className="font-display mt-1 text-[1.02rem] font-semibold leading-[1.8] text-gold">{lock.recap[1]}</p>
              <div className="mt-5">{ctaButton("bottom", mainLabel)}</div>
              {want && (
                <Link
                  href={messageHref}
                  className="mt-3 block text-[0.76rem] text-ivory-dim underline underline-offset-4"
                >
                  관계 리추얼만 받기 · {priceText}
                </Link>
              )}
            </div>
            {/* 결론 카드 저장·공유 (이름·사연 없이 판정 라벨과 반응 태그만) */}
            <div className="mx-auto mt-8 max-w-[640px]">
              <ShareStoryCard
                orderNumber={orderNumber}
                stance={NOW_STANCE_LABELS[stance] ?? ""}
                tags={preview.partner_reading.modes}
                line={CONTACT_VERDICT[stance]}
              />
            </div>
          </section>
        </>
      ) : (
        <section className="mt-7 px-6">
          {/* 결제 오픈 준비 중 — 카드사 심사 완료까지 결제를 닫아 둔 상태 */}
          <div className="mx-auto max-w-[640px] rounded-2xl border border-gold-dim/35 bg-ink-soft/70 px-6 py-6 text-center">
            <p className="text-[0.66rem] tracking-[0.3em] text-thread/90">결제 오픈 준비 중</p>
            <p className="mt-3 text-[0.92rem] leading-[2] text-ivory">
              {name ? `${name}님의 다음 장은 준비되어 있어요.` : "다음 장은 준비되어 있어요."}
              <br />
              카드·간편결제 심사가 끝나는 대로 열립니다.
            </p>
            <p className="mt-3 text-[0.8rem] font-light leading-[1.95] text-ivory-dim">
              열리는 날, 입력하신 이메일로 가장 먼저 알려드릴게요.
              <br />
              {isPromoActive()
                ? `재오픈 기념 특가 ${RITUAL_PRICE_KRW.toLocaleString()}원은 ${PROMO_DEADLINE_TEXT}예요.`
                : "지금 신청하신 가격은 그대로 지켜둡니다."}
            </p>
          </div>
        </section>
      )}
      <div className="px-6">
        {/* 테스트 결제 모드 안내 (라이브 키 전환 시 컴포넌트 내부에서 끔) */}
        <DevPaymentNotice />
      </div>
      {PAYMENTS_OPEN && typeof document !== "undefined" && createPortal(
        <div
          className={`paper fixed inset-x-0 bottom-0 z-40 border-t border-gold-dim bg-ink/95 px-4 pt-3 backdrop-blur transition-transform duration-300 ${
            showSticky ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          aria-hidden={!showSticky}
        >
          {!want && offerEndsAt && <OfferCountdown bar endsAt={offerEndsAt} after={regularPriceFor("message")} className="mx-auto mb-2 max-w-[640px]" />}
          <Link
            href={mainHref}
            tabIndex={showSticky ? 0 : -1}
            onClick={() => onCtaClick("sticky")}
            className="mx-auto flex h-12 w-full max-w-[640px] items-center justify-center rounded-full border border-gold/25 bg-gradient-to-b from-burgundy to-burgundy-deep text-[0.9rem] font-semibold text-ivory active:opacity-85"
          >
            {mainLabel}
          </Link>
          {!want && offerEndsAt ? (
            <p className="mx-auto mt-1.5 max-w-[640px] text-center text-[0.68rem] text-ivory-dim/80">
              종료 후 {regularPriceFor("message").toLocaleString()}원 · 1회 결제 · 정기결제 없음
            </p>
          ) : (
            <p className="mx-auto mt-1.5 max-w-[640px] text-center text-[0.68rem] text-ivory-dim/80">
              1회 결제 · 정기결제 없음 · {CONTENT_VIEW_DAYS}일 동안 다시 열람
            </p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
