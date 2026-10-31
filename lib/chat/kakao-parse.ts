/**
 * 카카오톡 · 인스타그램 대화 내보내기 파일 읽기 + 숫자 분석 (브라우저·서버 공용, API 없음)
 *
 * 지원 형식
 *  - 안드로이드: "2026년 9월 1일 오전 12:41, 김ㅇㅇ : 메시지"
 *  - 아이폰:     "2026. 9. 1. 오전 12:41, 김ㅇㅇ : 메시지"
 *  - PC(윈도우): "--------------- 2026년 9월 1일 월요일 ---------------" + "[김ㅇㅇ] [오전 12:41] 메시지"
 *  - 맥 CSV:     "2026-09-01 00:41:00","김ㅇㅇ","메시지"
 *  - 인스타그램 DM JSON(message_1.json): messages[].sender_name / timestamp_ms / content
 */
export interface Msg {
  t: number; // ms
  who: string;
  text: string;
}

const SYS = /(사진|동영상|이모티콘|파일|삭제된 메시지입니다|님이 들어왔습니다|님이 나갔습니다|보이스톡|페이스톡|송금|Photo|Video|Emoticon)/;

function hm(ampm: string | undefined, h: number, m: number): [number, number] {
  let hh = h;
  if (ampm === "오후" || ampm === "PM") hh = h % 12 + 12;
  else if (ampm === "오전" || ampm === "AM") hh = h % 12;
  return [hh, m];
}

/* 한국 시간 기준으로 시각 만들기 (브라우저 시간대와 무관하게 같은 값) */
function kst(y: number, mo: number, d: number, h: number, mi: number): number {
  return Date.UTC(y, mo - 1, d, h - 9, mi);
}

export function parseChatExport(raw: string): Msg[] {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  /* 인스타그램 JSON */
  if (text.trimStart().startsWith("{")) {
    try {
      const j = JSON.parse(text) as { messages?: { sender_name?: string; timestamp_ms?: number; content?: string }[] };
      const dec = (s: string) => {
        try {
          return decodeURIComponent(escape(s)); // 인스타 JSON의 깨진 한글(latin1) 복원
        } catch {
          return s;
        }
      };
      return (j.messages ?? [])
        .filter((m) => m.sender_name && m.timestamp_ms && m.content)
        .map((m) => ({ t: m.timestamp_ms as number, who: dec(m.sender_name as string), text: dec(m.content as string) }))
        .sort((a, b) => a.t - b.t);
    } catch {
      return [];
    }
  }
  const lines = text.split("\n");
  const out: Msg[] = [];
  let curDate: [number, number, number] | null = null;
  const push = (t: number, who: string, msg: string) => out.push({ t, who: who.trim(), text: msg });
  for (const line of lines) {
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) (\d{1,2}):(\d{2}),? (.+?) : (.*)$/))) {
      const [h, mi] = hm(m[4], +m[5], +m[6]);
      push(kst(+m[1], +m[2], +m[3], h, mi), m[7], m[8]);
    } else if ((m = line.match(/^(\d{4})\. ?(\d{1,2})\. ?(\d{1,2})\.? (오전|오후|AM|PM) (\d{1,2}):(\d{2}),? (.+?) : (.*)$/))) {
      const [h, mi] = hm(m[4], +m[5], +m[6]);
      push(kst(+m[1], +m[2], +m[3], h, mi), m[7], m[8]);
    } else if ((m = line.match(/^-+ (\d{4})년 (\d{1,2})월 (\d{1,2})일 .*-+$/))) {
      curDate = [+m[1], +m[2], +m[3]];
    } else if (curDate && (m = line.match(/^\[(.+?)\] \[(오전|오후) (\d{1,2}):(\d{2})\] (.*)$/))) {
      const [h, mi] = hm(m[2], +m[3], +m[4]);
      push(kst(curDate[0], curDate[1], curDate[2], h, mi), m[1], m[5]);
    } else if ((m = line.match(/^"?(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::\d{2})?"?,"?([^",]+)"?,"?(.*?)"?$/))) {
      push(kst(+m[1], +m[2], +m[3], +m[4], +m[5]), m[6], m[7]);
    } else if (out.length && line.trim() && !/^\d{4}년 \d{1,2}월 \d{1,2}일 [월화수목금토일]요일$/.test(line.trim()) && !/저장한 날짜|님과 카카오톡 대화|Talk_/.test(line)) {
      out[out.length - 1].text += "\n" + line; // 여러 줄 메시지
    }
  }
  return out.filter((x) => x.who && !/^(SYSTEM|시스템)$/.test(x.who));
}

