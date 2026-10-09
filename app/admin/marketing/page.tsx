import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getMarketingStats, type Funnel } from "@/lib/marketing-stats";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { kstDaysAgoStartIso } from "@/lib/admin-util";

/** 신청 질문 순서 (components/apply/ImmersiveApplyExperience.tsx STEPS와 같은 순서) */
const APPLY_STEPS: [string, string][] = [
  ["applicant_name", "내 이름"],
  ["applicant_birth_year", "내 출생연도"],
  ["applicant_gender", "내 성별"],
  ["life_stage", "요즘 일상"],
  ["partner_name", "상대 이름"],
  ["partner_birth_year", "상대 출생연도"],
  ["partner_gender", "상대 정보"],
  ["relationship_type", "관계"],
  ["relationship_duration", "함께한 기간"],
  ["breakup_elapsed", "멀어진 지 (이별일 때만)"],
  ["breakup_initiator", "누가 먼저 (이별일 때만)"],
  ["last_conversation", "마지막 대화 시점"],
  ["contact_status", "연락 상태"],
  ["partner_new_relationship", "상대의 새 사람"],
  ["current_emotion", "지금 마음"],
  ["pain_points", "가장 힘든 것"],
  ["story", "두 사람 이야기 (직접 쓰기)"],
  ["last_conversation_memory", "남아 있는 말 (선택)"],
  ["desired_change", "달라졌으면 하는 것 (선택)"],
  ["main_wish", "가장 알고 싶은 것"],
  ["wish_sentence", "월화에게 하고 싶은 말 (선택)"],
  ["safety_concerns", "안전 확인"],
  ["email", "이메일"],
  ["consent", "동의"],
];

