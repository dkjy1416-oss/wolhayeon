/** 11/3 — 메인에서 새 상품(카톡 분석·재회의 책)으로 가는 입구. 메인 방문자가 새 상품을 못 보던 문제 해결 */
import Image from "next/image";
import TrackedCtaLink from "@/components/TrackedCtaLink";

export default function ChatPromo({ paid = 0 }: { paid?: number }) {
  const card = "flex items-center gap-3 rounded-2xl border border-[#e46b8a]/40 bg-[#1b1316] p-3 active:opacity-85";
  return (
    <section className="px-5 py-6">
      <p className="text-center text-[0.72rem] tracking-[0.22em] text-gold">NEW · 월하연 신상</p>
      <div className="mt-3 flex flex-col gap-2.5">
        <TrackedCtaLink event="home_cta_click" placement="chat_promo" href="/chat" className={card}>
          <Image src="/og/chat.jpg" alt="" width={120} height={63} className="h-[63px] w-[120px] flex-none rounded-xl object-cover" />
          <span className="min-w-0">
            <span className="block text-[0.98rem] font-bold text-ivory">💬 그 사람 카톡, 숫자로 읽어 드려요</span>
            <span className="mt-0.5 block text-[0.78rem] text-ivory-dim">답장 시간 · 먼저 연락 · 대화 온도 — 1분 무료</span>
          </span>
        </TrackedCtaLink>
        <TrackedCtaLink event="home_cta_click" placement="book_promo" href="/book" className={card}>
          <Image src="/og/book.jpg" alt="" width={120} height={63} className="h-[63px] w-[120px] flex-none rounded-xl object-cover" />
          <span className="min-w-0">
            <span className="block text-[0.98rem] font-bold text-ivory">📖 나만을 위한 재회의 책</span>
            <span className="mt-0.5 block text-[0.78rem] text-ivory-dim">내 사연으로 쓰는 한 권 · 미리 보기</span>
          </span>
        </TrackedCtaLink>
        <TrackedCtaLink event="home_cta_click" placement="guide_promo" href="/free/no-send" className="flex items-center justify-between gap-3 rounded-2xl border border-gold-dim/40 bg-ink-soft px-4 py-3.5 active:opacity-85">
          <span className="min-w-0">
            <span className="block text-[0.72rem] font-semibold tracking-[0.12em] text-gold">무료 가이드 · 1분</span>
            <span className="mt-0.5 block text-[0.94rem] font-bold text-ivory">🎁 재회 전에 보내면 안 되는 메시지 7가지</span>
          </span>
          <span aria-hidden className="flex-none text-gold">→</span>
        </TrackedCtaLink>
      </div>
      {paid >= 5 && (
        <p className="mt-3 text-center text-[0.78rem] text-ivory-dim">
          지금까지 <b className="text-ivory">{paid}건</b>의 전체 결과가 전달됐어요 · 결제 전 무료 미리보기
        </p>
      )}
    </section>
  );
}
