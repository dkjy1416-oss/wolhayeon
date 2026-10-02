import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listReviewsForAdmin } from "@/lib/reviews";
import ReviewAdminList from "@/components/admin/ReviewAdminList";

export const dynamic = "force-dynamic";

/** /admin/reviews — 고객 후기 확인 · 공개 승인 */
export default async function AdminReviewsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const list = await listReviewsForAdmin();
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-24 pt-8 text-ivory">
      <h1 className="font-display text-xl font-semibold">고객 후기</h1>
      <p className="mb-6 mt-2 text-[0.74rem] leading-relaxed text-ivory-dim">
        결제한 손님만 남길 수 있어요 (결과 화면 아래와 책 완성 메일의 &lsquo;후기 남기기&rsquo;).
        <br />
        &lsquo;공개&rsquo;를 누른 후기 중 손님이 공개에 동의한 것만 홈·책 소개 페이지에 보여요.
        <br />
        수정은 오타·개인정보(실명, 연락처 등) 가리기처럼 뜻을 바꾸지 않는 범위에서만 해 주세요. 손님 후기의 뜻을 바꾸거나 지어낸 후기를 올리면
        표시·광고법 위반이 될 수 있어요.
      </p>
      {list === null ? (
        <p className="rounded-xl border border-thread/40 bg-thread/5 px-5 py-4 text-sm">
          후기 표를 불러오지 못했어요. Supabase에 REVIEWS.sql 을 아직 실행하지 않았다면 먼저 실행해 주세요.
        </p>
      ) : (
        <ReviewAdminList initial={list} />
      )}
    </main>
  );
}
