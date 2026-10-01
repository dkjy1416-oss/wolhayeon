/**
 * 개인화 책 완성 안내 메일 (서버 전용).
 */
import "server-only";
import { Resend } from "resend";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendBookReadyEmail(opts: {
  to: string;
  name: string;
  orderNumber: string;
  downloadUrl: string;
  /** 후기 남기기 링크 (없으면 생략) */
  reviewUrl?: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) return false;
  const name = opts.name.trim() || "고객";
  const n = esc(name);
  const subject = `[월하연] ${name}님을 위한 책이 완성되었어요`;
  const text = [
    `${name}님, 안녕하세요. 월하연입니다.`,
    ``,
    `${name}님의 이야기로 엮은 《헤어진 뒤, 연락하지 말아야 할 때》가 완성되었어요.`,
    `표지부터 지금의 판정, ${name}님을 위한 메시지 초안, 날짜가 적힌 7일·21일 기록장까지 담았어요.`,
    ``,
    `아래 링크에서 PDF를 내려받으실 수 있어요. (링크는 60일 동안 열려요)`,
    opts.downloadUrl,
    ``,
    `휴대폰에 저장해 두고, 흔들리는 밤마다 필요한 장을 펼쳐 주세요.`,
    ``,
    ...(opts.reviewUrl
      ? [`책을 읽어 보시고, 월화에게 한마디 남겨 주시면 큰 힘이 돼요.`, opts.reviewUrl, ``]
      : []),
    `— 월하연 月下緣`,
    `주문번호 ${opts.orderNumber}`,
  ].join("\n");
  const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#0a0908;">
  <div style="max-width:520px;margin:0 auto;padding:44px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 28px;">月下緣 · 월하연</p>
    <p style="font-size:17px;line-height:1.9;margin:0 0 18px;">${n}님을 위한 책이<br/>완성되었어요.</p>
    <p style="font-size:15px;line-height:2.05;color:#d8d2c6;margin:0 0 24px;">
      ${n}님의 이야기로 엮은 《헤어진 뒤, 연락하지 말아야 할 때》예요.
      표지부터 지금의 판정, ${n}님을 위한 메시지 초안, 날짜가 적힌 7일·21일 기록장까지 담았어요.
    </p>
    <a href="${opts.downloadUrl}" style="display:block;text-align:center;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:17px 20px;font-size:15px;">내 책 PDF 받기</a>
    <p style="font-size:12.5px;color:#a89f8d;line-height:1.9;margin:14px 0 30px;text-align:center;">링크는 60일 동안 열려요. 휴대폰에 저장해 두고 흔들리는 밤마다 펼쳐 주세요.</p>
    ${
      opts.reviewUrl
        ? `<p style="font-size:13px;color:#a89f8d;line-height:1.9;margin:0 0 6px;text-align:center;">책을 읽어 보시고, 월화에게 한마디 남겨 주시면 큰 힘이 돼요.</p>
    <p style="text-align:center;margin:0 0 26px;"><a href="${opts.reviewUrl}" style="color:#c9a96e;font-size:13px;">후기 남기기</a></p>`
        : ""
    }
    <p style="font-size:11.5px;color:#7d776b;line-height:1.9;margin:30px 0 0;">주문번호 ${esc(opts.orderNumber)}</p>
  </div></body></html>`;
  try {
    const r = await new Resend(apiKey).emails.send(
      { from: `월하연 月下緣 <${fromEmail}>`, to: opts.to, subject, text, html },
      { idempotencyKey: `book-ready-v1-${opts.orderNumber}` }
    );
    return !r.error;
  } catch {
    return false;
  }
}