/** 질문별 도달 방문자 수 (apply_step 기록 · 2026-10-07부터 쌓임) */
async function getStepReach(days: number): Promise<Map<string, number> | null> {
  try {
    const res = await getSupabaseAdmin()
      .from("site_events")
      .select("visitor_id, path")
      .eq("event", "apply_step")
      .gte("created_at", kstDaysAgoStartIso(days - 1))
      .limit(20000);
    if (res.error) return null;
    const sets = new Map<string, Set<string>>();
    for (const r of (res.data ?? []) as { visitor_id: string; path: string | null }[]) {
      const id = (r.path ?? "").split("#")[1];
      if (!id) continue;
      const set = sets.get(id) ?? new Set<string>();
      set.add(r.visitor_id);
      sets.set(id, set);
    }
    return new Map([...sets.entries()].map(([k, v]) => [k, v.size]));
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

/**
 * /admin/marketing — 마케팅 한눈에 보기
 * 방문 → 신청 → 미리보기 → 결제, 성별·나이대·찾아온 이유별 전환, 유입 경로, 이탈 이유
 */

const PERIODS: [number, string][] = [
  [1, "오늘"],
  [7, "7일"],
  [14, "14일"],
  [30, "30일"],
];

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "—");

function FunnelBars({ f }: { f: Funnel }) {
  const steps: [string, number][] = [
    ["방문자", f.visitors],
    ["무료 분석 시작", f.applyStart],
    ["질문 1 완료", f.q1],
    ["질문 2 완료", f.q2],
    ["질문 3 완료", f.q3],
    ["질문 4 완료", f.q4],
    ["분석 신청 완료", f.applied],
    ["미리보기 생성", f.preview],
    ["미리보기 열람", f.previewView],
    ["결제 CTA 클릭", f.payClick],
    ["토스 결제창 진입", f.payWindow],
    ["결제 성공", f.paid],
  ];
  const max = Math.max(1, ...steps.map(([, n]) => n));
  return (
    <div className="space-y-2">
      {steps.map(([label, n], i) => (
        <div key={label} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-[0.8rem]">
          <span className="text-ivory-dim">{label}</span>
          <div className="h-5 overflow-hidden rounded bg-ink">
            <div
              className={`h-full rounded ${i === steps.length - 1 ? "bg-gold/80" : "bg-gold/35"}`}
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
          <span className="text-right tabular-nums">
            <b>{n}</b>
            {i > 0 && <span className="ml-1 text-[0.68rem] text-ivory-dim">{pct(n, steps[i - 1][1])}</span>}
          </span>
        </div>
      ))}
      <p className="pt-1 text-[0.72rem] text-ivory-dim">
        결제 실패 <b className="text-ivory">{f.payFail}</b>건 · 결제 취소 <b className="text-ivory">{f.payCancel}</b>건
      </p>
    </div>
  );
}

export default async function AdminMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const { d } = await searchParams;
  const days = PERIODS.some(([n]) => String(n) === d) ? Number(d) : 7;
  const [s, stepReach] = await Promise.all([getMarketingStats(days), getStepReach(days)]);
  const t = s.today;

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-24 pt-8 text-ivory">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-xl font-semibold">마케팅 한눈에 보기</h1>
        <div className="flex gap-1">
          {PERIODS.map(([n, label]) => (
            <Link
              key={n}
              href={`/admin/marketing?d=${n}`}
              className={`rounded-full px-3 py-1 text-[0.78rem] ${
                n === days ? "bg-gold/15 text-gold" : "text-ivory-dim hover:text-ivory"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[0.74rem] text-ivory-dim">
        운영자 테스트 제외 · 방문자 기록은{" "}
        {s.trackingSince
          ? new Date(s.trackingSince).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
          : "오늘"}
        부터 쌓여요 (그 전 기간은 방문·신청 시작이 0으로 보일 수 있어요)
      </p>

      {/* 오늘 */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["오늘 방문자", `${t.visitors}명`],
          ["오늘 신청", `${t.applied}명`],
          ["오늘 미리보기", `${t.preview}명`],
          ["오늘 결제", `${t.paid}건`],
          ["오늘 매출", `${t.revenue.toLocaleString()}원`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gold-dim/25 bg-ink-soft/70 px-4 py-3.5">
            <p className="text-[0.7rem] text-ivory-dim">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {/* 인사이트 */}
      {s.insights.length > 0 && (
        <section className="mt-6 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
          <p className="text-xs tracking-wide text-gold">지금 데이터가 말해주는 것</p>
          <ul className="mt-2 space-y-1.5 text-[0.85rem] leading-relaxed">
            {s.insights.map((x) => (
              <li key={x}>· {x}</li>
            ))}
          </ul>
          <Link href="/admin/promo" className="mt-3 inline-block text-[0.78rem] text-gold underline underline-offset-4">
            이걸 바탕으로 한 홍보 제안 보기 →
          </Link>
        </section>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* 퍼널 */}
        <section className="min-w-0 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
          <p className="text-sm font-semibold">
            {days === 1 ? "오늘" : `최근 ${days}일`} 전환 흐름
          </p>
          <div className="mt-3">
            <FunnelBars f={s.total} />
          </div>
          <p className="mt-3 text-[0.78rem] text-ivory-dim">
            매출 <b className="text-ivory">{s.total.revenue.toLocaleString()}원</b> · 신청→결제{" "}
            <b className="text-ivory">{pct(s.total.paid, s.total.applied)}</b>
          </p>
        </section>

        {/* 이탈 */}
        <section className="min-w-0 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
          <p className="text-sm font-semibold">어디서, 왜 빠지나</p>
          <div className="mt-3 space-y-1.5 text-[0.8rem]">
            {s.dropoff.map((x) => (
              <div key={x.stage} className="flex justify-between gap-3">
                <span className="text-ivory-dim">{x.stage}</span>
                <span className="tabular-nums">
                  {x.lost}명 이탈 <span className={x.rate >= 60 ? "text-thread" : "text-ivory-dim"}>({x.rate}%)</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.72rem] tracking-wide text-gold/80">결제 실패 이유</p>
          {s.payFails.length === 0 ? (
            <p className="mt-1 text-[0.78rem] text-ivory-dim">기간 내 결제 실패 기록 없음</p>
          ) : (
            <div className="mt-1 space-y-1 text-[0.78rem]">
              {s.payFails.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <span className="min-w-0 break-all text-ivory-dim">{f.label}</span>
                  <span className="tabular-nums">{f.count}건</span>
                </div>
              ))}
            </div>
          )}
          {s.payMethods.length > 0 && (
            <>
              <p className="mt-4 text-[0.72rem] tracking-wide text-gold/80">결제창에 들어간 결제수단</p>
              <div className="mt-1 space-y-1 text-[0.78rem]">
                {s.payMethods.map((m) => (
                  <div key={m.label} className="flex justify-between gap-3">
                    <span className="text-ivory-dim">{m.label}</span>
                    <span className="tabular-nums">{m.count}건</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* 질문별 도달 */}
      <section className="mt-6 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <p className="text-sm font-semibold">신청 질문, 어디서 그만두나</p>
        <p className="mt-1 text-[0.74rem] text-ivory-dim">
          각 질문까지 온 방문자 수 · 앞 질문 대비 남은 비율 (10월 7일부터 기록)
        </p>
        {stepReach && stepReach.size > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-[0.8rem] tabular-nums">
              <tbody>
                {(() => {
                  const first = stepReach.get(APPLY_STEPS[0][0]) ?? 0;
                  let prev = first;
                  return APPLY_STEPS.map(([id, label], i) => {
                    const n = stepReach.get(id);
                    if (n === undefined) return null;
                    const row = (
                      <tr key={id} className="border-t border-gold-dim/10">
                        <td className="py-1.5 pr-3 text-ivory-dim">{i + 1}. {label}</td>
                        <td className="py-1.5 pr-3 text-right">{n}</td>
                        <td className={`py-1.5 pr-3 text-right ${prev > 0 && n / prev < 0.9 ? "text-thread" : "text-ivory-dim/70"}`}>
                          {i > 0 ? pct(n, prev) : ""}
                        </td>
                        <td className="py-1.5 text-right text-ivory-dim/70">{pct(n, first)}</td>
                      </tr>
                    );
                    if (!id.startsWith("breakup_")) prev = n;
                    return row;
                  });
                })()}
              </tbody>
            </table>
            <p className="mt-2 text-[0.72rem] text-ivory-dim/70">붉은 숫자 = 앞 질문보다 10% 넘게 빠진 곳 · 오른쪽 끝 = 첫 질문 대비</p>
          </div>
        ) : (
          <p className="mt-3 text-[0.8rem] text-ivory-dim">아직 기록이 없어요. 신청이 몇 건 쌓이면 보여요.</p>
        )}
      </section>

      {/* 세그먼트 */}
      <section className="mt-6">
        <p className="text-sm font-semibold">누가, 왜 오고, 누가 결제하나</p>
        <p className="mt-1 text-[0.74rem] text-ivory-dim">신청 수 · 미리보기 · 결제 · 결제율(결제/신청)</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {s.segments.map((g) => (
            <div key={g.key} className="min-w-0 rounded-xl border border-gold-dim/20 bg-ink-soft px-4 py-3">
              <p className="text-[0.8rem] text-gold/90">{g.title}</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-[0.78rem]">
                  <thead>
                    <tr className="text-[0.68rem] text-ivory-dim">
                      <th className="py-1 text-left font-normal">구분</th>
                      <th className="py-1 text-right font-normal">신청</th>
                      <th className="py-1 text-right font-normal">미리보기</th>
                      <th className="py-1 text-right font-normal">결제</th>
                      <th className="py-1 text-right font-normal">결제율</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {g.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 text-ivory-dim">기간 내 신청 없음</td>
                      </tr>
                    )}
                    {g.rows.slice(0, 10).map((r) => (
                      <tr key={r.label} className="border-t border-gold-dim/10">
                        <td className="py-1.5 pr-2">{r.label}</td>
                        <td className="py-1.5 text-right">{r.applied}</td>
                        <td className="py-1.5 text-right">{r.preview}</td>
                        <td className="py-1.5 text-right">{r.paid}</td>
                        <td className={`py-1.5 text-right ${r.paid > 0 ? "text-gold" : "text-ivory-dim"}`}>{r.conv}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 유입 경로별 매출 — "어떤 릴스가 조회수가 아니라 결제를 만드는가" */}
      <section className="mt-6 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <p className="text-sm font-semibold">유입 경로별 매출 (첫 유입 기준)</p>
        <p className="mt-1 text-[0.74rem] text-ivory-dim">
          릴스마다 링크에 utm_source=instagram&amp;utm_campaign=reel&amp;utm_content=reel01 처럼 붙이면 릴스별로 나뉘어 보여요
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-[0.78rem]">
            <thead>
              <tr className="text-[0.68rem] text-ivory-dim">
                {["경로", "방문자", "무료 신청", "미리보기", "결제", "매출", "방문→결제"].map((h, i) => (
                  <th key={h} className={`py-1 font-normal ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {s.sources.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-2 text-ivory-dim">아직 기록 없음</td>
                </tr>
              )}
              {s.sources.slice(0, 20).map((r) => (
                <tr key={r.label} className="border-t border-gold-dim/10">
                  <td className="max-w-[16rem] break-all py-1.5 pr-2">{r.label}</td>
                  <td className="py-1.5 text-right">{r.visitors}</td>
                  <td className="py-1.5 text-right">{r.applied}</td>
                  <td className="py-1.5 text-right">{r.preview}</td>
                  <td className={`py-1.5 text-right ${r.paid > 0 ? "text-gold" : ""}`}>{r.paid}</td>
                  <td className="py-1.5 text-right">{r.revenue.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-ivory-dim">{pct(r.paid, r.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-6 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <p className="text-sm font-semibold">기기</p>
        <div className="mt-2 space-y-1 text-[0.8rem] tabular-nums">
          {s.devices.map((r) => (
            <div key={r.label} className="flex justify-between gap-3">
              <span className="text-ivory-dim">{r.label}</span>
              <span>방문 {r.visitors} · 신청 {r.applied} · 결제 {r.paid}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 일별 */}
      <section className="mt-6 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <p className="text-sm font-semibold">날짜별</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-[0.78rem]">
            <thead>
              <tr className="text-[0.68rem] text-ivory-dim">
                {["날짜", "방문자", "신청 시작", "신청", "미리보기", "결제 버튼", "결제창", "결제", "매출"].map((h, i) => (
                  <th key={h} className={`py-1 font-normal ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {s.byDay.map(({ day, f }) => (
                <tr key={day} className="border-t border-gold-dim/10">
                  <td className="py-1.5">{day.slice(5).replace("-", ".")}</td>
                  <td className="py-1.5 text-right">{f.visitors}</td>
                  <td className="py-1.5 text-right">{f.applyStart}</td>
                  <td className="py-1.5 text-right">{f.applied}</td>
                  <td className="py-1.5 text-right">{f.preview}</td>
                  <td className="py-1.5 text-right">{f.payClick}</td>
                  <td className="py-1.5 text-right">{f.payWindow}</td>
                  <td className="py-1.5 text-right text-gold">{f.paid}</td>
                  <td className="py-1.5 text-right">{f.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 시간대 */}
      <section className="mt-6 rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4">
        <p className="text-sm font-semibold">시간대별 신청</p>
        <div className="mt-3 flex h-24 items-end gap-[3px]">
          {s.hours.map((n, h) => {
            const max = Math.max(1, ...s.hours);
            return (
              <div key={h} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gold/50" style={{ height: `${(n / max) * 80}px` }} title={`${h}시 ${n}명`} />
                <span className="text-[0.55rem] text-ivory-dim">{h % 3 === 0 ? h : ""}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
