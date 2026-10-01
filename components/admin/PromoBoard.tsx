"use client";

/** 홍보 제안 보기 + 새로 만들기 + 추적 링크 만들기 */
import { useEffect, useRef, useState } from "react";
import type { StoredPromo } from "@/lib/promo-report";

const STALE_MS = 20 * 60 * 60 * 1000;

const CHANNEL_PRESETS: [string, string][] = [
  ["instagram", "인스타그램"],
  ["threads", "스레드"],
  ["tiktok", "틱톡"],
  ["naver_blog", "네이버 블로그"],
  ["kakao", "카카오톡"],
  ["youtube", "유튜브"],
];

const DESTS: [string, string][] = [
  ["/", "첫 화면"],
  ["/book", "책 소개 페이지"],
];

function LinkMaker() {
  const [dest, setDest] = useState("/");
  const [src, setSrc] = useState("instagram");
  const [camp, setCamp] = useState("");
  const [copied, setCopied] = useState(false);
  const c = camp.trim().replace(/\s+/g, "_").replace(/[^\w가-힣-]/g, "");
  const url = `https://thewolha.com${dest}?utm_source=${src}${c ? `&utm_campaign=${encodeURIComponent(c)}` : ""}`;
  return (
    <div className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
      <p className="text-sm font-semibold">홍보용 추적 링크 만들기</p>
      <p className="mt-1 text-[0.74rem] leading-relaxed text-ivory-dim">
        게시물·프로필·광고에 이 링크를 쓰면, 마케팅 화면의 &quot;어디서 들어왔나&quot;에 채널별 방문·신청·결제가 따로 잡혀요.
      </p>
      <p className="mt-3 text-[0.72rem] text-gold/80">어디로 보낼까요</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {DESTS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setDest(v)}
            className={`rounded-full px-3 py-1 text-[0.76rem] ${dest === v ? "bg-gold/20 text-gold" : "border border-gold-dim/30 text-ivory-dim"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {dest === "/book" && (
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-ivory-dim">
          사연으로 만드는 책이라, 책 소개를 본 손님은 사연 쓰기 → 무료 미리보기 → 결제 화면에서 &quot;책만&quot;이나 패키지를 골라요.
        </p>
      )}
      <p className="mt-3 text-[0.72rem] text-gold/80">어디에 올릴까요</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {CHANNEL_PRESETS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setSrc(v)}
            className={`rounded-full px-3 py-1 text-[0.76rem] ${src === v ? "bg-gold/20 text-gold" : "border border-gold-dim/30 text-ivory-dim"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <input
        value={camp}
        onChange={(e) => setCamp(e.target.value)}
        placeholder="게시물 이름 (예: 1001_릴스_새벽2시)"
        className="mt-2 w-full rounded-lg border border-gold-dim/30 bg-ink px-3 py-2 text-sm text-ivory"
      />
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-ink px-3 py-2 text-[0.74rem] text-ivory">{url}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* 복사 불가 시 직접 선택 */
            }
          }}
          className="shrink-0 rounded-full border border-gold/50 px-3 py-1.5 text-xs text-gold"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}

export default function PromoBoard({ initial }: { initial: StoredPromo | null }) {
  const [promo, setPromo] = useState<StoredPromo | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const auto = useRef(false);

  const make = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/promo", { method: "POST" });
      const j = await res.json().catch(() => null);
      if (j?.ok) setPromo(j.promo);
      else setErr("제안을 만들지 못했어요. 잠시 후 다시 눌러주세요.");
    } catch {
      setErr("요청 중 문제가 생겼어요.");
    } finally {
      setBusy(false);
    }
  };

  /* 하루에 한 번은 자동으로 새 제안 */
  useEffect(() => {
    if (auto.current) return;
    auto.current = true;
    if (!initial || Date.now() - new Date(initial.created_at).getTime() > STALE_MS) make();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = promo?.report;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.76rem] text-ivory-dim">
          {promo
            ? `${new Date(promo.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 기준 · 최근 ${promo.period_days}일 데이터 분석`
            : "아직 만든 제안이 없어요"}
        </p>
        <button
          type="button"
          onClick={make}
          disabled={busy}
          className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold disabled:opacity-50"
        >
          {busy ? "데이터 읽고 쓰는 중… (30초~1분)" : "지금 데이터로 새로 만들기"}
        </button>
      </div>
      {err && <p className="text-xs text-thread">{err}</p>}

      {r && (
        <>
          <section className="rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
            <p className="font-display text-lg font-semibold leading-snug text-gold">{r.headline}</p>
            <div className="mt-3 grid gap-3 text-[0.85rem] leading-relaxed md:grid-cols-2">
              <div>
                <p className="text-[0.7rem] tracking-wide text-gold/80">누가 오나</p>
                <p className="mt-1">{r.who}</p>
              </div>
              <div>
                <p className="text-[0.7rem] tracking-wide text-gold/80">왜 오고, 왜 결제하나</p>
                <p className="mt-1">{r.why}</p>
              </div>
            </div>
          </section>

          {r.problems?.length > 0 && (
            <section className="rounded-xl border border-thread/40 bg-thread/5 px-5 py-4">
              <p className="text-sm font-semibold">지금 가장 큰 문제</p>
              <ul className="mt-2 space-y-1.5 text-[0.85rem] leading-relaxed">
                {r.problems.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
            <p className="text-sm font-semibold">이번 주 할 일</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[0.85rem] leading-relaxed">
              {r.this_week.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            <p className="mt-3 text-[0.8rem] text-ivory-dim">⏰ {r.timing}</p>
          </section>

          <section>
            <p className="text-sm font-semibold">추천 채널</p>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {r.channels.map((c) => (
                <div key={c.name} className="min-w-0 rounded-xl border border-gold-dim/25 bg-ink-soft px-4 py-3.5 text-[0.82rem] leading-relaxed">
                  <p className="font-semibold text-gold">{c.name}</p>
                  <p className="mt-1 text-ivory-dim">{c.why}</p>
                  <p className="mt-2">{c.how}</p>
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-ink px-3 py-2 text-[0.8rem] text-ivory">{c.example}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
            <p className="text-sm font-semibold">바로 쓸 수 있는 문구</p>
            <ul className="mt-2 space-y-2 text-[0.85rem] leading-relaxed">
              {r.copy_ideas.map((x) => (
                <li key={x} className="rounded-lg bg-ink px-3 py-2">{x}</li>
              ))}
            </ul>
          </section>

          {r.avoid?.length > 0 && (
            <section className="rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
              <p className="text-sm font-semibold">하지 말 것</p>
              <ul className="mt-2 space-y-1.5 text-[0.82rem] leading-relaxed text-ivory-dim">
                {r.avoid.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <LinkMaker />
    </div>
  );
}
