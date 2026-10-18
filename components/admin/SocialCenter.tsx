"use client";

/** SNS 업로드 센터: 영상 하나 → 캡션 자동 작성 → 인스타·페이스북·스레드·유튜브·틱톡 동시 게시/예약 */
import { useCallback, useEffect, useState } from "react";

type Channel = "instagram" | "facebook" | "threads" | "youtube" | "tiktok";
type ChannelState = { status: string; url?: string; error?: string };
type Captions = {
  instagram: { caption: string; first_comment: string };
  facebook: { caption: string };
  threads: { text: string };
  youtube: { title: string; description: string };
  tiktok: { caption: string };
};
type Post = { id: string; createdAt: string; memo: string; videoUrl: string; scheduledAt: string; channels: Partial<Record<Channel, ChannelState>>; captions: Captions };
type Conn = { name: string; ig?: string | null } | null;
type Data = { posts: Post[]; connections: Record<string, Conn>; envMissing: Record<string, string[]>; tiktokMode: string };

const CH: [Channel, string][] = [
  ["instagram", "인스타그램"],
  ["facebook", "페이스북"],
  ["threads", "스레드"],
  ["youtube", "유튜브"],
  ["tiktok", "틱톡"],
];
const PROVIDER_LABEL: [string, string, string][] = [
  ["meta", "페이스북 페이지 + 인스타그램", "월하연 페이지와 거기 연결된 인스타로 올려요"],
  ["threads", "스레드", ""],
  ["google", "유튜브", ""],
  ["tiktok", "틱톡", ""],
];
const STATUS: Record<string, string> = { waiting: "대기", processing: "처리 중", done: "완료", error: "실패", skipped: "안 올림" };

const box = "rounded-xl border border-gold-dim/25 bg-ink-soft px-5 py-4";
const btn = "rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold disabled:opacity-50";
const input = "mt-1 w-full rounded-lg border border-gold-dim/30 bg-ink px-3 py-2 text-sm text-ivory";

