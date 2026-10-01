import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyReviewToken } from "@/lib/review-auth";
import ReviewForm from "@/components/review/ReviewForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "후기 남기기 | 월하연 月下緣",
  robots: { index: false, follow: false },
};

const ORDER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-md px-6 pb-20 pt-14 text-ivory">
      <p className="text-xs tracking-[0.35em] text-gold/90">月下緣</p>
      {children}
    </main>
  );
}

function Invalid() {
  return (
    <Shell>
      <p className="font-display mt-6 text-[1.1rem] leading-[1.8]">후기 링크를 확인할 수 없어요.</p>
      <p className="mt-3 text-[0.84rem] font-light leading-[1.95] text-ivory-dim">
        결과나 책을 받은 메일·화면의 &lsquo;후기 남기기&rsquo; 링크로 다시 들어와 주세요.
      </p>
      <Link href="/" className="mt-8 inline-block text-[0.8rem] text-gold underline underline-offset-4">
        월하연으로 가기
      </Link>
    </Shell>
  );
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string; t?: string }>;
}) {
  const { o, t } = await searchParams;
  if (typeof o !== "string" || !ORDER_RE.test(o) || typeof t !== "string" || !verifyReviewToken(o, t)) {
    return <Invalid />;
  }

  let name = "";
  let initial: { rating: number; body: string; name: string; consent: boolean } | null = null;
  let locked = false;
  try {
    const supabase = getSupabaseAdmin();
    const ord = await supabase
      .from("ritual_orders")
      .select("applicant_name, payment_status")
      .eq("order_number", o)
      .maybeSingle();
    if (ord.error || !ord.data || ord.data.payment_status !== "paid") return <Invalid />;
    name = (ord.data.applicant_name as string | null)?.trim() ?? "";
    const prev = await supabase
      .from("reviews")
      .select("rating, body, display_name, consent_public, status")
      .eq("order_number", o)
      .maybeSingle();
    if (prev.data) {
      if (prev.data.status !== "pending") locked = true;
      initial = {
        rating: prev.data.rating as number,
        body: prev.data.body as string,
        name: (prev.data.display_name as string | null) ?? "",
        consent: prev.data.consent_public as boolean,
      };
    }
  } catch {
    return <Invalid />;
  }

  return (
    <Shell>
      <p className="font-display mt-6 text-[1.2rem] leading-[1.8]">
        {name ? `${name}님,` : ""} 월화에게
        <br />
        한마디 남겨 주시겠어요?
      </p>
      <p className="mb-8 mt-3 text-[0.84rem] font-light leading-[1.95] text-ivory-dim">
        좋았던 점도, 아쉬웠던 점도 그대로 들려주세요.
        <br />
        다음에 찾아올 사람에게 가장 정직한 안내가 돼요.
      </p>
      {locked ? (
        <div className="rounded-2xl border border-gold-dim/30 bg-ink-soft/60 px-6 py-7 text-center text-[0.86rem] leading-[1.95] text-ivory-dim">
          이미 남겨 주신 후기가 있어요. 고마워요.
        </div>
      ) : (
        <ReviewForm o={o} t={t} initial={initial} />
      )}
    </Shell>
  );
}
