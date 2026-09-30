import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import ApologyConsole from "@/components/admin/ApologyConsole";

export const dynamic = "force-dynamic";

/**
 * /admin/apology — 결제 오류 고객 사과 쿠폰 + 안내 메일 (관리자 전용)
 * 9/24~9/28 결제 승인 실패(상점 vwolha95uh 계약 미완료) 주문 목록.
 * 토스 API 로그에서 추출한 주문번호 24건 (중복 시도 제외).
 */
const FAILED_ORDERS = [
  "WH-20260928-HA44E",
  "WH-20260928-3G2GK",
  "WH-20260928-CUPZD",
  "WH-20260927-28WPJ",
  "WH-20260927-9RH7Z",
  "WH-20260927-GS3UE",
  "WH-20260926-9RES9",
  "WH-20260926-K3VVH",
  "WH-20260926-9QTF9",
  "WH-20260926-TQ8UH",
  "WH-20260926-87MKV",
  "WH-20260926-E2EYY",
  "WH-20260926-U6WC9",
  "WH-20260926-5B5YB",
  "WH-20260926-WH23V",
  "WH-20260926-AXCDE",
  "WH-20260925-K7AWU",
  "WH-20260925-E5X4A",
  "WH-20260925-KJ53Q",
  "WH-20260925-D9K8X",
  "WH-20260925-FSUJ2",
  "WH-20260925-RUF5C",
  "WH-20260925-M6WXR",
  "WH-20260924-E76UT",
];

export default async function AdminApologyPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-2xl px-6 py-12 text-ivory">
      <h1 className="font-display text-xl font-semibold">결제 오류 사과 쿠폰</h1>
      <p className="mt-2 text-[0.8rem] leading-[1.9] text-ivory-dim">
        9/24~9/28 결제 승인 실패 주문 {FAILED_ORDERS.length}건. 먼저 [대상 확인]으로
        받는 사람을 확인한 뒤 [쿠폰 적용 + 메일 발송]을 누르세요. 같은 사람의
        여러 주문은 메일 1통으로 묶이고, 이미 결제한 주문은 자동 제외됩니다.
      </p>
      <ApologyConsole defaultOrders={FAILED_ORDERS} />
    </main>
  );
}
