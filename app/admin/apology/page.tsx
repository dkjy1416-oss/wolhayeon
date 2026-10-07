import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /admin/apology — 결제 오류 고객 사과 쿠폰(9/24~9/28)은 10/4에 마감되어 관리자 메뉴에서 뺐다 (10/7).
 * 주소로 직접 들어와도 대시보드로 보낸다. 책 쿠폰(26,000원) 주문은 10/11까지 결제 화면에서 그대로 적용된다.
 */
export default function AdminApologyPage() {
  redirect("/admin");
}
