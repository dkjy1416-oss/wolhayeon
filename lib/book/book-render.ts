/**
 * 개인화 책 HTML 조립 (서버 전용) — 공통 원고 + 개인화 부분.
 */
import "server-only";
import { BOOK_CSS, BOOK_FRAGMENTS } from "@/lib/book/book-template";
import type { BookPersonal } from "@/lib/book/book-personal";

const WD = "일월화수목금토";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** KST 기준 날짜 */
function kstDay(base: Date, addDays = 0): Date {
  const kst = new Date(base.getTime() + 9 * 3600 * 1000);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + addDays));
}
const kd = (d: Date) => `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WD[d.getUTCDay()]})`;
const sd = (d: Date) => `${d.getUTCMonth() + 1}.${d.getUTCDate()} ${WD[d.getUTCDay()]}`;

function must(s: string, a: string, b: string): string {
  const i = s.indexOf(a);
  if (i < 0) throw new Error(`book_anchor_missing:${a.slice(0, 30)}`);
  return s.slice(0, i) + b + s.slice(i + a.length);
}

const VERDICT: Record<BookPersonal["verdict"], { cls: string; label: string }> = {
  no: { cls: "v-no", label: "지금 연락 X" },
  wait: { cls: "v-wait", label: "조금 더 기다리기" },
  ok: { cls: "v-ok", label: "짧게 연락 가능" },
};

