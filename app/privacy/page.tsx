import type { Metadata } from "next";
import LegalPage, { BUSINESS, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 월하연 月下緣",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침" updated="2026년 9월 13일">
      <LegalSection title="1. 개인정보의 처리 목적">
        <p>
          제이 beauty company(이하 “회사”)는 월하연 서비스 제공을 위해 개인정보를 처리합니다.
          처리 목적은 ① 개인화 콘텐츠 생성·제공 ② 주문 및 결제 관리 ③ 결과 이메일 발송
          ④ 고객문의 및 본인확인 ⑤ 환불·분쟁처리 등 소비자 보호 의무 이행입니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 처리하는 개인정보 항목">
        <p>
          <strong>신청 시:</strong> 이름 또는 닉네임, 출생연도, 성별, 생활단계,
          상대방에 대해 이용자가 입력한 정보, 관계 상태와 감정에 관한 응답,
          자유 서술 내용, 이메일 주소, 필수 동의 여부.
        </p>
        <p>
          <strong>결제·주문 관리:</strong> 주문 식별정보, 결제 금액, 결제수단 구분,
          승인 시각, 결제 승인에 필요한 결제 식별키. 카드번호·CVC·카드 비밀번호 등
          카드 원정보는 회사가 직접 저장하지 않습니다.
        </p>
        <p>
          <strong>서비스 이용 과정:</strong> 생성 결과 콘텐츠, 결과 페이지 열람 시각·횟수,
          이메일 발송 상태, 고객센터 처리 기록과 인증 시도 결과, 서비스 운영을 위한
          일반적인 접속·오류 로그가 생성될 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="3. 개인정보의 보유 및 이용기간">
        <p>
          신청 내용과 생성 결과는 결과 재열람, 결과 재발송 및 고객문의 대응을 위해
          서비스가 제공되는 동안 보유합니다. 이용자가 삭제를 요청하거나 서비스가 종료되는 경우,
          법령상 보관 의무가 없는 정보는 지체 없이 삭제합니다.
        </p>
        <p>
          전자상거래 관련 법령에 따라 계약 또는 청약철회 등에 관한 기록과
          대금결제·재화 등의 공급에 관한 기록은 <strong>5년</strong>,
          소비자 불만 또는 분쟁처리에 관한 기록은 <strong>3년</strong> 보관할 수 있습니다.
          법령상 보관 대상은 다른 개인정보와 분리해 해당 기간 동안만 보관합니다.
        </p>
      </LegalSection>

      <LegalSection title="4. 개인정보의 파기">
        <p>
          보유기간이 지나거나 처리 목적이 달성되어 개인정보가 불필요해진 경우 지체 없이 파기합니다.
          전자적 파일은 복구하기 어려운 방법으로 삭제하고, 출력물이 있는 경우 분쇄 또는 이에 준하는
          방법으로 파기합니다.
        </p>
      </LegalSection>

      <LegalSection title="5. 개인정보 처리업무의 위탁">
        <p>
          회사는 서비스 제공을 위해 다음 업체의 서비스를 사용합니다.
        </p>
        <p>
          · <strong>Supabase, Inc.</strong> — 데이터베이스 호스팅. 월하연 프로젝트의
          주요 데이터 저장 리전은 <strong>대한민국 서울(ap-northeast-2)</strong>입니다.
          <br />· <strong>토스페이먼츠 주식회사</strong> — 결제 승인 및 취소 처리.
          <br />· <strong>Vercel Inc.</strong> — 웹사이트 호스팅, 서버 실행, 배포 및
          비식별 Web Analytics.
          <br />· <strong>Anthropic, PBC</strong> — 사용자가 입력한 내용에 기반한
          개인화 콘텐츠 생성.
          <br />· <strong>Plus Five Five, Inc. (Resend)</strong> — 결과 및 안내 이메일 발송.
        </p>
      </LegalSection>

      <LegalSection title="6. 개인정보의 국외 이전">
        <p>
          월하연은 서비스 계약의 이행을 위해 필요한 범위에서 국외 사업자의 서비스를 사용합니다.
          국외 이전을 원하지 않는 경우 고객센터를 통해 개인정보 삭제 또는 처리 중지를 요청할 수 있으나,
          AI 콘텐츠 생성·웹 호스팅·이메일 발송 등 해당 기능의 이용이 제한될 수 있습니다.
        </p>

        <div className="overflow-hidden rounded-2xl border border-gold-dim/20">
          <div className="border-b border-gold-dim/15 p-4">
            <p className="text-sm font-medium text-ivory">Vercel Inc.</p>
            <p className="mt-1 text-sm">
              이전 항목: 서비스 요청 처리에 필요한 신청·주문 정보 및 기술 로그
              <br />국가: 미국 및 서비스 제공을 위한 글로벌 인프라 지역
              <br />시기·방법: 서비스 이용 시 암호화된 네트워크를 통한 전송
              <br />목적: 웹 호스팅·서버 실행·보안·운영
              <br />보유기간: Vercel과의 서비스 계약 및 관련 법령에 따른 기간
              <br />연락처: privacy@vercel.com
            </p>
          </div>

          <div className="border-b border-gold-dim/15 p-4">
            <p className="text-sm font-medium text-ivory">Anthropic, PBC</p>
            <p className="mt-1 text-sm">
              이전 항목: 개인화 결과 생성에 필요한 신청 내용
              <br />국가: 미국(저장), 미국·유럽·아시아·호주 지역에서 처리될 수 있음
              <br />시기·방법: 결과 생성 요청 시 암호화된 API 전송
              <br />목적: 개인화 AI 콘텐츠 생성
              <br />보유기간: Anthropic API의 기본 정책에 따라 입력·출력은 통상 30일 이내 삭제
              (법령 준수·정책 집행 등 예외 가능)
              <br />연락처: legal@anthropic.com
            </p>
          </div>

          <div className="p-4">
            <p className="text-sm font-medium text-ivory">Plus Five Five, Inc. (Resend)</p>
            <p className="mt-1 text-sm">
              이전 항목: 수신 이메일 주소, 이메일 제목·본문 및 발송 상태
              <br />국가: 미국
              <br />시기·방법: 결과·안내 이메일 발송 시 암호화된 API 전송
              <br />목적: 이메일 발송 및 전달 상태 관리
              <br />보유기간: 일반 이메일 데이터는 Resend의 기본 정책상 30일
              (계약 또는 요금제에 따라 달라질 수 있음)
              <br />연락처: privacy@resend.com
            </p>
          </div>
        </div>

        <p>
          Supabase의 월하연 데이터베이스 주요 저장 리전은 대한민국 서울이며,
          토스페이먼츠를 통한 결제 처리는 국내 결제 서비스로 운영됩니다.
        </p>
      </LegalSection>

      <LegalSection title="7. 정보주체의 권리와 행사 방법">
        <p>
          이용자는 자신의 개인정보에 대해 열람·정정·삭제·처리정지 등을 요청할 수 있습니다.
          화면의 월하연 고객센터 또는 {BUSINESS.email}로 요청하시면 본인확인 후 관련 법령에 따라
          처리합니다. 법령상 보관 의무가 있는 정보는 해당 기간 동안 삭제가 제한될 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="8. 안전성 확보조치">
        <p>
          회사는 HTTPS를 통한 암호화 통신, 서버 전용 데이터베이스 권한,
          결과 링크 토큰화, 민감 기능의 본인확인, 인증 시도 제한, 결제 원정보 비보관 등
          개인정보 보호를 위한 기술적·관리적 조치를 적용합니다.
        </p>
      </LegalSection>

      <LegalSection title="9. 쿠키 및 분석 도구">
        <p>
          월하연은 Vercel Web Analytics를 이용해 페이지 방문과 전환 단계를 분석합니다.
          현재 설정된 전환 이벤트에는 이름·이메일·사연·주문번호·결제키 등 개인 식별 정보를
          전송하지 않습니다. Vercel Web Analytics는 쿠키 없이 익명화된 통계 방식으로 운영됩니다.
        </p>
        <p>
          신청 과정에서는 이용 편의를 위해 브라우저 저장공간에 작성 중인 내용을 임시 저장할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="10. 개인정보 보호책임자 및 문의">
        <p>
          개인정보 보호책임자: <strong>{BUSINESS.privacyOfficer}</strong>
          <br />이메일: {BUSINESS.email}
          <br />전화: {BUSINESS.phone}
          <br />주소: {BUSINESS.address}
        </p>
        <p>
          개인정보 침해 신고·상담은 개인정보침해신고센터(국번 없이 118) 및
          개인정보분쟁조정위원회 등 관련 기관을 통해서도 도움을 받을 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="11. 개인정보처리방침의 변경">
        <p>
          이 방침의 내용이 변경되는 경우 시행 전에 본 페이지를 통해 고지합니다.
          본 개인정보처리방침은 2026년 9월 13일부터 시행합니다.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
