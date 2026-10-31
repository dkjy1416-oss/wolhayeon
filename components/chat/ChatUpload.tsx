"use client";

/** 캡처 업로드 (브라우저에서 1280px JPEG로 줄여서 1장씩 전송) → 1장 이상이면 결제 버튼 표시 */
import { useState } from "react";
import TossCheckout from "@/components/pay/TossCheckout";
import { CHAT_MAX_IMAGES } from "@/lib/chat/types";

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  /* 세로로 긴 스크롤 캡처는 너비 기준으로만 줄임 (글자가 뭉개지지 않게) */
  const s = bmp.height > bmp.width * 2.5 ? Math.min(1, 900 / bmp.width) : scale;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((r) => c.toBlob((b) => r(b ?? file), "image/jpeg", 0.85));
}

export default function ChatUpload(props: {
  orderNumber: string;
  token: string;
  initialCount: number;
  clientKey: string | null;
  amount: number;
  orderName: string;
  /** 대화 파일로 준비된 주문이면 캡처 업로드 없이 바로 결제 */
  fileReady?: boolean;
}) {
  const [count, setCount] = useState(props.fileReady ? 1 : props.initialCount);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    const list = Array.from(files).slice(0, CHAT_MAX_IMAGES - count);
    let n = count;
    for (let i = 0; i < list.length; i++) {
      setBusy(`${i + 1} / ${list.length}장 올리는 중…`);
      try {
        const blob = await shrink(list[i]);
        const fd = new FormData();
        fd.append("order", props.orderNumber);
        fd.append("t", props.token);
        fd.append("file", new File([blob], "c.jpg", { type: blob.type || "image/jpeg" }));
        const r = await fetch("/api/chat/upload", { method: "POST", body: fd });
        const j = (await r.json()) as { ok: boolean; count?: number; message?: string };
        if (!j.ok) throw new Error(j.message ?? "업로드 실패");
        n = j.count ?? n + 1;
        setCount(n);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "업로드에 실패했어요.");
        break;
      }
    }
    setBusy(null);
  };

  const reset = async () => {
    setBusy("지우는 중…");
    await fetch(`/api/chat/upload?order=${props.orderNumber}&t=${encodeURIComponent(props.token)}`, { method: "DELETE" }).catch(() => null);
    setCount(0);
    setBusy(null);
  };

  return (
    <div>
      {props.fileReady ? (
        <div className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5">
          <p className="text-[0.95rem] font-semibold text-ivory">1. 대화 파일 준비 완료 ✓</p>
          <p className="mt-1 text-[0.84rem] leading-[1.7] text-ivory-dim">상대 이름은 호칭으로 바꿔서 저장했어요. 리포트가 완성되면 원문은 바로 삭제돼요.</p>
        </div>
      ) : (
      <div className="rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5">
        <p className="text-[0.95rem] font-semibold text-ivory">1. 카톡 캡처 올리기</p>
        <ul className="mt-2 flex flex-col gap-1 text-[0.82rem] leading-[1.7] text-ivory-dim">
          <li>· 오래된 대화부터 순서대로 골라 주세요 (최대 {CHAT_MAX_IMAGES}장)</li>
          <li>· 분위기가 바뀐 때, 마지막 대화가 꼭 들어가면 좋아요</li>
          <li>· 상대 이름·프로필 사진은 가려도 괜찮아요</li>
        </ul>
        <label className={`mt-4 flex min-h-14 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-burgundy/60 text-[0.95rem] font-medium text-burgundy ${count >= CHAT_MAX_IMAGES || busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy ?? (count ? "캡처 더 추가하기" : "캡처 고르기")}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </label>
        <p className="mt-3 text-center text-[0.86rem] text-ivory">
          올린 캡처 <b className="text-burgundy">{count}</b> / {CHAT_MAX_IMAGES}장
          {count > 0 && !busy && (
            <button type="button" onClick={reset} className="ml-3 text-[0.78rem] text-ivory-dim underline underline-offset-4">
              전부 지우고 다시
            </button>
          )}
        </p>
        {err && <p className="mt-2 text-center text-[0.82rem] text-thread">{err}</p>}
      </div>
      )}

      <div className={`mt-5 rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5 ${count ? "" : "opacity-50"}`}>
        <p className="text-[0.95rem] font-semibold text-ivory">2. 결제하고 분석 받기</p>
        {!count ? (
          <p className="mt-2 text-[0.84rem] text-ivory-dim">캡처를 1장 이상 올리면 결제할 수 있어요.</p>
        ) : props.clientKey ? (
          <div className="mt-4">
            <TossCheckout
              clientKey={props.clientKey}
              orderNumber={props.orderNumber}
              amount={props.amount}
              orderName={props.orderName}
              successPath="/chat/payment/success"
              failPath={`/chat/payment/fail?order=${props.orderNumber}&t=${encodeURIComponent(props.token)}`}
            />
          </div>
        ) : (
          <p className="mt-2 text-[0.84rem] text-thread">결제 준비 중이에요. 잠시 후 다시 시도해 주세요.</p>
        )}
      </div>
    </div>
  );
}