function kstLocal(d: Date) {
  const k = new Date(d.getTime() + 9 * 3600_000);
  return k.toISOString().slice(0, 16);
}
function fromKstLocal(v: string) {
  return new Date(new Date(v + ":00Z").getTime() - 9 * 3600_000).toISOString();
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SocialCenter({ notice }: { notice?: { connected?: string; error?: string } }) {
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/social", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-6">
      {notice?.connected && <p className="rounded-lg bg-gold/10 px-4 py-2 text-sm text-gold">연결됨: {notice.connected}</p>}
      {notice?.error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-300">연결 오류: {notice.error}</p>}
      <Uploader onDone={load} connections={data?.connections} />
      <Connections data={data} onChange={load} />
      <PostList posts={data?.posts ?? []} onChange={load} />
    </div>
  );
}

function Uploader({ onDone, connections }: { onDone: () => void; connections?: Record<string, Conn> }) {
  const [file, setFile] = useState<File | null>(null);
  const [memo, setMemo] = useState("");
  const [mode, setMode] = useState<"now" | "later">("later");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 60 * 60_000);
    d.setMinutes(0, 0, 0);
    return kstLocal(d);
  });
  const [chans, setChans] = useState<Channel[]>(CH.map((c) => c[0]));
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const connected = (c: Channel) => {
    const k = c === "instagram" || c === "facebook" ? "meta" : c === "youtube" ? "google" : c;
    if (c === "instagram") return !!connections?.meta?.ig;
    return !!connections?.[k];
  };

  async function submit() {
    if (!file || !memo.trim()) return setMsg("영상과 내용 메모를 넣어 주세요");
    setMsg("");
    try {
      setBusy("영상 올리는 중…");
      const u = await (await fetch("/api/admin/social/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size }) })).json();
      if (!u.ok) throw new Error(u.error);
      const put = await fetch(u.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4", "x-upsert": "true" }, body: file });
      if (!put.ok) throw new Error("영상 업로드 실패 (" + put.status + ")");
      setBusy("월화 AI가 채널별 캡션 쓰는 중…");
      const r = await (
        await fetch("/api/admin/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoPath: u.path, videoBytes: file.size, memo, channels: chans, publishNow: mode === "now", scheduledAt: mode === "later" ? fromKstLocal(when) : undefined }),
        })
      ).json();
      if (!r.ok) throw new Error(r.error);
      setMsg(mode === "now" ? "올리기 시작했어요. 아래 목록에서 진행 상황이 보여요." : `${fmt(r.post.scheduledAt)}에 올라가도록 예약했어요. 캡션은 아래에서 고칠 수 있어요.`);
      setFile(null);
      setMemo("");
      onDone();
    } catch (e) {
      setMsg("실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={box}>
      <h2 className="text-base font-semibold text-gold">영상 하나로 5개 채널 올리기</h2>
      <p className="mt-1 text-[0.74rem] text-ivory-dim">영상과 한 줄 메모만 넣으면 채널마다 캡션·투표 질문·추적 링크를 따로 만들어 올려요.</p>
      <label className="mt-4 block text-[0.78rem] text-ivory-dim">
        영상 (세로 9:16 mp4)
        <input type="file" accept="video/*" className={input} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <label className="mt-3 block text-[0.78rem] text-ivory-dim">
        영상 내용 메모 (제목이나 줄거리 한두 줄)
        <textarea className={input + " min-h-[70px]"} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 헤어지고 차단했는데 배달기사가 전남친. 문 열까 말까 고민하는 장면" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {CH.map(([c, label]) => (
          <label key={c} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${chans.includes(c) ? "border-gold/60 text-gold" : "border-gold-dim/30 text-ivory-dim"}`}>
            <input type="checkbox" checked={chans.includes(c)} onChange={(e) => setChans(e.target.checked ? [...chans, c] : chans.filter((x) => x !== c))} />
            {label}
            {!connected(c) && <span className="text-[0.65rem] text-red-300">미연결</span>}
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ivory-dim">
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "later"} onChange={() => setMode("later")} /> 예약
        </label>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={mode !== "later"} className="rounded border border-gold-dim/30 bg-ink px-2 py-1 text-ivory" />
        <label className="flex items-center gap-1">
          <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} /> 지금 바로
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className={btn} disabled={!!busy} onClick={submit}>
          {busy || "올리기"}
        </button>
        {msg && <span className="text-[0.75rem] text-ivory-dim">{msg}</span>}
      </div>
    </section>
  );
}

function Connections({ data, onChange }: { data: Data | null; onChange: () => void }) {
  return (
    <section className={box}>
      <h2 className="text-base font-semibold text-gold">채널 연결</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {PROVIDER_LABEL.map(([p, label, hint]) => {
          const c = data?.connections?.[p];
          const miss = data?.envMissing?.[p] ?? [];
          return (
            <li key={p} className="flex flex-wrap items-center gap-2">
              <span className="w-44 shrink-0 text-ivory">{label}</span>
              {c ? (
                <span className="text-gold">
                  ✓ {c.name}
                  {p === "meta" && (c.ig ? ` + @${c.ig}` : " (인스타 미연결 — 페이지에 인스타 연결 후 다시 연결)")}
                </span>
              ) : miss.length ? (
                <span className="text-[0.72rem] text-red-300">Vercel 환경변수 필요: {miss.join(", ")}</span>
              ) : (
                <span className="text-ivory-dim">미연결</span>
              )}
              {!miss.length && (
                <a href={`/api/admin/social/connect/${p}`} className={btn}>
                  {c ? "다시 연결" : "연결"}
                </a>
              )}
              {c && (
                <button
                  className="text-[0.7rem] text-ivory-dim underline"
                  onClick={async () => {
                    await fetch(`/api/admin/social/connect/${p}`, { method: "DELETE" });
                    onChange();
                  }}
                >
                  해제
                </button>
              )}
              {hint && <span className="w-full pl-44 text-[0.68rem] text-ivory-dim">{hint}</span>}
            </li>
          );
        })}
      </ul>
      {data?.tiktokMode !== "direct" && <p className="mt-3 text-[0.7rem] text-ivory-dim">틱톡은 앱 임시저장함으로 보내요. 앱에서 인기 음악을 붙여 게시하면 조회수에 유리해요.</p>}
    </section>
  );
}

function PostList({ posts, onChange }: { posts: Post[]; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!posts.length) return <p className="text-sm text-ivory-dim">아직 올린 영상이 없어요.</p>;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gold">올린 영상</h2>
        <button
          className={btn}
          onClick={async () => {
            await fetch("/api/admin/social/run", { method: "POST" });
            onChange();
          }}
        >
          지금 진행 확인
        </button>
      </div>
      {posts.map((p) => (
        <div key={p.id} className={box}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-ivory">{p.memo.split("\n")[0].slice(0, 60)}</p>
            <span className="text-[0.7rem] text-ivory-dim">
              {p.id} · {new Date(p.scheduledAt) > new Date() ? `${fmt(p.scheduledAt)} 예약` : fmt(p.scheduledAt)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(p.channels) as Channel[]).map((c) => {
              const s = p.channels[c]!;
              return (
                <span key={c} title={s.error} className={`rounded-full px-2.5 py-1 text-[0.7rem] ${s.status === "done" ? "bg-gold/15 text-gold" : s.status === "error" ? "bg-red-500/15 text-red-300" : "bg-ivory/5 text-ivory-dim"}`}>
                  {CH.find((x) => x[0] === c)?.[1]} · {STATUS[s.status] ?? s.status}
                  {s.url?.startsWith("http") && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="ml-1 underline">
                      보기
                    </a>
                  )}
                  {s.status === "error" && (
                    <button
                      className="ml-1 underline"
                      onClick={async () => {
                        await fetch(`/api/admin/social/post/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ retry: c }) });
                        onChange();
                      }}
                    >
                      다시
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          {Object.values(p.channels).some((s) => s?.error) && (
            <p className="mt-2 text-[0.68rem] text-red-300/80">
              {Object.entries(p.channels)
                .filter(([, s]) => s?.error)
                .map(([c, s]) => `${c}: ${s!.error}`)
                .join(" / ")}
            </p>
          )}
          <button className="mt-2 text-[0.72rem] text-gold underline" onClick={() => setOpen(open === p.id ? null : p.id)}>
            {open === p.id ? "캡션 닫기" : "캡션 보기·고치기"}
          </button>
          {open === p.id && <CaptionEditor post={p} onSaved={onChange} />}
        </div>
      ))}
    </section>
  );
}

