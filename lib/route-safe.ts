/**
 * API 처리 중 예상 못 한 예외가 나도 손님 화면에 날것의 500 오류 대신
 * 정리된 응답({ status: "server_error" })을 돌려주고 운영 알림을 남긴다.
 */
import "server-only";
import { NextResponse } from "next/server";
import { sendOpsAlert } from "@/lib/ops-alert";

export function safeRoute(
  name: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (e) {
      console.error(`[route:${name}] unhandled ${e instanceof Error ? e.name : "unknown"}`);
      await sendOpsAlert("cs_incident", {
        code: `route_exception_${name}`.slice(0, 60),
        detail: "손님 요청 처리 중 예상 못 한 오류가 났습니다(손님에게는 '잠시 후 다시' 안내가 나갔어요).",
      });
      return NextResponse.json(
        { ok: false, status: "server_error", code: "server_error" },
        { status: 500 }
      );
    }
  };
}
