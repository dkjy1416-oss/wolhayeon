/**
 * 신청 완료 직후 "내 미리보기 열기" 안내 메일 (서버 전용).
 *
 * 배경: 미리보기 접근 정보는 브라우저 세션에만 있어 탭을 닫으면 돌아올
 * 길이 없고, 실제로 신청 2~3분 뒤 CS 본인확인으로 우회하는 고객이
 * 확인됨(9/26). 신청 즉시 복귀 링크를 메일로 보내 그 우회를 없앤다.
 *
 * - 성격: 서비스 이행 안내(트랜잭션 메일) — 신청 결과와 본인 접근 링크.
 *   광고성 아님 → (광고) 표기·마케팅 수신동의 불필요.
 * - 링크: 기존 리마인드와 동일한 14일 토큰 → /api/remind/open 에서
 *   30분 continue 토큰으로 교환 (검증 로직 무변경).
 * - 실패해도 주문 생성 흐름에는 절대 영향 없음.
 */
import "server-only";
import { Resend } from "resend";
import { createRemindToken } from "@/lib/remind-auth";
import { isValidEmail } from "@/lib/ritual-types";
import { sanitizeSiteUrl } from "@/lib/delivery-rules";

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPreviewLinkEmail(params: {
  orderNumber: string;
  applicantName: string;
  email: string;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
    const siteUrl = sanitizeSiteUrl(process.env.SITE_URL);
    if (!apiKey || !fromEmail || !siteUrl) return;
    if (!isValidEmail(params.email)) return;

    const token = createRemindToken(params.orderNumber);
    if (!token) return;

    const openUrl = `${siteUrl}/api/remind/open?order=${encodeURIComponent(
      params.orderNumber
    )}&t=${encodeURIComponent(token)}`;

    const name = params.applicantName.trim() || "당신";
    const esc = escapeHtml(name);
    const subject = `[월하연] ${name}님의 이야기가 저장되었어요`;

    const text = [
      `${name}님,`,
      ``,
      `들려주신 이야기가 잘 저장되었고,`,
      `월화가 먼저 읽은 마음(무료 미리보기)은`,
      `아래 링크에서 언제든 다시 열 수 있어요.`,
      ``,
      openUrl,
      ``,
      `화면을 닫았더라도 이 링크 하나면 충분해요. (14일간 유효)`,
      ``,
      `— 월하연 月下緣`,
      ``,
      `이 메일은 월하연에 이야기를 남겨주신 분께 발송되는 안내 메일입니다.`,
    ].join("\n");

    const html = `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#0a0908;">
  <div style="max-width:520px;margin:0 auto;padding:44px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 28px;">月下緣 · 월하연</p>
    <p style="font-size:16px;line-height:2;margin:0 0 20px;">${esc}님,</p>
    <p style="font-size:15px;line-height:2.1;color:#d8d2c6;margin:0 0 20px;">
      들려주신 이야기가 잘 저장되었어요.<br/>
      월화가 먼저 읽은 마음(무료 미리보기)은<br/>
      아래에서 언제든 다시 열 수 있어요.
    </p>
    <a href="${openUrl}"
       style="display:block;text-align:center;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:16px 20px;font-size:15px;">
      ${esc}님의 미리보기 열기
    </a>
    <p style="font-size:12.5px;color:#a89f8d;line-height:1.9;margin:20px 0 0;">
      화면을 닫았더라도 이 링크 하나면 충분해요. (14일간 유효)
    </p>
    <p style="font-size:12px;color:#8d8779;line-height:1.9;margin:36px 0 0;">
      이 메일은 월하연에 이야기를 남겨주신 분께 발송되는 안내 메일입니다.
    </p>
  </div></body></html>`;

    await new Resend(apiKey).emails.send(
      {
        from: `월하연 月下緣 <${fromEmail}>`,
        to: params.email,
        subject,
        text,
        html,
      },
      { idempotencyKey: `preview-link-v1-${params.orderNumber}` }
    );
  } catch {
    /* 메일 실패는 조용히 무시 — 주문 생성이 우선 */
  }
}
