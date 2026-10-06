"use client";

/**
 * 미리보기 결론을 인스타 스토리용 카드(1080×1920)로 만들어 공유·저장.
 * - 사연·이름·상대 정보는 절대 넣지 않는다: 결론 라벨(고정 3종)과 반응 태그(고정 어휘)만 사용.
 * - 공유가 안 되는 앱 안 브라우저(인스타그램 등)에서는 이미지를 띄워 길게 눌러 저장하게 한다.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { logPayEvent } from "@/lib/pay-events";

const W = 1080;
const H = 1920;
const SERIF = '"ChosunIlboMyungjo", "Noto Serif KR", serif';
const SANS = '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", sans-serif';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function drawCard(stance: string, tags: string[], line: string): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  try {
    await document.fonts?.ready;
  } catch {
    /* 기본 글꼴로 진행 */
  }
  g.fillStyle = "#0d0d0f";
  g.fillRect(0, 0, W, H);
  const bg = await loadImage("/wolhwa/wolhwa-gaze.webp");
  if (bg) {
    const s = Math.max(W / bg.width, H / bg.height);
    const bw = bg.width * s;
    const bh = bg.height * s;
    g.globalAlpha = 0.55;
    g.drawImage(bg, (W - bw) / 2, (H - bh) / 2 - 120, bw, bh);
    g.globalAlpha = 1;
  }
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(13,13,15,0.55)");
  grad.addColorStop(0.45, "rgba(13,13,15,0.35)");
  grad.addColorStop(0.7, "rgba(13,13,15,0.9)");
  grad.addColorStop(1, "rgba(13,13,15,1)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  g.textAlign = "center";
  g.fillStyle = "#d8b878";
  g.font = `500 34px ${SERIF}`;
  g.fillText("月 下 緣", W / 2, 190);
  g.fillStyle = "rgba(240,232,218,0.75)";
  g.font = `400 36px ${SANS}`;
  g.fillText("월화가 읽은 나의 지금", W / 2, 1080);

  g.fillStyle = "#f3ece0";
  g.font = `600 82px ${SERIF}`;
  g.fillText(stance, W / 2, 1210);

  if (tags.length) {
    g.font = `500 40px ${SANS}`;
    g.fillStyle = "#c86b78";
    g.fillText(tags.slice(0, 3).map((t) => `#${t}`).join("  "), W / 2, 1310);
  }

  g.fillStyle = "rgba(240,232,218,0.9)";
  g.font = `400 46px ${SERIF}`;
  line.split("\n").forEach((l, i) => g.fillText(l, W / 2, 1450 + i * 70));

  g.strokeStyle = "rgba(216,184,120,0.35)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(W / 2 - 160, 1640);
  g.lineTo(W / 2 + 160, 1640);
  g.stroke();
  g.fillStyle = "#d8b878";
  g.font = `500 40px ${SANS}`;
  g.fillText("내 이야기도 무료로 읽어보기", W / 2, 1715);
  g.fillStyle = "rgba(240,232,218,0.8)";
  g.font = `400 36px ${SANS}`;
  g.fillText("thewolha.com  ·  @thewolhayeon", W / 2, 1775);

  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

export default function ShareStoryCard({
  orderNumber,
  stance,
  tags,
  line,
}: {
  orderNumber: string;
  stance: string;
  tags: string[];
  line: string;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await drawCard(stance, tags, line);
      if (!blob) return;
      const file = new File([blob], "wolhayeon-card.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: "내 이야기도 무료로 읽어보기 thewolha.com" });
          logPayEvent(orderNumber, "share_card", "shared");
          return;
        } catch {
          /* 취소 → 아래 저장 화면으로 */
        }
      }
      setPreview(URL.createObjectURL(blob));
      logPayEvent(orderNumber, "share_card", "saved");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="mt-3 w-full rounded-full border border-gold-dim/35 py-2.5 text-[0.8rem] text-gold active:opacity-80"
      >
        {busy ? "카드 만드는 중…" : "↗ 이 결론, 스토리 카드로 저장하기"}
      </button>
      {preview && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/95 px-6"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="스토리 카드" className="max-h-[70svh] w-auto rounded-xl" />
          <p className="text-center text-[0.84rem] leading-[1.8] text-ivory">
            이미지를 <b>길게 눌러 저장</b>한 뒤
            <br />
            인스타 스토리에 올려 보세요. 이름·사연은 들어가지 않아요.
          </p>
          <p className="text-[0.74rem] text-ivory-dim">화면을 누르면 닫혀요</p>
        </div>,
        document.body
      )}
    </>
  );
}
