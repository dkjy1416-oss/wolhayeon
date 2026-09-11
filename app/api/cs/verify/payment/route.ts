import { NextResponse } from "next/server";
import {
  loadCsOrderLite,
  verifyCardLast4ForOrder,
} from "@/lib/cs-actions";

export const runtime = "nodejs";

/**
 * 카드 뒷 4자리 본인확인 보조 경로.
 * - 라이트 세션이 선행되어야 한다.
 * - Toss 마스킹 응답에 마지막 4자리가 모두 보일 때만 정확 일치 검증.
 * - 부분일치/결제수단+시각 인증은 허용하지 않는다.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: string;
    token?: string;
    last4?: string;
  } | null;

  const ctx = await loadCsOrderLite(
    body?.orderNumber ?? "",
    body?.token
  );

  if (!ctx) {
    return NextResponse.json(
      { status: "unauthorized" },
      { status: 401 }
    );
  }

  if (!/^\d{4}$/.test(body?.last4 ?? "")) {
    return NextResponse.json({ status: "invalid" });
  }

  try {
    const result = await verifyCardLast4ForOrder(
      ctx.order,
      body!.last4!
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ status: "invalid" });
  }
}