function CaptionEditor({ post, onSaved }: { post: Post; onSaved: () => void }) {
  const [c, setC] = useState<Captions>(post.captions);
  const [saved, setSaved] = useState("");
  const area = (label: string, value: string, set: (v: string) => void, rows = 4) => (
    <label className="block text-[0.72rem] text-ivory-dim">
      {label}
      <textarea className={input} rows={rows} value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );
  return (
    <div className="mt-3 space-y-2">
      {area("인스타 캡션", c.instagram.caption, (v) => setC({ ...c, instagram: { ...c.instagram, caption: v } }), 6)}
      {area("인스타 첫 댓글 (투표 선택지)", c.instagram.first_comment, (v) => setC({ ...c, instagram: { ...c.instagram, first_comment: v } }), 2)}
      {area("페이스북 (링크는 자동으로 붙어요)", c.facebook.caption, (v) => setC({ ...c, facebook: { caption: v } }))}
      {area("스레드 (링크 자동)", c.threads.text, (v) => setC({ ...c, threads: { text: v } }))}
      {area("유튜브 제목", c.youtube.title, (v) => setC({ ...c, youtube: { ...c.youtube, title: v } }), 1)}
      {area("유튜브 설명 (링크 자동)", c.youtube.description, (v) => setC({ ...c, youtube: { ...c.youtube, description: v } }), 3)}
      {area("틱톡", c.tiktok.caption, (v) => setC({ ...c, tiktok: { caption: v } }), 3)}
      <div className="flex items-center gap-3">
        <button
          className={btn}
          onClick={async () => {
            const r = await fetch(`/api/admin/social/post/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ captions: c }) });
            setSaved(r.ok ? "저장됨" : "저장 실패");
            onSaved();
          }}
        >
          캡션 저장
        </button>
        <button
          className="text-[0.72rem] text-red-300 underline"
          onClick={async () => {
            if (!window.confirm("이 영상 기록과 업로드 파일을 지울까요? (이미 올라간 SNS 게시물은 그대로예요)")) return;
            await fetch(`/api/admin/social/post/${post.id}`, { method: "DELETE" });
            onSaved();
          }}
        >
          기록 삭제
        </button>
        {saved && <span className="text-[0.72rem] text-ivory-dim">{saved}</span>}
      </div>
    </div>
  );
}
