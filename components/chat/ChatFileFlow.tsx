"use client";

/**
 * 대화 내보내기 파일 → 휴대폰 안에서 숫자 분석(무료, 서버 전송 없음) → 미리보기
 */
import { useState } from "react";
import TempChart from "@/components/chat/TempChart";
import { parseChatExport, participants, analyzeChat, type Msg, type ChatStats } from "@/lib/chat/kakao-parse";

const GUIDE: [string, string[]][] = [
  ["안드로이드 카톡", ["대화방 오른쪽 위 ≡ 메뉴", "오른쪽 아래 톱니바퀴(채팅방 설정)", "대화 내용 내보내기 → 텍스트만 보내기", "'내 파일에 저장' 또는 '파일' 앱에 저장"]],
  ["아이폰 카톡", ["대화방 오른쪽 위 ≡ 메뉴", "오른쪽 아래 톱니바퀴(채팅방 설정)", "대화 내보내기 → 텍스트 메시지만 보내기", "'파일에 저장' 선택"]],
  ["PC 카톡", ["대화방 오른쪽 위 ≡ 메뉴", "대화 내용 → 대화 내보내기", ".txt 파일로 저장"]],
  ["인스타그램 DM", ["설정 → 계정 센터 → 내 정보 및 권한", "내 정보 다운로드 → 메시지 선택, 형식 JSON", "받은 파일 안의 message_1.json"]],
];

export interface FileReady {
  msgs: Msg[];
  meName: string;
  partnerName: string;
  stats: ChatStats;
}

