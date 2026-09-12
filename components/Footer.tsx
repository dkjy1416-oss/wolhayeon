import Link from "next/link";
import { BUSINESS } from "@/components/legal/LegalPage";

const LINKS = [
  { label: "이용안내", href: "/guide" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "환불정책", href: "/refund" },
  { label: "사업자정보", href: "/business" },
];

export default function Footer() {
  return (
    <footer className="border-t border-gold-dim/15 px-6 py-12">
      <div className="mx-auto max-w-md">
        <p className="font-display text-base text-ivory">
          월하연 <span className="text-gold">月下緣</span>
        </p>

        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[0.78rem] text-ivory-dim transition-colors hover:text-ivory"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-7 flex flex-col gap-1 text-[0.7rem] font-light leading-[1.85] text-ivory-dim/70">
          <p>{BUSINESS.company} · 대표 {BUSINESS.ceo}</p>
          <p>사업자등록번호 {BUSINESS.regNo}</p>
          <p>
            통신판매업 신고번호 {BUSINESS.mailOrderNo}
            {" · "}신고기관 {BUSINESS.mailOrderOffice}
          </p>
          <p className="break-keep">{BUSINESS.address}</p>
          <p className="mt-2">
            고객문의 {BUSINESS.phone} · {BUSINESS.email}
          </p>
          <p className="text-ivory-dim/60">
            빠른 문의는 화면의 월하연 고객센터를 이용해주세요.
          </p>
        </div>

        <p className="mt-7 text-[0.66rem] font-light leading-relaxed text-ivory-dim/50">
          월하연은 관계와 감정을 돌아보기 위한 개인화 디지털 콘텐츠
          서비스이며, 특정 상대방의 감정·연락·재회·행동 또는 미래의 결과를
          보장하지 않습니다.
        </p>
      </div>
    </footer>
  );
}
