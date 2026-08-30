import Link from "next/link";
import PreviewExperience from "@/components/apply/PreviewExperience";

/** 주문번호 형식 (URL에는 주문번호만 — 개인정보 없음) */
const ORDER_NUMBER_RE = /^WH-\d{8}-[A-Z0-9]{5}$/;

export default async function ApplyPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const orderNumber =
    typeof order === "string" && ORDER_NUMBER_RE.test(order) ? order : null;

  if (!orderNumber) {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xl text-ivory">
          주문 정보를 찾을 수 없습니다.
        </p>
        <Link
          href="/apply"
          className="mt-8 inline-flex h-13 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
        >
          신청서 작성하기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-lg pt-14">
      <p className="text-center text-xs tracking-[0.35em] text-gold/90">
        月下緣
      </p>
      <PreviewExperience orderNumber={orderNumber} />
    </main>
  );
}