export function participants(msgs: Msg[]): { name: string; count: number }[] {
  const c = new Map<string, number>();
  for (const m of msgs) c.set(m.who, (c.get(m.who) ?? 0) + 1);
  return [...c.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export interface WeekStat {
  label: string; // "8/11주"
  me: number; // 대화 온도 0~100
  partner: number;
  meMsgs: number;
  partnerMsgs: number;
}

export interface ChatStats {
  total: number;
  days: number;
  from: number;
  to: number;
  meName: string;
  partnerName: string;
  msgs: { me: number; partner: number };
  starts: { me: number; partner: number }; // 6시간 넘게 쉬었다가 먼저 말 건 횟수
  ends: { me: number; partner: number }; // 대화를 마지막으로 남긴 쪽
  replyMin: { me: number | null; partner: number | null }; // 답장 시간 중앙값(분)
  partnerReplyEarly: number | null; // 앞 절반 기간 상대 답장 중앙값(분)
  partnerReplyLate: number | null; // 뒤 절반
  avgLen: { me: number; partner: number };
  questions: { me: number; partner: number };
  feelingWords: { me: number; partner: number };
  meetAsk: { me: number; partner: number };
  vague: { me: number; partner: number }; // "다음에·언젠가·나중에"
  nightStarts: { me: number; partner: number }; // 밤 11시~새벽 3시 먼저 연락
  lastFrom: "me" | "partner";
  unansweredHours: number | null; // 마지막이 내 메시지면 그 뒤 지난 시간 (파일 기준 마지막 시각까지가 아니라 지금까지)
  weeks: WeekStat[];
  turnWeek: string | null; // 상대 온도가 가장 크게 떨어진 주
}

const FEEL = /(좋아|보고\s?싶|사랑|그리워|고마워|미안해|설레|ㅠㅠ|❤|♥|💕|😍)/g;
const MEET = /(만나|보자|볼래|갈래|데이트|약속|시간\s?돼|시간\s?되|놀자|먹자)/;
const VAGUE = /(다음에|언젠가|나중에|담에|기회\s?되면)/g;

function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return Math.round(s[Math.floor(s.length / 2)]);
}

export function analyzeChat(msgs: Msg[], meName: string, now = Date.now()): ChatStats | null {
  const people = participants(msgs);
  if (people.length < 2) return null;
  const partnerName = people.find((p) => p.name !== meName)?.name ?? "";
  const two = msgs.filter((m) => m.who === meName || m.who === partnerName);
  if (two.length < 10) return null;
  const isMe = (m: Msg) => m.who === meName;
  const GAP = 6 * 3600 * 1000;
  const s: ChatStats = {
    total: two.length,
    days: Math.max(1, Math.round((two[two.length - 1].t - two[0].t) / 86400000)),
    from: two[0].t,
    to: two[two.length - 1].t,
    meName,
    partnerName,
    msgs: { me: 0, partner: 0 },
    starts: { me: 0, partner: 0 },
    ends: { me: 0, partner: 0 },
    replyMin: { me: null, partner: null },
    partnerReplyEarly: null,
    partnerReplyLate: null,
    avgLen: { me: 0, partner: 0 },
    questions: { me: 0, partner: 0 },
    feelingWords: { me: 0, partner: 0 },
    meetAsk: { me: 0, partner: 0 },
    vague: { me: 0, partner: 0 },
    nightStarts: { me: 0, partner: 0 },
    lastFrom: isMe(two[two.length - 1]) ? "me" : "partner",
    unansweredHours: null,
    weeks: [],
    turnWeek: null,
  };
  const rep: { me: number[]; partner: number[] } = { me: [], partner: [] };
  const repP: { t: number; v: number }[] = [];
  const len = { me: 0, partner: 0 };
  for (let i = 0; i < two.length; i++) {
    const m = two[i];
    const k = isMe(m) ? "me" : "partner";
    const prev = two[i - 1];
    const next = two[i + 1];
    s.msgs[k]++;
    len[k] += m.text.length;
    if (/\?|？/.test(m.text)) s.questions[k]++;
    s.feelingWords[k] += (m.text.match(FEEL) ?? []).length;
    if (MEET.test(m.text) && /\?|？|(자|래|까)(\s|$|[ㅋㅎ~!.])/.test(m.text.trim())) s.meetAsk[k]++;
    s.vague[k] += (m.text.match(VAGUE) ?? []).length;
    const newConv = !prev || m.t - prev.t > GAP;
    if (newConv) {
      s.starts[k]++;
      const h = new Date(m.t + 9 * 3600 * 1000).getUTCHours();
      if (h >= 23 || h < 3) s.nightStarts[k]++;
    }
    if (!next || next.t - m.t > GAP) s.ends[k]++;
    if (prev && prev.who !== m.who && m.t - prev.t <= 24 * 3600 * 1000) {
      const mins = (m.t - prev.t) / 60000;
      rep[k].push(mins);
      if (k === "partner") repP.push({ t: m.t, v: mins });
    }
  }
  s.replyMin = { me: median(rep.me), partner: median(rep.partner) };
  const mid = (s.from + s.to) / 2;
  s.partnerReplyEarly = median(repP.filter((x) => x.t < mid).map((x) => x.v));
  s.partnerReplyLate = median(repP.filter((x) => x.t >= mid).map((x) => x.v));
  s.avgLen = { me: Math.round(len.me / Math.max(1, s.msgs.me)), partner: Math.round(len.partner / Math.max(1, s.msgs.partner)) };
  if (s.lastFrom === "me") s.unansweredHours = Math.round((now - s.to) / 3600000);

  /* 주별 대화 온도: 메시지 비중·먼저 연락·답장 속도·질문/감정 표현을 섞은 상대 지표 (점수 아님) */
  const WEEK = 7 * 86400000;
  const start = s.from - ((new Date(s.from + 9 * 3600 * 1000).getUTCDay() + 6) % 7) * 86400000;
  const nW = Math.min(12, Math.ceil((s.to - start + 1) / WEEK));
  const firstW = Math.max(0, Math.ceil((s.to - start + 1) / WEEK) - nW);
  for (let w = firstW; w < firstW + nW; w++) {
    const a = start + w * WEEK;
    const b = a + WEEK;
    const ms = two.filter((m) => m.t >= a && m.t < b);
    const d = new Date(a + 9 * 3600 * 1000);
    const one = (who: "me" | "partner") => {
      const mine = ms.filter((m) => (who === "me") === isMe(m));
      const share = ms.length ? mine.length / ms.length : 0;
      const qs = mine.filter((m) => /\?|？/.test(m.text)).length;
      const fe = mine.reduce((n, m) => n + (m.text.match(FEEL) ?? []).length, 0);
      const st = ms.filter((m, i) => (who === "me") === isMe(m) && (i === 0 || m.t - ms[i - 1].t > GAP)).length;
      const r: number[] = [];
      ms.forEach((m, i) => {
        if (i && (who === "me") === isMe(m) && ms[i - 1].who !== m.who && m.t - ms[i - 1].t < 86400000) r.push((m.t - ms[i - 1].t) / 60000);
      });
      const rm = median(r);
      const speed = rm === null ? 0.3 : Math.max(0, 1 - Math.log10(1 + rm) / 3);
      const v = 100 * (0.35 * Math.min(1, share * 2) + 0.25 * speed + 0.2 * Math.min(1, (qs + fe) / Math.max(4, mine.length) * 2) + 0.2 * Math.min(1, st / 3));
      return mine.length ? Math.round(Math.min(98, Math.max(5, v))) : 0;
    };
    s.weeks.push({ label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}주`, me: one("me"), partner: one("partner"), meMsgs: ms.filter(isMe).length, partnerMsgs: ms.filter((m) => !isMe(m)).length });
  }
  let drop = 0;
  for (let i = 1; i < s.weeks.length; i++) {
    const dd = s.weeks[i - 1].partner - s.weeks[i].partner;
    if (dd > drop && dd >= 10 && s.weeks[i - 1].partnerMsgs > 0 && s.weeks[i].meMsgs + s.weeks[i].partnerMsgs > 0) {
      drop = dd;
      s.turnWeek = s.weeks[i].label;
    }
  }
  return s;
}

/** AI에 보낼 대화 원문 (최근 위주, 최대 글자 수 제한) — 상대 실명은 호칭으로 바꿈 */
export function transcript(msgs: Msg[], meName: string, partnerName: string, partnerLabel: string, maxChars = 45000): string {
  const two = msgs.filter((m) => m.who === meName || m.who === partnerName);
  const lines = two.map((m) => {
    const d = new Date(m.t + 9 * 3600 * 1000);
    const ts = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    const t = SYS.test(m.text) && m.text.length < 12 ? `(${m.text})` : m.text.replace(/\n/g, " ").slice(0, 300);
    return `${ts} ${m.who === meName ? "나" : partnerLabel}: ${t}`;
  });
  let out: string[] = [];
  let n = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    n += lines[i].length + 1;
    if (n > maxChars) break;
    out.push(lines[i]);
  }
  out = out.reverse();
  return out.join("\n");
}
