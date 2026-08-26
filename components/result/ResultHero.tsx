/** 결과 상단 hero + 간단한 목차 (모두 서버 렌더, JS 불필요) */
export default function ResultHero({ name }: { name: string }) {
  const toc = [
    { href: "#letters", label: "월화의 편지" },
    { href: "#reading", label: "마음 들여다보기" },
    { href: "#ritual", label: "붉은 실 리추얼" },
    { href: "#journey", label: "21일 여정" },
    { href: "#journal", label: "마음 기록장" },
  ];
  return (
    <header className="px-6 pb-14 pt-20 text-center">
      <p className="text-xs tracking-[0.4em] text-gold/90">월하연 月下緣</p>
      <p className="mt-3 text-[0.7rem] tracking-[0.25em] text-thread/90">
        붉은 인연의 실 리추얼
      </p>
      <div className="mx-auto mt-8 h-px w-16 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <h1 className="font-display mt-8 text-[1.65rem] font-semibold leading-snug text-ivory">
        {name}님을 위한
        <br />
        월화의 개인 리추얼
      </h1>
      <p className="mt-5 text-[0.85rem] font-light leading-[2] text-ivory-dim">
        달빛 아래에서 천천히, 처음부터 끝까지
        <br />
        당신의 속도로 읽어 내려가 주세요.
      </p>
      <nav className="mx-auto mt-10 flex max-w-sm flex-wrap items-center justify-center gap-2">
        {toc.map((t) => (
          <a
            key={t.href}
            href={t.href}
            className="rounded-full border border-gold-dim/35 px-3.5 py-1.5 text-[0.72rem] text-ivory-dim transition-colors hover:border-gold/60 hover:text-gold"
          >
            {t.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
