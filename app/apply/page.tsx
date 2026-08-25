import Link from "next/link";

export const metadata = {
  title: "리추얼 신청 | 월하연 月下緣",
};

export default function ApplyPage() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.3em] text-gold/80">月下緣</p>
      <h1 className="font-display mt-4 text-2xl leading-snug text-ivory">
        리추얼 신청 페이지는
        <br />곧 준비됩니다
      </h1>
      <p className="mt-6 text-sm leading-relaxed text-ivory-dim">
        지금은 랜딩페이지 단계입니다.
        <br />
        신청 기능은 다음 단계에서 연결됩니다.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex h-12 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory transition-colors hover:border-gold/70 hover:text-gold"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
