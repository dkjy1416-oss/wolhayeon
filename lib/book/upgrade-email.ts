import "server-only";
/**
 * 책 추가 구매 메일 2종 (서버 전용).
 *  1) 쿠폰 메일 — 후기를 남긴 분 중 '메일로도 받기'에 동의한 분께 (후기 작성 직후 자동)
 *  2) 안내 메일 — 분석 결과를 받은 12,900원 결제 고객 중 광고성 정보 수신 동의자에게,
 *     관리자가 미리보기 확인 후 직접 발송 (후기 남기기 → 쿠폰)
 * 광고성 정보이므로 제목에 (광고), 본문 끝에 수신거부 방법과 사업자 정보를 표기한다.
 */
import { createHash } from "crypto";
import { Resend } from "resend";
import {
  BOOK_PRICE_KRW,
  BOOK_UPGRADE_BASE_KRW,
  BOOK_UPGRADE_PRICE_KRW,
  BOOK_UPGRADE_SOURCE_KRW,
} from "@/lib/ritual-types";
import { BOOK_ONLY_SHORT } from "@/lib/book/book-contents";
import { BUSINESS } from "@/components/legal/LegalPage";
import { upgradeDeadlineLabel } from "@/lib/book/upgrade-rules";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const DIFF_TEXT =
  "분석은 지금 사연에 대한 판단과 다음 행동(웹 화면 · 30일 열람)이고, 책은 흔들릴 때마다 다시 펼치는 상황별 문장 · 체크리스트 · 7일/21일 기록장(PDF · 내려받아 계속 보관)이에요. 연락 시점과 문장 이야기는 일부 겹쳐요.";

export function upgradeConditions(endsAt: number): string[] {
  return [
    `${BOOK_UPGRADE_SOURCE_KRW.toLocaleString()}원에 분석을 결제한 본인 주문에만 1회 적용돼요.`,
    `사용 기한: ${upgradeDeadlineLabel(endsAt)}까지 (발급 후 14일)`,
    "다른 할인과 함께 쓸 수 없어요. 이미 책·패키지를 구매했거나 기존 분석을 환불받은 경우에는 쓸 수 없어요.",
    "결제를 취소하거나 실패해도 쿠폰은 그대로 남아요. 결제가 완료되면 사용 완료돼요.",
  ];
}

const FOOTER_TEXT = [
  `이 메일은 월하연을 이용하신 분께 보내는 광고성 정보입니다.`,
  `더 이상 받기를 원하지 않으시면 이 메일에 '수신거부'라고 답장해 주세요.`,
  `${BUSINESS.company} · 대표 ${BUSINESS.ceo} · 사업자등록번호 ${BUSINESS.regNo} · ${BUSINESS.address} · ${BUSINESS.phone} · ${BUSINESS.email}`,
];
const FOOTER_HTML = `<p style="font-size:11px;color:#7d776b;line-height:1.9;margin:36px 0 0;">
      이 메일은 월하연을 이용하신 분께 보내는 광고성 정보입니다.<br/>
      더 이상 받기를 원하지 않으시면 이 메일에 ‘수신거부’라고 답장해 주세요.<br/>
      ${esc(BUSINESS.company)} · 대표 ${esc(BUSINESS.ceo)} · 사업자등록번호 ${esc(BUSINESS.regNo)}<br/>
      ${esc(BUSINESS.address)} · ${esc(BUSINESS.phone)} · ${esc(BUSINESS.email)}
    </p>`;

const BTN = `display:block;text-align:center;background-color:#6d1f2c;background:linear-gradient(#6d1f2c,#521722);color:#efe9dc;text-decoration:none;border:1px solid rgba(201,169,110,.35);border-radius:999px;padding:17px 20px;font-size:15px;`;
const BTN2 = `display:block;text-align:center;color:#e2c48a;text-decoration:none;border:1px solid rgba(201,169,110,.45);border-radius:999px;padding:14px 20px;font-size:14px;`;

function shell(inner: string): string {
  return `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background-color:#0a0908;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0908" style="background-color:#0a0908;"><tr><td align="center" bgcolor="#0a0908" style="background-color:#0a0908;">
  <div style="background-color:#0a0908;text-align:left;max-width:520px;margin:0 auto;padding:40px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#efe9dc;">
  ${inner}
  </div></td></tr></table></body></html>`;
}

function bookItemsHtml(): string {
  return BOOK_ONLY_SHORT.map(
    (b) => `<tr><td style="width:22px;vertical-align:top;padding:8px 0;color:#e2c48a;font-size:13px;">✓</td>
      <td style="vertical-align:top;padding:8px 0;border-bottom:1px solid rgba(201,169,110,.12);">
        <div style="font-size:14px;color:#efe9dc;">${esc(b.title)}</div>
        <div style="font-size:12.5px;color:#a89f8d;margin-top:3px;line-height:1.65;">${esc(b.body)}</div>
      </td></tr>`
  ).join("");
}

