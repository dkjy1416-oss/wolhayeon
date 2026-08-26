/** 하단 안내 + 처음부터 다시 읽기 (앵커 이동, JS 불필요) */
export default function ResultFooter() {
  return (
    <footer className="px-6 pb-16 pt-6 text-center">
      <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <p className="mx-auto mt-8 max-w-sm text-[0.72rem] font-light leading-[1.9] text-ivory-dim/70">
        이 결과는 월하연의 개인 리추얼 콘텐츠입니다.
        <br />
        상대의 마음이나 미래를 단정하거나 보장하지 않으며,
        <br />
        당신의 마음을 돌보는 상징적인 시간으로 준비되었습니다.
      </p>
      <a
        href="#top"
        className="mt-9 inline-flex h-12 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-[0.85rem] text-ivory transition-colors hover:border-gold/60"
      >
        처음부터 다시 읽기
      </a>
      <p className="mt-10 text-[0.65rem] tracking-[0.35em] text-gold/60">
        월하연 月下緣
      </p>
    </footer>
  );
}