function fmtMin(m: number | null): string {
  if (m === null) return "-";
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}시간 ${m % 60 ? `${m % 60}분` : ""}`.trim() : `${Math.round(h / 24)}일`;
}

export default function ChatFileFlow({ onReady, onQuiz }: { onReady: (r: FileReady) => void; onQuiz: () => void }) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [people, setPeople] = useState<{ name: string; count: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>("안드로이드 카톡");

  const onFile = async (f: File | undefined) => {
    setErr(null);
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) return setErr("파일이 너무 커요. '텍스트만' 내보내기로 다시 받아 주세요.");
    if (/\.zip$/i.test(f.name)) return setErr("압축 파일이에요. 압축을 풀어 안의 .txt 파일을 올려 주세요.");
    const text = await f.text();
    const m = parseChatExport(text);
    const p = participants(m);
    if (m.length < 10 || p.length < 2) return setErr("대화를 읽지 못했어요. 카톡 '대화 내보내기'로 받은 .txt 파일인지 확인해 주세요.");
    setMsgs(m);
    setPeople(p.slice(0, 6));
  };

  const pickMe = (meName: string) => {
    if (!msgs) return;
    const stats = analyzeChat(msgs, meName);
    if (!stats) return setErr("두 사람의 대화가 10개보다 적어요.");
    onReady({ msgs, meName, partnerName: stats.partnerName, stats });
  };

  const card = "rounded-2xl border border-gold-dim bg-ink-soft px-5 py-5";
  return (
    <div className="mx-auto max-w-[560px] px-5 pb-24 pt-24">
      <p className="text-[0.74rem] tracking-[0.2em] text-gold">1단계 · 대화 파일 올리기</p>
      <h2 className="font-display mt-2 text-[1.4rem] font-bold text-ivory">{msgs ? "어느 쪽이 나예요?" : "대화 파일을 올려 주세요"}</h2>
      {!msgs ? (
        <>
          <p className="mt-2 text-[0.9rem] leading-[1.8] text-ivory-dim">
            숫자 분석은 <b className="text-ivory">이 휴대폰 안에서만</b> 계산해요. 결제 전에는 대화가 서버로 가지 않아요.
          </p>
          <label className="mt-5 flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-burgundy/60 bg-ink-soft text-[1rem] font-semibold text-burgundy">
            파일 고르기 (.txt · .csv · .json)
            <input type="file" accept=".txt,.csv,.json,text/plain,application/json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {err && <p className="mt-3 text-[0.86rem] text-thread">{err}</p>}
          <div className="mt-6 flex flex-col gap-2">
            <p className="text-[0.82rem] font-semibold text-gold">대화 내보내는 방법</p>
            {GUIDE.map(([k, steps]) => (
              <div key={k} className={card}>
                <button type="button" onClick={() => setOpen(open === k ? null : k)} className="flex w-full justify-between text-left text-[0.92rem] font-semibold text-ivory">
                  {k}
                  <span>{open === k ? "−" : "+"}</span>
                </button>
                {open === k && (
                  <ol className="mt-2 list-decimal pl-5 text-[0.84rem] leading-[1.8] text-ivory-dim">
                    {steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={onQuiz} className="mt-6 block w-full text-center text-[0.84rem] text-ivory-dim underline underline-offset-4">
            파일 내보내기가 어렵다면 — 캡처로 분석하기
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-[0.9rem] text-ivory-dim">
            대화 {msgs.length.toLocaleString()}개를 읽었어요. 내 이름을 골라 주세요. (이름은 서버에 저장하지 않아요)
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            {people.map((p) => (
              <button key={p.name} type="button" onClick={() => pickMe(p.name)} className="flex justify-between rounded-xl border border-gold-dim bg-ink-soft px-4 py-4 text-left text-[0.95rem] text-ivory">
                <span>{p.name}</span>
                <span className="text-[0.8rem] text-ivory-dim">{p.count.toLocaleString()}개</span>
              </button>
            ))}
          </div>
          {err && <p className="mt-3 text-[0.86rem] text-thread">{err}</p>}
          <button type="button" onClick={() => setMsgs(null)} className="mt-5 text-[0.84rem] text-ivory-dim underline underline-offset-4">
            다른 파일 고르기
          </button>
        </>
      )}
    </div>
  );
}

export function StatsPreview({ s, partnerLabel = "그 사람" }: { s: ChatStats; partnerLabel?: string }) {
  const card = "rounded-2xl border border-gold-dim bg-ink-soft px-5 py-4";
  const vs = (k: string, me: string | number, p: string | number, note?: string) => (
    <div className={card}>
      <p className="text-[0.78rem] text-ivory-dim">{k}</p>
      <p className="mt-1 flex items-baseline gap-3 text-ivory">
        <span className="text-[0.82rem]">나 <b className="font-display text-[1.25rem] text-[#c98a1a]">{me}</b></span>
        <span className="text-[0.82rem]">{partnerLabel} <b className="font-display text-[1.25rem] text-burgundy">{p}</b></span>
      </p>
      {note && <p className="mt-1 text-[0.78rem] leading-[1.6] text-ivory-dim">{note}</p>}
    </div>
  );
  const firstShare = Math.round((s.starts.me / Math.max(1, s.starts.me + s.starts.partner)) * 100);
  const d = (t: number) => {
    const x = new Date(t + 9 * 3600 * 1000);
    return `${x.getUTCFullYear()}.${x.getUTCMonth() + 1}.${x.getUTCDate()}`;
  };
  return (
    <div>
      <p className="text-[0.74rem] tracking-[0.2em] text-gold">무료 숫자 분석 · 내 휴대폰에서 계산</p>
      <h2 className="font-display mt-2 text-[1.4rem] font-bold leading-snug text-ivory">
        {s.total.toLocaleString()}개의 대화, {s.days}일을 읽었어요
      </h2>
      <p className="mt-1 text-[0.82rem] text-ivory-dim">
        {d(s.from)} ~ {d(s.to)}
      </p>
      <div className={`${card} mt-5 text-ivory`}>
        <p className="mb-2 text-[0.84rem] font-semibold">주별 대화 온도</p>
        <TempChart weeks={s.weeks} partnerLabel={partnerLabel} />
        <p className="mt-2 text-[0.8rem] leading-[1.6] text-ivory-dim">
          {s.turnWeek ? `${s.turnWeek}에 ${partnerLabel} 쪽 온도가 가장 크게 내려갔어요.` : "주별로 큰 꺾임은 보이지 않아요."} 온도는 메시지 비중·먼저 연락·답장 속도·질문과 감정 표현으로 계산한 상대적인 지표예요. 0은 대화가 없던 주예요.
        </p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3">
        {vs("먼저 말 건 횟수 (6시간 넘게 쉬었다가)", s.starts.me, s.starts.partner, `대화를 여는 쪽의 ${firstShare}%가 나예요.`)}
        {vs("답장 시간 (중앙값)", fmtMin(s.replyMin.me), fmtMin(s.replyMin.partner), s.partnerReplyEarly !== null && s.partnerReplyLate !== null ? `${partnerLabel} 답장: 앞 기간 ${fmtMin(s.partnerReplyEarly)} → 최근 ${fmtMin(s.partnerReplyLate)}` : undefined)}
        {vs("만나자는 말", `${s.meetAsk.me}회`, `${s.meetAsk.partner}회`)}
        {vs("'다음에·언젠가'", `${s.vague.me}회`, `${s.vague.partner}회`)}
        {vs("좋아·보고 싶어 같은 감정 표현", `${s.feelingWords.me}회`, `${s.feelingWords.partner}회`)}
        {vs("대화를 마지막으로 남긴 쪽", `${s.ends.me}회`, `${s.ends.partner}회`)}
      </div>
      {s.lastFrom === "me" && (
        <p className="mt-3 rounded-2xl bg-[#f6e9ec] px-5 py-3 text-[0.86rem] leading-[1.7] text-ivory">
          파일의 마지막 메시지는 내가 보냈고, 그 뒤로 {partnerLabel}의 답이 없어요.
        </p>
      )}
    </div>
  );
}
