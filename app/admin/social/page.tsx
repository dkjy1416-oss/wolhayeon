import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import SocialCenter from "@/components/admin/SocialCenter";

export const dynamic = "force-dynamic";

/** /admin/social — 영상 하나를 인스타·페이스북·스레드·유튜브·틱톡에 한 번에 올리기 */
export default async function AdminSocialPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-5xl px-5 pb-24 pt-8 text-ivory">
      <h1 className="font-display text-xl font-semibold">SNS 업로드</h1>
      <p className="mb-6 mt-2 text-[0.74rem] text-ivory-dim">
        영상 하나를 올리면 채널마다 캡션·투표 질문·추적 링크를 따로 만들어 동시에 올리거나 예약해요. 채널별 유입은 마케팅 화면에서 utm_content(게시물 번호)로 볼 수 있어요.
      </p>
      <SocialCenter notice={{ connected: sp.connected, error: sp.error }} />
    </main>
  );
}
