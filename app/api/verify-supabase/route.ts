/**
 * ─────────────────────────────────────────────────────────────
 *  Supabase 연결/보안 검증 전용 진단 API (임시)
 *
 *  용도: 배포 후 브라우저에서
 *        https://내사이트.vercel.app/api/verify-supabase
 *        를 열어 연결 상태와 RLS 차단 여부를 확인합니다.
 *
 *  - 개인정보, key 값, 데이터 내용은 절대 응답에 포함하지 않고
 *    각 항목의 통과 여부(boolean)만 반환합니다.
 *  - 데이터를 저장하지 않습니다. (anon INSERT 시도는 차단 확인이
 *    목적이며, 만약 차단에 실패해 저장되면 즉시 삭제 후 FAIL 표시)
 *  - 검증이 끝나면 이 파일(app/api/verify-supabase/route.ts)을
 *    삭제해도 서비스에는 아무 영향이 없습니다.
 * ─────────────────────────────────────────────────────────────
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseAdmin,
  sanitizeSupabaseUrl,
  describeSupabaseUrlIssues,
} from "@/lib/supabase/server";
import { EMPTY_APPLICATION } from "@/lib/ritual-types";

export const dynamic = "force-dynamic";

/** 신청폼 23개 필드 + 상태/기본 컬럼 — 이 목록으로 SELECT가 되면 컬럼이 전부 존재 */
const ORDER_COLUMNS = [
  ...Object.keys(EMPTY_APPLICATION),
  "id",
  "order_number",
  "payment_amount",
  "payment_status",
  "generation_status",
  "review_status",
  "delivery_status",
  "created_at",
  "updated_at",
];

const RESULT_COLUMNS = [
  "id",
  "order_id",
  "result_version",
  "generated_content",
  "generated_at",
  "reviewed_at",
  "approved_at",
  "result_token",
  "created_at",
  "updated_at",
];

export async function GET() {
  const report: Record<string, unknown> = {};

  /* 1) 환경변수 존재 여부 (값은 절대 노출하지 않음) */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  report.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey,
    SUPABASE_SERVICE_ROLE_KEY: hasServiceKey,
  };
  if (!url || !anonKey || !hasServiceKey) {
    report.overall = "FAIL — 환경변수 누락. Vercel 등록 후 Redeploy 필요";
    return NextResponse.json(report, { status: 500 });
  }

  /* 1-b) URL 값 자체 진단 — 값은 노출하지 않고 문제 여부만 boolean으로 보고.
     (공백/개행/따옴표/rest_v1 접미사/끝 슬래시는 자동 정리 후 사용) */
  report.url_진단 = describeSupabaseUrlIssues(url);

  /* 2) service_role: 두 테이블 접근 + 전체 컬럼 존재 확인 */
  try {
    const admin = getSupabaseAdmin();

    const ordersSel = await admin
      .from("ritual_orders")
      .select(ORDER_COLUMNS.join(","), { count: "exact", head: false })
      .limit(0);
    const resultsSel = await admin
      .from("ritual_results")
      .select(RESULT_COLUMNS.join(","))
      .limit(0);

    report.service_role = {
      ritual_orders_접근: !ordersSel.error,
      ritual_orders_컬럼_전부_존재: !ordersSel.error,
      ritual_results_접근: !resultsSel.error,
      ritual_results_컬럼_전부_존재: !resultsSel.error,
      오류: ordersSel.error?.message ?? resultsSel.error?.message ?? null,
    };
  } catch (e) {
    report.service_role = {
      접근: false,
      오류: e instanceof Error ? e.message : "unknown",
    };
  }

  /* 3) anon key: SELECT / INSERT / UPDATE 전부 차단되어야 정상 */
  // 서버 클라이언트(lib/supabase/server.ts)와 완전히 동일한 방식으로 URL 정리
  const anon = createClient(
    sanitizeSupabaseUrl(url),
    anonKey.trim().replace(/^["']+|["']+$/g, ""),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const anonSelectOrders = await anon.from("ritual_orders").select("id").limit(1);
  const anonSelectResults = await anon.from("ritual_results").select("id").limit(1);
  const anonUpdate = await anon
    .from("ritual_orders")
    .update({ payment_status: "paid" })
    .eq("id", "00000000-0000-0000-0000-000000000000");
  const anonInsert = await anon
    .from("ritual_orders")
    .insert({
      ...EMPTY_APPLICATION,
      applicant_name: "verify",
      partner_name: "verify",
      relationship_type: "other",
      relationship_type_other: "verify",
      relationship_duration: "under_1m",
      last_conversation: "within_1w",
      contact_status: "unknown",
      partner_new_relationship: "unknown",
      main_wish: "not_sure",
      story: "verify",
      current_emotion: "confused",
      email: "verify@verify.invalid",
    })
    .select("id");

  // 만약 insert가 차단되지 않았다면(치명적) 즉시 삭제
  let insertLeaked = false;
  if (!anonInsert.error && anonInsert.data && anonInsert.data.length > 0) {
    insertLeaked = true;
    try {
      const admin = getSupabaseAdmin();
      await admin
        .from("ritual_orders")
        .delete()
        .eq("id", anonInsert.data[0].id);
    } catch {
      /* 삭제 실패 시에도 아래에서 FAIL로 보고됨 */
    }
  }

  // RLS만 켜져 있으면 SELECT는 '빈 결과(오류 없음)'로 올 수 있음.
  // migration에서 REVOKE까지 했으므로 정상이라면 권한 오류가 나야 하지만,
  // 둘 중 어느 쪽이든 '데이터가 나오지 않으면' 차단으로 판정.
  // PGRST125 등 '경로 오류'는 요청 자체가 실패한 것이므로 차단 성공으로
  // 오판하지 않도록 별도 표시합니다.
  const isPathError = (code?: string) => code === "PGRST125";
  const pathProblem =
    isPathError(anonSelectOrders.error?.code) ||
    isPathError(anonSelectResults.error?.code) ||
    isPathError(anonInsert.error?.code) ||
    isPathError(anonUpdate.error?.code);

  const selectBlocked =
    !pathProblem &&
    (!!anonSelectOrders.error || (anonSelectOrders.data ?? []).length === 0) &&
    (!!anonSelectResults.error || (anonSelectResults.data ?? []).length === 0);

  report.anon_차단 = {
    판정_가능: !pathProblem,
    SELECT_차단: selectBlocked,
    INSERT_차단: !pathProblem && !insertLeaked,
    UPDATE_차단: !pathProblem && !!anonUpdate.error,
    비고: {
      select_오류: anonSelectOrders.error?.code ?? "오류 없음(빈 결과)",
      insert_오류: anonInsert.error?.code ?? (insertLeaked ? "차단 실패!" : ""),
      update_오류: anonUpdate.error?.code ?? "오류 없음",
    },
  };

  /* 종합 */
  const sr = report.service_role as Record<string, unknown>;
  const pass =
    sr["ritual_orders_접근"] === true &&
    sr["ritual_results_접근"] === true &&
    !pathProblem &&
    selectBlocked &&
    !insertLeaked &&
    !!anonUpdate.error;

  report.overall = pass
    ? "PASS — 서버 접근 정상, 브라우저(anon) 접근 전부 차단"
    : "FAIL — 위 항목 중 false를 확인하세요";

  return NextResponse.json(report, { status: pass ? 200 : 500 });
}
