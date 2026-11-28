"use client";

/**
 * 대화 내보내기 파일 → 휴대폰 안에서 숫자 분석(무료, 서버 전송 없음) → 미리보기
 */
import { useState } from "react";
import TempChart from "@/components/chat/TempChart";
import InView from "@/components/fx/InView";
import SplitWords from "@/components/fx/SplitWords";
import CountUp from "@/components/fx/CountUp";
import { parseChatExport, participants, analyzeChat, type Msg, type ChatStats } from "@/lib/chat/kakao-parse";
import { listZip, readZipText, zipSupported, type ZipEntry } from "@/lib/chat/zip-read";

const GUIDE: [string, string[]][] = [
  ["안드로이드 카톡", ["대화방 오른쪽 위 ≡ 메뉴", "오른쪽 아래 톱니바퀴(채팅방 설정)", "대화 내용 내보내기 → 텍스트만 보내기", "'내 파일에 저장' 또는 '파일' 앱에 저장"]],
  ["아이폰 카톡", ["대화방 오른쪽 위 ≡ 메뉴", "오른쪽 아래 톱니바퀴(채팅방 설정)", "대화 내보내기 → 텍스트 메시지만 보내기", "'파일에 저장' 선택"]],
  ["PC 카톡", ["대화방 오른쪽 위 ≡ 메뉴", "대화 내용 → 대화 내보내기", ".txt 파일로 저장"]],
  ["인스타그램 DM", ["설정 → 계정 센터 → 내 정보 및 권한", "내 정보 다운로드 → 정보 일부 → 메시지만 선택", "형식 JSON · 미디어 화질 낮음으로 요청", "메일로 온 .zip 파일을 그대로 올리기 (압축 안 풀어도 돼요)"]],
];

interface Room {
  kind: "kakao" | "ig";
  title: string;
  size: number;
  parts: (() => Promise<string>)[];
}

/* 인스타 폴더 이름 "minsu_1234567890" → "minsu" */
function igTitle(dir: string): string {
  const seg = dir.replace(/\/$/, "").split("/").pop() ?? "";
  return seg.replace(/_\d{6,}$/, "") || "인스타그램 DM";
}