export function renderBookHtml(opts: {
  name: string;
  partner: string;
  paidAt: Date;
  personal: BookPersonal;
}): string {
  const { personal: P } = opts;
  const N = esc(opts.name.trim() || "당신");
  const d0 = kstDay(opts.paidAt, 0);
  const until = kstDay(opts.paidAt, P.wait_days);
  const untilText =
    P.verdict === "no" && P.wait_days === 0
      ? "기한 없이 — 상대가 먼저 문을 열 때까지"
      : `${kd(until)}까지`;

  /* ---------- head ---------- */
  const css = BOOK_CSS.replace(
    'content: "헤어진 뒤, 연락하지 말아야 할 때"',
    `content: "${N.replace(/"/g, "")} 님을 위한 한 권"`
  );
  const head = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>헤어진 뒤, 연락하지 말아야 할 때 — ${N} 님</title>
<style>${css}</style></head><body>`;

  /* ---------- front ---------- */
  let front = BOOK_FRAGMENTS.front;
  front = must(
    front,
    '<div class="sub">월화가 알려주는 재회의 순서</div>',
    `<div class="sub">월화가 알려주는 재회의 순서<br><span style="color:#e2c48a">${N} 님을 위한 한 권 · ${d0.getUTCFullYear()}. ${d0.getUTCMonth() + 1}. ${d0.getUTCDate()}.</span></div>`
  );
  front = must(front, "WOLHAYEON · PDF BOOK", `WOLHAYEON · FOR ${N}`);
  const i = front.indexOf('<section class="full centerpage"');
  const j = front.indexOf("</section>", i) + "</section>".length;
  const letter = P.opening_letter
    .map((x) => `<p style="font-size:9.8pt;line-height:2.15;color:var(--ink);text-align:left">${esc(x)}</p>`)
    .join("");
  front =
    front.slice(0, i) +
    `<section class="full centerpage" style="background:var(--paper);padding:0 22mm">
  <span class="kicker">${N} 님에게</span>
  <div class="thread" style="width:40mm"></div>
  ${letter}
  <div class="thread" style="width:40mm"></div>
  <p style="color:var(--gold);font-family:'Nanum Myeongjo';text-align:center">— 월화</p>
</section>` +
    front.slice(j);

  const v = VERDICT[P.verdict];
  const rf = P.read_first
    .map((r) => `<tr><td>${esc(r.where)}</td><td><b>${esc(r.title)}</b><br>${esc(r.why)}</td></tr>`)
    .join("");
  const ca = P.cautions.map((c) => `<li>${esc(c)}</li>`).join("");
  const now = `<section class="brk">
  <span class="kicker">${N} 님의 지금</span>
  <h2 class="ch">이 책을 펼치기 전에</h2>
  <div class="box"><span class="kicker">월화가 읽은 ${N} 님의 상황</span><p>${esc(P.summary)}</p></div>
  <h3>지금의 판정</h3>
  <p><span class="verdict ${v.cls}">${v.label}</span> <b>${esc(untilText)}</b></p>
  <p>${esc(P.why_verdict)}</p>
  <h3>가장 먼저 읽을 세 장</h3>
  <table class="cmp">${rf}</table>
  <h3>그때까지 꼭 피할 것</h3>
  <ul class="dots no">${ca}</ul>
  <p class="note">이 판정은 ${N} 님이 들려준 이야기를 바탕으로 한 안내이며, 재회를 보장하지 않아요. 상황이 바뀌면(연락이 왔거나, 차단되었거나) PART 03에서 바뀐 상황의 장을 다시 확인해 주세요.</p>
</section>
`;

  /* ---------- PART 03: 내 상황 표시 ---------- */
  let p2 = BOOK_FRAGMENTS.p2;
  for (const k of P.situation_keys) {
    const re = new RegExp(`<h2 class="ch brk">${k}\\. [^<]*</h2>`);
    const m = p2.match(re);
    if (!m || m.index === undefined) continue;
    const end = m.index + m[0].length;
    p2 =
      p2.slice(0, end) +
      `\n  <div class="mine"><span class="tag">${N} 님의 상황이에요</span><p>${esc(P.situation_note)}</p></div>` +
      p2.slice(end);
  }

  /* ---------- PART 05: 메시지 초안 ---------- */
  let p3 = BOOK_FRAGMENTS.p3;
  const msgs = P.messages.length
    ? P.messages
        .map(
          (x) =>
            `<h4>${esc(x.when)}</h4><div class="msg">${esc(x.text)}</div><div class="msgcap">${esc(x.cap)}</div>`
        )
        .join("")
    : `<p>지금 ${N} 님에게는 보낼 문장보다 지킬 거리가 먼저예요. 이 장의 문장들은 상대가 먼저 문을 열어 온 뒤에만 펼쳐 주세요.</p>`;
  p3 = must(
    p3,
    '<h2 class="ch brk">1. 헤어진 뒤 첫 연락</h2>',
    `<h2 class="ch brk">${N} 님을 위한 메시지 초안</h2>
  <div class="mine"><span class="tag">${N} 님에게 맞춘 문장</span><p>아래 문장은 ${N} 님의 상황에 맞춰 썼어요. 보내는 날은 ${esc(untilText)}의 기다림이 끝나고, ‘연락 전 체크’를 통과한 날이에요.</p></div>
  ${msgs}
  <h2 class="ch brk">1. 헤어진 뒤 첫 연락</h2>`
  );

  /* ---------- PART 08: 7일 날짜 ---------- */
  let p4 = BOOK_FRAGMENTS.p4;
  let dayIdx = 0;
  p4 = p4.replace(/<span class="wk">1주차<\/span>/g, (m0) => {
    const d = kstDay(opts.paidAt, dayIdx);
    dayIdx += 1;
    return dayIdx <= 7 ? `<span class="wk">${sd(d)}</span>` : m0;
  });

  /* ---------- PART 09 날짜 + 마지막 편지 ---------- */
  let p5 = BOOK_FRAGMENTS.p5;
  ["1주차 · 감정 안정", "2주차 · 관계 분석", "3주차 · 행동 결정"].forEach((title, w) => {
    const a = kstDay(opts.paidAt, 7 * w);
    const b = kstDay(opts.paidAt, 7 * w + 6);
    p5 = must(
      p5,
      `<h2 class="ch brk">${title}</h2>`,
      `<h2 class="ch brk">${title}</h2>\n  <p class="datechip">${kd(a)} ~ ${kd(b)}</p>`
    );
  });
  p5 = must(
    p5,
    '<h2 class="ch brk">21일 후, 세 갈래</h2>',
    `<h2 class="ch brk">21일 후, 세 갈래</h2>\n  <p class="datechip">${kd(kstDay(opts.paidAt, 21))}에 펼쳐 주세요</p>`
  );
  const cl = P.closing_letter.map((x) => `<p>${esc(x)}</p>`).join("");
  p5 = must(
    p5,
    '<h2 class="ch">여기까지 온 당신에게</h2>',
    `<h2 class="ch">여기까지 온 ${N} 님에게</h2>\n  ${cl}\n  <div class="thread" style="width:30mm"></div>`
  );
  p5 = p5.replace(
    `  <h4>다음 날 아침, 종이를 다시 읽고 든 생각</h4>
  <div class="lines"><div></div><div></div><div></div></div>`,
    `  <h4>다음 날 아침, 종이를 다시 읽고 든 생각</h4>
  <div class="lines"><div></div><div></div></div>`
  );
  p5 = p5.replace(
    `  <p class="lead">PART 09의 플랜을 따라가며 하루 한 줄씩 남겨요.</p>
  <table class="cmp">`,
    `  <p class="lead">PART 09의 플랜을 따라가며 하루 한 줄씩 남겨요.</p>
  <table class="cmp" style="font-size:7.6pt;line-height:1.5">`
  );

  const back = BOOK_FRAGMENTS.back.replace("THEWOLHA.COM", `${N} 님만을 위한 한 권 · THEWOLHA.COM`);

  const flow = (t: string) => t.replace(/<h2 class="ch brk">/g, '<h2 class="ch flow">');
  return (
    head +
    front +
    now +
    flow(BOOK_FRAGMENTS.p1) +
    flow(p2) +
    flow(p3) +
    flow(p4) +
    p5 +
    back +
    "</body></html>"
  );
}
