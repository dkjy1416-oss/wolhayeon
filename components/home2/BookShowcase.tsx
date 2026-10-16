/** 08. 책 — 실제 표지와 실제 페이지가 넘어가는 모습 (가상 신청자 '지수' 님 사연으로 만든 PDF) */
import Image from "next/image";
import Link from "next/link";
import PageFlipper from "@/components/book/PageFlipper";
import { BOOK_SAMPLE_PAGES } from "@/lib/book/book-pages";
import { PRICE } from "./content";

export default function BookShowcase() {
  return (
    <section className="border-y border-gold-dim bg-[#f1ebe4] px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
        <div className="min-w-0">
          <p className="text-[0.8rem] tracking-[0.14em] text-gold">더 오래 곁에 두고 싶다면</p>
          <h2 className="font-display font-bold mt-2 text-[1.55rem] leading-[1.45] text-ivory [text-wrap:balance] md:text-[2rem]">
            내 이름으로 만든 한 권의 책
          </h2>
          <p className="mt-3 text-[0.98rem] leading-[1.8] text-ivory-dim">
            《헤어진 뒤, 연락하지 말아야 할 때》 — 흔들릴 때마다 다시 펼치는 상황별 문장 · 체크리스트 · 날짜가 적힌 7일/21일 기록장. 약 120쪽 PDF, 60일 안에 내려받아 계속 보관해요.
          </p>
          <div className="relative mx-auto mt-6 aspect-square w-full max-w-[360px]">
            <Image src="/book/v2/cover-3d.webp" alt="개인 맞춤 PDF 책 표지" fill sizes="360px" className="object-contain drop-shadow-[0_24px_40px_rgba(49,43,45,0.35)]" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-[0.95rem] font-semibold text-ivory">책만 {PRICE.book.toLocaleString()}원</span>
            <span className="text-[0.86rem] text-ivory-dim">· 관계 리추얼과 함께 받으면 미리보기 후 24시간 {PRICE.bundleFirst.toLocaleString()}원</span>
          </div>
          <Link href="/book" className="mt-4 inline-flex h-12 items-center justify-center rounded-full border border-burgundy px-6 text-[0.92rem] font-semibold text-burgundy">
            책 자세히 보기
          </Link>
        </div>
        <div className="min-w-0">
          <PageFlipper pages={BOOK_SAMPLE_PAGES} />
          <p className="mt-2 text-center text-[0.78rem] text-ivory-dim">실제 책 페이지 · 가상 사연 예시</p>
        </div>
      </div>
    </section>
  );
}
