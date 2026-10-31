/**
 * 카톡 분석 저장소 — Supabase Storage 비공개 버킷 (서버 전용)
 */
import "server-only";
import { randomInt } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CHAT_ORDER_RE, type ChatOrder } from "@/lib/chat/types";

const BUCKET = "chat-private";
let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const sb = getSupabaseAdmin();
  const got = await sb.storage.getBucket(BUCKET);
  if (got.error) {
    await sb.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 5 * 1024 * 1024 });
  }
  bucketReady = true;
}

export function chatOrderNumber(now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const ymd = kst.toISOString().slice(0, 10).replace(/-/g, "");
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += abc[randomInt(abc.length)];
  return `WC-${ymd}-${s}`;
}

export async function saveChatOrder(o: ChatOrder): Promise<boolean> {
  await ensureBucket();
  const r = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .upload(`orders/${o.order_number}.json`, new Blob([JSON.stringify(o)], { type: "application/json" }), {
      upsert: true,
      contentType: "application/json",
      cacheControl: "no-cache",
    });
  return !r.error;
}

export async function getChatOrder(orderNumber: string): Promise<ChatOrder | null> {
  if (!CHAT_ORDER_RE.test(orderNumber)) return null;
  await ensureBucket();
  /* Storage CDN 캐시 때문에 방금 고친 주문이 예전 값으로 읽히는 문제(10/31 실측: 업로드 1장 → 화면 0장) —
     매번 새 서명 주소 + 캐시 무시로 읽는다 */
  const sign = await getSupabaseAdmin().storage.from(BUCKET).createSignedUrl(`orders/${orderNumber}.json`, 60);
  if (sign.error || !sign.data?.signedUrl) return null;
  try {
    const res = await fetch(`${sign.data.signedUrl}&cb=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ChatOrder;
  } catch {
    return null;
  }
}

/** 읽고-고치고-저장 (동시 요청은 드묾 — 결제·생성 단계는 상태값으로 한 번 더 막음) */
export async function updateChatOrder(
  orderNumber: string,
  fn: (o: ChatOrder) => ChatOrder | null
): Promise<ChatOrder | null> {
  const cur = await getChatOrder(orderNumber);
  if (!cur) return null;
  const next = fn(cur);
  if (!next) return cur;
  return (await saveChatOrder(next)) ? next : null;
}

export async function listChatOrders(limit = 300): Promise<ChatOrder[]> {
  await ensureBucket();
  const sb = getSupabaseAdmin();
  const l = await sb.storage.from(BUCKET).list("orders", { limit, sortBy: { column: "created_at", order: "desc" } });
  if (l.error || !l.data) return [];
  const out = await Promise.all(
    l.data
      .filter((f) => f.name.endsWith(".json"))
      .map((f) => getChatOrder(f.name.replace(/\.json$/, "")))
  );
  return out.filter((o): o is ChatOrder => !!o);
}

export async function uploadChatImage(orderNumber: string, idx: number, data: ArrayBuffer, type: string): Promise<boolean> {
  await ensureBucket();
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const r = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .upload(`uploads/${orderNumber}/${String(idx).padStart(2, "0")}.${ext}`, new Blob([data], { type }), {
      upsert: true,
      contentType: type,
    });
  return !r.error;
}

async function listUploads(orderNumber: string): Promise<string[]> {
  await ensureBucket();
  const l = await getSupabaseAdmin().storage.from(BUCKET).list(`uploads/${orderNumber}`, { limit: 50 });
  if (l.error || !l.data) return [];
  return l.data.map((f) => `uploads/${orderNumber}/${f.name}`).sort();
}

export async function listChatImages(orderNumber: string): Promise<string[]> {
  return (await listUploads(orderNumber)).filter((p) => /\.(jpe?g|png|webp)$/.test(p));
}

/** 대화 내보내기 파일에서 만든 대화 원문 (상대 이름은 호칭으로 바뀐 상태) */
export async function saveChatText(orderNumber: string, text: string): Promise<boolean> {
  await ensureBucket();
  const r = await getSupabaseAdmin()
    .storage.from(BUCKET)
    .upload(`uploads/${orderNumber}/chat.txt`, new Blob([text], { type: "text/plain;charset=utf-8" }), { upsert: true, contentType: "text/plain;charset=utf-8", cacheControl: "no-cache" });
  return !r.error;
}

export async function getChatText(orderNumber: string): Promise<string | null> {
  const sign = await getSupabaseAdmin().storage.from(BUCKET).createSignedUrl(`uploads/${orderNumber}/chat.txt`, 60);
  if (sign.error || !sign.data?.signedUrl) return null;
  try {
    const res = await fetch(`${sign.data.signedUrl}&cb=${Date.now()}`, { cache: "no-store" });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

export async function downloadChatImage(path: string): Promise<{ data: string; type: string } | null> {
  const r = await getSupabaseAdmin().storage.from(BUCKET).download(path);
  if (r.error || !r.data) return null;
  const buf = Buffer.from(await r.data.arrayBuffer());
  const type = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { data: buf.toString("base64"), type };
}

export async function deleteChatImages(orderNumber: string): Promise<void> {
  const paths = await listUploads(orderNumber); // 캡처 + 대화 원문 모두
  if (paths.length) await getSupabaseAdmin().storage.from(BUCKET).remove(paths);
}

/** 결제하지 않고 48시간 지난 주문의 캡처 삭제 (주문 생성 때마다 가볍게 정리) */
export async function sweepStaleChatImages(): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    const l = await sb.storage.from(BUCKET).list("uploads", { limit: 100 });
    if (l.error || !l.data) return;
    const cutoff = Date.now() - 48 * 3600 * 1000;
    for (const dir of l.data) {
      const on = dir.name;
      if (!CHAT_ORDER_RE.test(on)) continue;
      const o = await getChatOrder(on);
      const stale = !o || (o.pay_status !== "paid" && new Date(o.created_at).getTime() < cutoff);
      if (stale) await deleteChatImages(on);
    }
  } catch {
    /* 정리 실패는 무시 */
  }
}
