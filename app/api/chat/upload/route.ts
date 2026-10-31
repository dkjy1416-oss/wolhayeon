/**
 * POST /api/chat/upload — 캡처 1장 업로드 (multipart: order, t, file)
 * 결제 전 주문에만, 최대 10장. 브라우저에서 1280px JPEG로 줄여서 보냄.
 * DELETE ?order=&t= — 올린 캡처 전부 지우기(다시 고르기)
 */
import { NextResponse } from "next/server";
import { verifyChatToken } from "@/lib/chat/auth";
import { getChatOrder, updateChatOrder, uploadChatImage, deleteChatImages, listChatImages } from "@/lib/chat/store";
import { CHAT_MAX_IMAGES } from "@/lib/chat/types";

export const dynamic = "force-dynamic";
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const fd = await request.formData().catch(() => null);
  if (!fd) return NextResponse.json({ ok: false }, { status: 400 });
  const order = String(fd.get("order") ?? "");
  if (!verifyChatToken("order", order, fd.get("t"))) return NextResponse.json({ ok: false }, { status: 401 });
  const file = fd.get("file");
  if (!(file instanceof Blob) || !TYPES.has(file.type) || file.size > 4 * 1024 * 1024)
    return NextResponse.json({ ok: false, message: "이미지 파일(4MB 이하)만 올릴 수 있어요." }, { status: 400 });
  const o = await getChatOrder(order);
  if (!o || o.pay_status !== "pending") return NextResponse.json({ ok: false, message: "이미 결제된 주문이에요." }, { status: 409 });
  /* 실제 저장된 파일 수 기준 (주문 JSON 값만 믿지 않음) */
  const existing = (await listChatImages(order)).length;
  if (existing >= CHAT_MAX_IMAGES)
    return NextResponse.json({ ok: false, message: `캡처는 최대 ${CHAT_MAX_IMAGES}장까지예요.` }, { status: 400 });
  const idx = existing + 1;
  if (!(await uploadChatImage(order, idx, await file.arrayBuffer(), file.type)))
    return NextResponse.json({ ok: false, message: "업로드에 실패했어요. 다시 시도해 주세요." }, { status: 500 });
  const saved = await updateChatOrder(order, (cur) => ({ ...cur, image_count: idx }));
  return NextResponse.json({ ok: true, count: saved?.image_count ?? idx });
}

export async function DELETE(request: Request) {
  const u = new URL(request.url);
  const order = u.searchParams.get("order") ?? "";
  if (!verifyChatToken("order", order, u.searchParams.get("t"))) return NextResponse.json({ ok: false }, { status: 401 });
  const o = await getChatOrder(order);
  if (!o || o.pay_status !== "pending") return NextResponse.json({ ok: false }, { status: 409 });
  await deleteChatImages(order);
  await updateChatOrder(order, (cur) => ({ ...cur, image_count: 0 }));
  return NextResponse.json({ ok: true, count: 0 });
}
