import Link from "next/link";

export const BUSINESS = {
  serviceName: "월하연 月下緣",
  company: "제이 beauty company",
  ceo: "김지영",
  regNo: "629-02-01920",
  mailOrderNo: "2022-울산중구-0406",
  mailOrderOffice: "울산광역시 중구",
  address:
    "울산광역시 중구 종가로 362-11, 401-35호 지식기술창업센터 (교동, 울산과학기술진흥센터/그린카기술센터)",
  phone: "070-4507-4474",
  email: "help@thewolha.com",
  domain: "https://thewolha.com",
  privacyOfficer: "김지영",
} as const;

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#080607]">
      <main className="mx-auto min-h-screen w-full max-w-[560px] bg-ink px-6 pb-20 pt-14">
        <Link href="/" className="text-xs tracking-[0.35em] text-gold/90">
          月下緣
        </Link>
        <h1 className="font-display mt-4 text-[1.35rem] font-semibold leading-snug text-ivory">
          {title}
        </h1>
        {updated && (
          <p className="mt-2 text-[0.72rem] font-light text-ivory-dim/70">
            시행일: {updated}
          </p>
        )}
        <div className="mt-9 flex flex-col gap-9">{children}</div>
        <div className="mt-14 border-t border-gold-dim/20 pt-6">
          <p className="text-[0.78rem] font-light leading-[1.9] text-ivory-dim">
            빠른 문의는 화면의 월하연 고객센터를 이용해주세요.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-gold-dim/40 px-7 text-sm text-ivory"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-[1rem] font-medium text-gold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[1rem] font-light leading-[1.95] text-ivory-dim [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-ivory [&_strong]:font-medium [&_strong]:text-ivory">
        {children}
      </div>
    </section>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gold-dim/15 py-3 last:border-0">
      <dt className="text-[0.72rem] tracking-wide text-gold/80">{label}</dt>
      <dd className="text-[0.95rem] font-light leading-[1.8] text-ivory">{value}</dd>
    </div>
  );
}
