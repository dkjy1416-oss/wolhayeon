import type { Metadata } from "next";
import LegalPage, { BUSINESS, InfoRow } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "사업자정보 | 월하연 月下緣" };

export default function BusinessPage() {
  return (
    <LegalPage title="사업자정보" updated="2026년 9월 13일">
      <dl className="rounded-2xl border border-gold-dim/25 bg-ink-soft px-5 py-2">
        <InfoRow label="서비스명" value={BUSINESS.serviceName} />
        <InfoRow label="상호" value={BUSINESS.company} />
        <InfoRow label="대표자" value={BUSINESS.ceo} />
        <InfoRow label="사업자등록번호" value={BUSINESS.regNo} />
        <InfoRow
          label="통신판매업 신고번호"
          value={`${BUSINESS.mailOrderNo} (신고기관: ${BUSINESS.mailOrderOffice})`}
        />
        <InfoRow label="사업장 주소" value={BUSINESS.address} />
        <InfoRow label="고객문의 전화" value={BUSINESS.phone} />
        <InfoRow label="고객문의 이메일" value={BUSINESS.email} />
        <InfoRow label="도메인" value={BUSINESS.domain} />
      </dl>
      <p className="text-[0.82rem] font-light leading-[1.9] text-ivory-dim">
        사업자등록번호와 통신판매업 신고 정보는 공정거래위원회의 통신판매사업자
        정보공개 서비스에서 확인할 수 있습니다.
      </p>
    </LegalPage>
  );
}
