"use client";

/** 카톡 무료 유형 결과 공유 (11/3) — 탈리처럼 '내 유형' 공유로 친구 유입. 개인 답변은 담지 않고 유형 이름만 공유 */
import { useState } from "react";
import { sendSiteEvent } from "@/lib/site-track";

export default function ShareTypeButton({ typeKey, typeName }: { typeKey: string; typeName: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const url = () => `${window.location.origin}/chat/type/${typeKey}?utm_source=share&utm_medium=friend&utm_content=type_${typeKey}`;
  const text = `내 카톡 대화 유형은 ‘${typeName}’래 😮 너도 1분이면 무료로 볼 수 있어`;

  const share = async () => {
    sendSiteEvent("chat_share", { step: typeKey });
    const u = url();
    try {
      if (navigator.share) {
        await navigator.share({ title: `내 카톡 유형: ${typeName}`, text, url: u });
        return;
      }
    } catch {
      /* 공유 창을 닫은 경우 등 — 아래 복사로 */
    }
    copy(u);
  };
  const copy = async (u = url()) => {
    try {
      await navigator.clipboard.writeText(`${text}\n${u}`);
      setMsg("링크를 복사했어요. 카톡·인스타 DM에 붙여 넣어 주세요.");
    } catch {
      setMsg(u);
    }
  };

  return (
    <div className="mt-5 flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#fee500] px-4 text-[0.92rem] font-bold text-[#1a1215] active:opacity-85"
        >
          내 유형 친구에게 공유하기
        </button>
        <button
          type="button"
          onClick={() => {
            sendSiteEvent("chat_share", { step: `${typeKey}-copy` });
            copy();
          }}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-gold-dim px-4 text-[0.86rem] text-ivory active:opacity-85"
        >
          링크 복사
        </button>
      </div>
      {msg && <p className="select-all break-all text-center text-[0.78rem] text-ivory-dim">{msg}</p>}
      <p className="text-center text-[0.72rem] text-ivory-dim">고른 답은 공유되지 않고, 유형 이름만 보여요.</p>
    </div>
  );
}