/* 인스타 message_1.json, message_2.json … 을 한 대화로 합치기 */
function mergeIg(texts: string[]): Msg[] {
  const all: unknown[] = [];
  for (const t of texts) {
    try {
      const j = JSON.parse(t) as { messages?: unknown[] };
      if (Array.isArray(j.messages)) all.push(...j.messages);
    } catch {
      /* 깨진 조각은 건너뜀 */
    }
  }
  return parseChatExport(JSON.stringify({ messages: all }));
}

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
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [reading, setReading] = useState(false);

  const applyMsgs = (m: Msg[]) => {
    const p = participants(m);
    if (m.length < 10 || p.length < 2) {
      setErr("대화를 읽지 못했어요. 카톡 '대화 내보내기' 파일이나 인스타그램 DM(.zip)인지 확인해 주세요.");
      return false;
    }
    setRooms(null);
    setMsgs(m);
    setPeople(p.slice(0, 6));
    return true;
  };

  const openRoom = async (r: Room) => {
    setErr(null);
    setReading(true);
    try {
      const texts = await Promise.all(r.parts.map((x) => x()));
      applyMsgs(r.kind === "ig" ? mergeIg(texts) : parseChatExport(texts[0]));
    } catch {
      setErr("파일을 여는 중에 문제가 생겼어요. 압축을 풀어 대화 파일만 올려 주세요.");
    } finally {
      setReading(false);
    }
  };

  /* 11/28: 여러 파일 · .zip(카톡 내보내기, 인스타 내 정보 다운로드) 지원 — 모두 휴대폰 안에서만 */
  const onFiles = async (list: FileList | null) => {
    setErr(null);
    const files = list ? Array.from(list) : [];
    if (!files.length) return;
    setReading(true);
    try {
      const found: Room[] = [];
      const igDirs = new Map<string, Room>();
      for (const f of files) {
        if (/\.zip$/i.test(f.name) || f.type.includes("zip")) {
          if (!zipSupported()) throw new Error("이 브라우저는 압축 파일을 열 수 없어요. 압축을 풀어 안의 대화 파일을 올려 주세요.");
          let ents: ZipEntry[];
          try {
            ents = await listZip(f);
          } catch {
            throw new Error("압축 파일을 열지 못했어요. 압축을 풀어 안의 대화 파일을 올려 주세요.");
          }
          for (const e of ents) {
            const base = e.name.split("/").pop() ?? e.name;
            if (base.startsWith(".") || e.name.includes("__MACOSX")) continue;
            if (/^message_\d+\.json$/i.test(base)) {
              const dir = e.name.slice(0, e.name.length - base.length);
              const room = igDirs.get(dir) ?? { kind: "ig" as const, title: igTitle(dir), size: 0, parts: [] };
              room.parts.push(() => readZipText(f, e));
              room.size += e.usize;
              igDirs.set(dir, room);
            } else if (/\.(txt|csv)$/i.test(base) && e.usize > 200 && e.usize < 60 * 1024 * 1024) {
              found.push({ kind: "kakao", title: base.replace(/\.(txt|csv)$/i, ""), size: e.usize, parts: [() => readZipText(f, e)] });
            }
          }
        } else {
          if (f.size > 60 * 1024 * 1024) throw new Error("파일이 너무 커요. '텍스트만' 내보내기로 다시 받아 주세요.");
          if (/^message_\d+\.json$/i.test(f.name)) {
            const room = igDirs.get("") ?? { kind: "ig" as const, title: "인스타그램 DM", size: 0, parts: [] };
            room.parts.push(() => f.text());
            room.size += f.size;
            igDirs.set("", room);
          } else {
            found.push({ kind: /\.json$/i.test(f.name) ? "ig" : "kakao", title: f.name, size: f.size, parts: [() => f.text()] });
          }
        }
      }
      found.push(...igDirs.values());
      found.sort((a, b) => b.size - a.size);
      if (!found.length) throw new Error("압축 파일 안에서 대화를 찾지 못했어요. 카톡 내보내기 파일이나 인스타 DM(JSON)인지 확인해 주세요.");
      if (found.length === 1) {
        setReading(false);
        return openRoom(found[0]);
      }
      setRooms(found.slice(0, 40));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "파일을 읽지 못했어요.");
    } finally {
      setReading(false);
    }
  };

  const pickMe = (meName: string) => {
    if (!msgs) return;
    const stats = analyzeChat(msgs, meName);
    if (!stats) return setErr("두 사람의 대화가 10개보다 적어요.");
    onReady({ msgs, meName, partnerName: stats.partnerName, stats });
  };

  const card = "fx-glass rounded-2xl px-5 py-5";
  return (
    <div className="mx-auto max-w-[560px] px-5 pb-24 pt-24">
      <p className="text-[0.74rem] tracking-[0.2em] text-gold">1단계 · 대화 파일 올리기</p>
      <SplitWords key={msgs ? "a" : "b"} as="h2" className="font-display mt-2 block text-[1.6rem] font-bold text-ivory" text={msgs ? "어느 쪽이 나예요?" : "대화 파일을 올려 주세요"} />
      {!msgs ? (
        <>
          <p className="mt-2 text-[0.9rem] leading-[1.8] text-ivory-dim">
            숫자 분석은 <b className="text-ivory">이 휴대폰 안에서만</b> 계산해요. 결제 전에는 대화가 서버로 가지 않아요.
          </p>
          <label className="mt-5 flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#e46b8a]/60 bg-ink-soft text-[1rem] font-semibold text-[#e46b8a]">
            {reading ? "휴대폰 안에서 읽는 중…" : "파일 고르기 (.txt · .zip · 인스타 DM)"}
            <input type="file" multiple accept=".txt,.csv,.json,.zip,text/plain,application/json,application/zip,application/x-zip-compressed" className="hidden" disabled={reading} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
          </label>
          <p className="mt-2 text-center text-[0.76rem] text-ivory-dim">카톡 .txt · 카톡/인스타 .zip 그대로 · 여러 파일 한 번에 가능</p>
          {err && <p className="mt-3 text-[0.86rem] text-thread">{err}</p>}
          {rooms && (
            <div className="mt-5">
              <p className="text-[0.9rem] font-semibold text-ivory">어떤 대화를 분석할까요?</p>
              <p className="mt-1 text-[0.78rem] text-ivory-dim">대화가 많은 순서예요.</p>
              <div className="mt-3 flex flex-col gap-2">
                {rooms.map((r, i) => (
                  <button key={i} type="button" disabled={reading} onClick={() => openRoom(r)} className="flex items-center justify-between rounded-xl border border-gold-dim bg-ink-soft px-4 py-3.5 text-left text-[0.92rem] text-ivory disabled:opacity-50">
                    <span className="truncate">
                      <span className="mr-2 text-[0.72rem] text-gold">{r.kind === "ig" ? "인스타" : "카톡"}</span>
                      {r.title}
                    </span>
                    <span className="shrink-0 text-[0.76rem] text-ivory-dim">{r.size > 1048576 ? `${(r.size / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(r.size / 1024))}KB`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
  const card = "fx-glass rounded-2xl px-5 py-4";
  const num = (v: string | number, cls: string) => {
    const m = typeof v === "number" ? [String(v), String(v), ""] : String(v).match(/^(\d+)(회)?$/);
    return m ? <CountUp value={Number(m[1])} suffix={m[2] ?? ""} className={cls} /> : <span className={cls}>{v}</span>;
  };
  const vs = (k: string, me: string | number, p: string | number, note?: string) => (
    <InView className={`reveal ${card}`}>
      <p className="text-[0.78rem] text-ivory-dim">{k}</p>
      <p className="mt-1 flex items-baseline gap-3 text-ivory">
        <span className="text-[0.82rem]">나 {num(me, "font-display text-[1.5rem] font-bold text-[#e8b04a]")}</span>
        <span className="text-[0.82rem]">{partnerLabel} {num(p, "font-display text-[1.5rem] font-bold text-[#e46b8a]")}</span>
      </p>
      {note && <p className="mt-1 text-[0.78rem] leading-[1.6] text-ivory-dim">{note}</p>}
    </InView>
  );
  const firstShare = Math.round((s.starts.me / Math.max(1, s.starts.me + s.starts.partner)) * 100);
  const d = (t: number) => {
    const x = new Date(t + 9 * 3600 * 1000);
    return `${x.getUTCFullYear()}.${x.getUTCMonth() + 1}.${x.getUTCDate()}`;
  };
  return (
    <div>
      <p className="fx-kicker text-gold">무료 숫자 분석 · 내 휴대폰에서 계산</p>
      <h2 className="font-display mt-3 text-[1.7rem] font-bold leading-snug text-ivory">
        <CountUp value={s.total} className="fx-rose" />개의 대화,
        <br />
        <CountUp value={s.days} className="fx-rose" />일을 읽었어요
      </h2>
      <p className="mt-1 text-[0.82rem] text-ivory-dim">
        {d(s.from)} ~ {d(s.to)}
      </p>
      <InView className={`reveal ${card} mt-5 text-ivory`}>
        <p className="mb-2 text-[0.84rem] font-semibold">주별 대화 온도</p>
        <TempChart weeks={s.weeks} partnerLabel={partnerLabel} />
        <p className="mt-2 text-[0.8rem] leading-[1.6] text-ivory-dim">
          {s.turnWeek ? `${s.turnWeek}에 ${partnerLabel} 쪽 온도가 가장 크게 내려갔어요.` : "주별로 큰 꺾임은 보이지 않아요."} 온도는 메시지 비중·먼저 연락·답장 속도·질문과 감정 표현으로 계산한 상대적인 지표예요. 0은 대화가 없던 주예요.
        </p>
      </InView>
      <div className="mt-3 grid grid-cols-1 gap-3">
        {vs("먼저 말 건 횟수 (6시간 넘게 쉬었다가)", s.starts.me, s.starts.partner, `대화를 여는 쪽의 ${firstShare}%가 나예요.`)}
        {vs("답장 시간 (중앙값)", fmtMin(s.replyMin.me), fmtMin(s.replyMin.partner), s.partnerReplyEarly !== null && s.partnerReplyLate !== null ? `${partnerLabel} 답장: 앞 기간 ${fmtMin(s.partnerReplyEarly)} → 최근 ${fmtMin(s.partnerReplyLate)}` : undefined)}
        {vs("만나자는 말", `${s.meetAsk.me}회`, `${s.meetAsk.partner}회`)}
        {vs("'다음에·언젠가'", `${s.vague.me}회`, `${s.vague.partner}회`)}
        {vs("좋아·보고 싶어 같은 감정 표현", `${s.feelingWords.me}회`, `${s.feelingWords.partner}회`)}
        {vs("대화를 마지막으로 남긴 쪽", `${s.ends.me}회`, `${s.ends.partner}회`)}
      </div>
      {s.lastFrom === "me" && (
        <p className="mt-3 rounded-2xl bg-[#e46b8a]/10 px-5 py-3 text-[0.86rem] leading-[1.7] text-ivory">
          파일의 마지막 메시지는 내가 보냈고, 그 뒤로 {partnerLabel}의 답이 없어요.
        </p>
      )}
    </div>
  );
}