/** 1) 쿠폰 메일 */
export function buildUpgradeCouponEmail(o: {
  name: string;
  siteUrl: string;
  bookUrl: string;
  payUrl: string;
  endsAt: number;
}) {
  const safe = o.name.trim() || "고객";
  const n = esc(safe);
  const price = BOOK_UPGRADE_PRICE_KRW.toLocaleString();
  const regular = BOOK_PRICE_KRW.toLocaleString();
  const cond = upgradeConditions(o.endsAt);
  const subject = `(광고) [월하연] ${safe}님, 후기 고마워요 — 책 추가 구매 쿠폰 ${price}원`;
  const text = [
    `(광고) ${safe}님, 남겨 주신 후기 고마워요. 월하연입니다.`,
    ``,
    `약속드린 책 추가 구매 쿠폰을 보내 드려요.`,
    ``,
    `《헤어진 뒤, 연락하지 말아야 할 때》 — ${safe}님 이름이 들어간 개인 맞춤 PDF 책 (약 120쪽)`,
    ...BOOK_ONLY_SHORT.map((b) => `· ${b.title} — ${b.body}`),
    ``,
    `분석과 무엇이 다른가요? ${DIFF_TEXT}`,
    ``,
    `[추가 구매 금액] ${regular}원 → ${price}원`,
    `(패키지 기준가 ${BOOK_UPGRADE_BASE_KRW.toLocaleString()}원 − 기존 분석 결제 ${BOOK_UPGRADE_SOURCE_KRW.toLocaleString()}원)`,
    ``,
    `책 소개 보기: ${o.bookUrl}`,
    `쿠폰 적용해서 바로 결제: ${o.payUrl}`,
    ``,
    `[쿠폰 사용 조건]`,
    ...cond.map((c) => `· ${c}`),
    ``,
    `사연을 다시 쓰지 않아요. 이미 받은 분석은 그대로 두고, 같은 사연으로 책만 만들어요.`,
    ``,
    `— 월하연 月下緣 드림`,
    ``,
    ...FOOTER_TEXT,
  ].join("\n");

  const html = shell(`
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 26px;">(광고) 月下緣 · 월하연</p>
    <p style="font-size:17px;line-height:1.9;margin:0 0 14px;">${n}님, 남겨 주신 후기 고마워요.</p>
    <p style="font-size:15px;line-height:2;color:#d8d2c6;margin:0 0 24px;">약속드린 <span style="color:#e2c48a;">책 추가 구매 쿠폰</span>을 보내 드려요.</p>
    <div style="text-align:center;margin:0 0 8px;">
      <img src="${o.siteUrl}/book/v2/cover-3d.webp" alt="《헤어진 뒤, 연락하지 말아야 할 때》" width="200" style="display:inline-block;width:200px;max-width:64%;height:auto;" />
    </div>
    <p style="font-size:18px;line-height:1.6;text-align:center;color:#efe9dc;margin:6px 0 4px;">《헤어진 뒤,<br/>연락하지 말아야 할 때》</p>
    <p style="font-size:12.5px;text-align:center;color:#a89f8d;margin:0 0 20px;">${n}님 이름이 들어간 개인 맞춤 PDF 책 · 약 120쪽</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 16px;">${bookItemsHtml()}</table>
    <p style="font-size:13px;line-height:1.95;color:#a89f8d;margin:0 0 24px;"><span style="color:#efe9dc;">분석과 무엇이 다른가요?</span> ${esc(DIFF_TEXT)}</p>
    <a href="${o.bookUrl}" style="${BTN2}">책 소개 · 실제 페이지 보기</a>
    <div style="border:1px solid rgba(201,169,110,.45);border-radius:18px;padding:22px 20px;text-align:center;margin:20px 0 16px;background:rgba(201,169,110,.05);">
      <p style="font-size:12px;letter-spacing:0.2em;color:#c9a96e;margin:0 0 10px;">기존 분석 구매자 추가 구매 쿠폰</p>
      <p style="font-size:13.5px;color:#8d8779;margin:0;"><span style="text-decoration:line-through;">${regular}원</span></p>
      <p style="font-size:30px;font-weight:600;color:#e2c48a;margin:6px 0 0;">${price}원</p>
      <p style="font-size:12px;color:#a89f8d;margin:8px 0 0;">패키지 기준가 ${BOOK_UPGRADE_BASE_KRW.toLocaleString()}원 − 기존 분석 결제 ${BOOK_UPGRADE_SOURCE_KRW.toLocaleString()}원</p>
      <p style="font-size:12.5px;color:#d8a0a8;margin:8px 0 0;">${esc(upgradeDeadlineLabel(o.endsAt))}까지</p>
    </div>
    <a href="${o.payUrl}" style="${BTN}">쿠폰 적용해서 책 받기 · ${price}원</a>
    <p style="font-size:12.5px;color:#a89f8d;line-height:1.9;margin:12px 0 22px;text-align:center;">사연을 다시 쓰지 않아요. 같은 사연으로 책만 만들어요.<br/>결제 후 보통 몇 분 안에 화면과 메일로 받고, 60일 동안 내려받을 수 있어요.</p>
    <p style="font-size:12px;color:#c9a96e;margin:0 0 6px;">쿠폰 사용 조건</p>
    <ul style="font-size:12px;color:#a89f8d;line-height:1.85;margin:0 0 26px;padding-left:18px;">${cond.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
    <p style="font-size:14px;color:#c9a96e;margin:0;">— 월하연 月下緣 드림</p>
    ${FOOTER_HTML}`);
  return { subject, text, html };
}

