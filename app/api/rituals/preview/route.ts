/**
 * POST /api/rituals/preview — 결제 전 즉시 개인화 미리보기 조회/생성
 * body: { orderNumber, submissionId } — 신청 세션(submission_id)이
 * 일치하는 본인만 접근 가능. 응답에는 미리보기 JSON만 담고
 * 사연 원문·이메일·전체 결과는 포함하지 않음.
 */
import { NextResponse } from "next/server";
import { getOrCreatePreview } from "@/lib/ritual-preview";
import { verifyPreviewToken } from "@/lib/preview-auth";
import { verifyContinueToken } from "@/lib/cs-auth";

export const dynamic = "force-dynamic";
/* AI 미리보기 타임아웃(40초) + 응답 여유. Vercel 함수 실행 한도. */
export const maxDuration = 60;

const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const orderNumber = b.orderNumber;
  const submissionId = b.submissionId;
  const previewToken = b.previewToken;
  const continueToken = b.continueToken;

  if (
    typeof orderNumber !== "string" ||
    !ORDER_NUMBER_RE.test(orderNumber)
  ) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const normalizedSubmissionId =
    typeof submissionId === "string" && UUID_RE.test(submissionId)
      ? submissionId.toLowerCase()
      : null;
  const tokenAuthorized = verifyPreviewToken(orderNumber, previewToken);
  const continueAuthorized =
    typeof continueToken === "string" &&
    continueToken.length <= 160 &&
    verifyContinueToken(orderNumber, continueToken);

  if (!normalizedSubmissionId && !tokenAuthorized && !continueAuthorized) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const result = await getOrCreatePreview(
    orderNumber,
    normalizedSubmissionId,
    tokenAuthorized,
    continueAuthorized
  );

  switch (result.status) {
    case "ready":
      return NextResponse.json({
        ok: true,
        status: "ready",
        preview: result.preview,
        applicantName: result.applicantName,
        /* false = 템플릿 폴백 — 클라이언트가 읽는 화면을 유지하고
           한 번 더 AI 생성을 시도할 수 있게 알려준다 */
        generated: result.generated,
      });
    case "not_found":
      return NextResponse.json(
        { ok: false, status: "not_found", error: "not_found" },
        { status: 404 }
      );
    case "server_error":
      return NextResponse.json(
        { ok: false, status: "server_error", error: "server_error" },
        { status: 500 }
      );
  }
}
