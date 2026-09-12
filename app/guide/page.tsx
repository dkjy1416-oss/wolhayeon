import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "이용안내 | 월하연 月下緣" };

export default function GuidePage() {
  return (
    <LegalPage title="이용안내" updated="2026년 9월 13일">
      <LegalSection title="월하연은 어떤 서비스인가요">
        <p>
          월하연은 관계와 감정을 돌아보기 위한 <strong>개인화 디지털 콘텐츠 서비스</strong>입니다.
          사용자가 들려주신 이야기를 바탕으로 월화의 편지, 관계 흐름 읽기,
          나만의 리추얼과 24시간·7일·21일 가이드를 포함한 콘텐츠를 제공합니다.
        </p>
        <p>
          AI와 자동화 기술을 활용해 콘텐츠를 생성하며,
          <strong> 특정 상대방의 감정·연락·재회·행동 또는 미래 결과를 보장하지 않습니다.</strong>
        </p>
      </LegalSection>

      <LegalSection title="이용 순서">
        <p>
          ① <strong>이야기 들려주기</strong> — 월화가 한 질문씩 이야기를 듣습니다.
          작성 중인 답변은 같은 브라우저에 임시 저장되어 중간에 나갔다 돌아와도
          이어서 작성할 수 있습니다.
        </p>
        <p>
          ② <strong>무료 개인화 미리보기</strong> — 결제 전에 월화가 먼저 읽은
          개인화 미리보기를 확인할 수 있습니다.
        </p>
        <p>
          ③ <strong>결제</strong> — 미리보기에서 안내된 금액으로 1회 결제 후
          전체 결과 생성이 시작됩니다.
        </p>
        <p>
          ④ <strong>전체 결과 생성</strong> — 결과는 자동으로 생성됩니다.
          보통 수 분 안에 완료되지만 네트워크와 AI 처리 상황에 따라 더 걸릴 수 있습니다.
        </p>
        <p>
          ⑤ <strong>결과 이메일</strong> — 생성이 완료되면 신청 시 등록한 이메일로도
          결과 링크를 보내드립니다.
        </p>
      </LegalSection>

      <LegalSection title="결과를 다시 확인하고 싶다면">
        <p>
          결과 이메일의 링크로 다시 열 수 있습니다. 메일을 찾기 어렵거나 생성 상태가
          궁금한 경우 화면의 월하연 고객센터에서 신청 내역을 조회하고 결과 재발송 또는
          생성 상태 확인을 이용할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="결제 전 신청을 이어가고 싶다면">
        <p>
          신청을 마쳤지만 결제 전에 나간 경우에도 신청 내용은 주문 상태에 따라 보존됩니다.
          다른 기기에서 이어가는 경우에는 고객센터에서 신청 내역을 찾고 본인확인 후
          미리보기와 결제 단계로 연결할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="고객센터 이용 방법">
        <p>
          결제·결과·이메일·환불과 관련된 문의는 화면의 월하연 고객센터에서 확인할 수 있습니다.
          환불 또는 결과 원문 열람처럼 민감한 기능은 별도의 본인확인을 거쳐 진행됩니다.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