/** 2) 안내 메일 (후기 남기면 쿠폰) */
export function buildUpgradeInviteEmail(o: { name: string; siteUrl: string; reviewUrl: string }) {
  const safe = o.name.trim() || "고객";
  const n = esc(safe);
  const price = BOOK_UPGRADE_PRICE_KRW.toLocaleString();
  const regular = BOOK_PRICE_KRW.toLocaleString();
  const subject = `(광고) [월하연] ${safe}님, 짧은 후기를 남기면 책 추가 구매 쿠폰을 드려요`;
  const text = [
    `(광고) ${safe}님, 안녕하세요. 월하연입니다.`,
    ``,
    `받아 보신 분석은 어떠셨나요? 질문 두 개만 고르면 후기 문장이 만들어지고, 고쳐서 남길 수 있어요.`,
    `후기를 남겨 주시면 별점·내용과 관계없이 책 추가 구매 쿠폰(${regular}원 → ${price}원)을 드려요.`,
    `아쉬웠던 점도 그대로 남겨 주세요. 쿠폰은 똑같이 드려요.`,
    ``,
    `후기 남기기: ${o.reviewUrl}`,
    ``,
    `《헤어진 뒤, 연락하지 말아야 할 때》 — 내 사연으로 만드는 개인 맞춤 PDF 책 (약 120쪽)`,
    DIFF_TEXT,
    ``,
    `— 월하연 月下緣 드림`,
    ``,
    ...FOOTER_TEXT,
  ].join("\n");
  const html = shell(`
    <p style="font-size:11px;letter-spacing:0.3em;color:#c9a96e;margin:0 0 26px;">(광고) 月下緣 · 월하연</p>
    <p style="font-size:17px;line-height:1.9;margin:0 0 14px;">${n}님, 받아 보신 분석은 어떠셨나요?</p>
    <p style="font-size:15px;line-height:2;color:#d8d2c6;margin:0 0 20px;">
      질문 두 개만 고르면 후기 문장이 만들어지고, 고쳐서 남길 수 있어요.<br/>
      후기를 남겨 주시면 <span style="color:#e2c48a;">별점·내용과 관계없이</span> 책 추가 구매 쿠폰을 드려요.
    </p>
    <div style="border:1px solid rgba(201,169,110,.45);border-radius:18px;padding:20px;text-align:center;margin:0 0 16px;background:rgba(201,169,110,.05);">
      <p style="font-size:12px;letter-spacing:0.2em;color:#c9a96e;margin:0 0 8px;">후기 작성 혜택</p>
      <p style="font-size:14px;color:#efe9dc;margin:0;">개인 맞춤 PDF 책 <span style="text-decoration:line-through;color:#8d8779;">${regular}원</span> → <span style="color:#e2c48a;font-size:20px;font-weight:600;">${price}원</span></p>
      <p style="font-size:12px;color:#a89f8d;margin:8px 0 0;">패키지 기준가 ${BOOK_UPGRADE_BASE_KRW.toLocaleString()}원 − 기존 분석 결제 ${BOOK_UPGRADE_SOURCE_KRW.toLocaleString()}원 · 발급 후 14일 · 1회</p>
    </div>
    <a href="${o.reviewUrl}" style="${BTN}">후기 남기고 쿠폰 받기</a>
    <p style="font-size:12.5px;color:#a89f8d;line-height:1.9;margin:12px 0 26px;text-align:center;">아쉬웠던 점도 그대로 남겨 주세요. 쿠폰은 똑같이 드려요.<br/>공개 여부는 후기 화면에서 따로 고를 수 있어요.</p>
    <p style="font-size:13px;line-height:1.95;color:#a89f8d;margin:0 0 24px;"><span style="color:#efe9dc;">책은 분석과 무엇이 다른가요?</span> ${esc(DIFF_TEXT)}</p>
    <p style="font-size:14px;color:#c9a96e;margin:0;">— 월하연 月下緣 드림</p>
    ${FOOTER_HTML}`);
  return { subject, text, html };
}

export async function sendMail(to: string, mail: { subject: string; text: string; html: string }, key: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) return false;
  try {
    const r = await new Resend(apiKey).emails.send(
      { from: `월하연 月下緣 <${fromEmail}>`, to, subject: mail.subject, text: mail.text, html: mail.html },
      { idempotencyKey: `${key}-${createHash("sha256").update(to.toLowerCase()).digest("hex").slice(0, 16)}`.slice(0, 250) }
    );
    return !r.error;
  } catch {
    return false;
  }
}
