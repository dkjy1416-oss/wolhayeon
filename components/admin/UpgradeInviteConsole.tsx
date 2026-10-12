"use client";

/** 책 추가 구매 안내 메일 — 대상 확인·미리보기 → 운영자 메일로 테스트 → (직접) 발송 */
import { useState } from "react";

interface Recipient {
  order: string;
  name: string;
  email: string;
}
interface Preview {
  recipients: Recipient[];
  skipped: Record<string, number>;
  inviteSubject: string;
  inviteHtml: string;
  couponSubject: string;
  couponHtml: string;
}

const SKIP_LABEL: Record<string, string> = {
  no_consent: "광고성 정보 수신 미동의",
  not_delivered: "아직 결과 미제공",
  already_reviewed: "이미 후기 작성",
  already_invited: "이미 안내 메일 받음",
  not_eligible: "자격 없음(책 구매·환불 등)",
  operator: "운영자·테스트",
};

export default function UpgradeInviteConsole() {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [tab, setTab] = useState<"invite" | "coupon">("invite");
  const [confirmSend, setConfirmSend] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const call = async (mode: "preview" | "test" | "send") => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/upgrade-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const j = await res.json();
      if (!j.ok) setResult(`실패: ${j.error ?? res.status}`);
      else if (mode === "preview") setPreview(j as Preview);
      else if (mode === "test") setResult(`테스트 메일 ${j.sent}통을 ${j.to}(운영자)로 보냈어요. 고객에게는 가지 않았어요.`);
      else setResult(`완료 — 안내 메일 발송 ${j.sent}통 · 실패 ${j.failed}통`);
    } catch {
      setResult("요청 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
      setConfirmSend(false);
    }
  };

  return (
    <section className="mb-10 rounded-2xl border border-gold-dim/30 bg-ink-soft/40 px-5 py-5">
      <h2 className="text-[1rem] font-semibold text-ivory">책 추가 구매 안내 메일 (후기 → 쿠폰)</h2>
      <p className="mt-2 text-[0.74rem] leading-relaxed text-ivory-dim">
        결과를 받은 12,900원 분석 결제 고객 중 광고성 정보 수신에 동의한 분께만 보내요. 후기를 남기면 별점·내용과 관계없이 책 추가 구매 쿠폰(27,000원, 14일)이
        자동 발급돼요. 한 주문에 한 번만 보내져요.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => call("preview")}
          className="rounded-full border border-gold-dim/50 px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-50"
        >
          대상 확인 · 메일 미리보기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => call("test")}
          className="rounded-full border border-gold/50 px-5 py-2.5 text-[0.85rem] text-gold disabled:opacity-50"
        >
          내 메일로 테스트 발송
        </button>
        {!confirmSend ? (
          <button
            type="button"
            disabled={busy || !preview || preview.recipients.length === 0}
            onClick={() => setConfirmSend(true)}
            className="rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-40"
          >
            안내 메일 발송
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => call("send")}
            className="rounded-full bg-thread px-5 py-2.5 text-[0.85rem] text-ivory disabled:opacity-40"
          >
            {busy ? "보내는 중…" : `정말 ${preview?.recipients.length ?? 0}명에게 보낼게요`}
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-5 text-[0.82rem] leading-[1.9]">
          <p>
            발송 대상 <b className="text-gold">{preview.recipients.length}명</b>
          </p>
          <ul className="mt-1">
            {preview.recipients.map((r) => (
              <li key={r.order} className="flex justify-between gap-3">
                <span>{r.name || "(이름 없음)"}</span>
                <span className="text-ivory-dim">{r.email}</span>
                <span className="text-ivory-dim/70">{r.order}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[0.74rem] text-ivory-dim">
            제외:{" "}
            {Object.entries(preview.skipped)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => `${SKIP_LABEL[k] ?? k} ${n}명`)
              .join(" · ") || "없음"}
          </p>
          <div className="mt-4 flex gap-2 text-[0.78rem]">
            <button type="button" onClick={() => setTab("invite")} className={tab === "invite" ? "text-gold underline" : "text-ivory-dim"}>
              ① 안내 메일
            </button>
            <button type="button" onClick={() => setTab("coupon")} className={tab === "coupon" ? "text-gold underline" : "text-ivory-dim"}>
              ② 후기 후 쿠폰 메일
            </button>
          </div>
          <p className="mt-2 text-[0.75rem] text-gold">제목: {tab === "invite" ? preview.inviteSubject : preview.couponSubject}</p>
          <iframe
            title="메일 미리보기"
            srcDoc={tab === "invite" ? preview.inviteHtml : preview.couponHtml}
            className="mt-2 h-[640px] w-full rounded-lg border border-gold-dim/25 bg-black"
          />
        </div>
      )}

      {result && <p className="mt-4 text-[0.85rem] text-gold">{result}</p>}
    </section>
  );
}
