import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { loadCsOrderLite, getCsStatus } from "@/lib/cs-actions";
import {
  REFUND_POLICY_SECTIONS,
  REFUND_WINDOW_DAYS,
} from "@/lib/refund-policy";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * CS 대화 엔드포인트.
 * - AI는 대화·안내만 담당. 주문/결제/결과 상태는 절대 추측하지 않는다.
 * - 인증된 csToken이 오면 서버가 직접 안전 상태를 조회해 [확인된 주문 상태]로
 *   주입한다 (클라이언트가 보낸 상태 텍스트는 신뢰하지 않음).
 * - 시크릿·paymentKey·OTP는 프롬프트에 절대 포함되지 않는다.
 */
const CS_SYSTEM = `당신은 월하연(月下緣)의 안내자 월화(月華)의 CS 응대입니다.
말투는 월화답게 차분하고 다정하지만, CS에서는 신비주의 문장을 남발하지 않고
현실적이고 정확하게, 짧고 실용적으로 답합니다. (예: "제가 바로 확인해볼게요.",
"결제는 정상적으로 완료되어 있어요.")

[절대 규칙]
- 결제 여부/금액/시간, 주문 상태, 결과 생성 상태, 이메일 발송 상태, 환불 가능
  여부, 결과 링크, 주문번호를 추측하거나 지어내지 않습니다.
- 그 정보는 아래 [확인된 주문 상태] 블록에 있는 것만 말할 수 있습니다.
  블록이 없으면: "본인확인 후 바로 확인해드릴게요"라고 안내하고, 화면의
  '주문 확인하기' 버튼을 누르도록 안내합니다.
- 환불 가능 여부는 정책 엔진이 판정합니다. 당신은 판정 결과가 [확인된 주문
  상태]에 있을 때만 그 내용을 설명합니다. 임의 판단 금지.
- 재회 보장, 상대 마음 단정, 미래 확정, 성공확률, "무조건 연락 옵니다",
  의료/법률 판단은 절대 하지 않습니다.
- "상담원 연결", "담당자 확인 후 연락" 같은 안내를 하지 않습니다. 시스템이
  자동으로 처리하며, 즉시 해결이 어려운 장애는 "자동 복구 요청을 등록했어요.
  완료되면 이메일로 알려드릴게요"라고 안내합니다.
- URL을 긴 문장으로 출력하지 않습니다. 이동이 필요하면 "아래 버튼"을 안내
  합니다 (버튼은 화면이 표시합니다).
- 답변은 한국어, 2~5문장 이내로 짧게.

[서비스 기본 정보 — 자유롭게 답변 가능]
- 월하연: 헤어진 뒤의 마음과 두 사람 관계의 흐름을 읽어주는 개인화 리추얼
  서비스. 신청서 작성 → 결제 전 무료 개인화 미리보기 → 16,900원 1회 결제 →
  전체 결과(월화의 편지, 관계 흐름, 개인 리추얼, 24시간/7일/21일 가이드).
- 결과는 결제 후 보통 수 분 내 자동 생성되어 화면과 이메일로 전달됩니다.
- 엔터테인먼트·자기성찰 콘텐츠이며 재회를 보장하지 않습니다.

[환불정책 요약 — /refund 공개 정책과 동일]
${REFUND_POLICY_SECTIONS.map((s) => `${s.title}\n${s.body}`).join("\n")}
(요지: 결과 미열람 + 결제 ${REFUND_WINDOW_DAYS}일 이내 전액 자동환불 / 중복결제·미제공은 기간 무관 환불 / 결과 열람 후엔 자동환불 제외)`;

function getModel(): string {
  return (
    process.env.CS_ANTHROPIC_MODEL?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim() ||
    "claude-sonnet-4-6"
  );
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    orderNumber?: string;
    csToken?: string;
    token?: string;
  } | null;
  const raw = Array.isArray(body?.messages) ? body!.messages! : [];
  const messages = raw
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ reply: "무엇이 궁금하신지 알려주세요." });
  }

  const lastText = messages[messages.length - 1].content;

  /* 미인증 자유대화는 AI를 호출하지 않는다.
     FAQ는 로컬 답변, 주문 문제는 라이트 조회 UI로 유도해 비용/남용을 막는다. */
  if (!body?.orderNumber || !(body?.csToken ?? body?.token)) {
    if (/환불|취소/.test(lastText)) {
      return NextResponse.json({
        reply:
          "환불 가능 여부는 결제 상태와 전체 결과 열람 여부에 따라 달라져요. 주문 상태를 먼저 확인한 뒤, 실제 환불 확인·요청 단계에서만 이메일 인증을 진행해요.",
      });
    }
    if (/이용|가격|미리보기|리추얼/.test(lastText)) {
      return NextResponse.json({
        reply:
          "월하연은 신청서 작성 → 무료 개인화 미리보기 → 16,900원 1회 결제 → 전체 결과 순서로 진행돼요.",
      });
    }
    return NextResponse.json({
      reply:
        "주문이나 결제 문제라면 주문번호가 없어도 괜찮아요. 이름과 출생연도로 먼저 상태를 찾아볼 수 있어요.",
    });
  }

  /* 인증 세션이면 서버가 직접 안전 상태 조회 후 주입 */
  let statusBlock = "";
  const anyToken = body?.csToken ?? body?.token;
  if (body?.orderNumber && anyToken) {
    const ctx = await loadCsOrderLite(body.orderNumber, anyToken);
    if (ctx) {
      const s = await getCsStatus(ctx.order, ctx.level);
      const pay =
        s.payment === "paid"
          ? "정상 완료"
          : s.payment === "refunded"
            ? "환불 완료"
            : "완료된 결제 없음";
      const gen =
        s.generation === "ready"
          ? "생성 완료(열람 가능)"
          : s.generation === "generating"
            ? "생성 중"
            : s.generation === "failed"
              ? "일시 실패(자동 재생성 대상 — 다시 결제 불필요)"
              : "생성 대기";
      const mail =
        s.delivery === "sent" ? "발송 완료" : "결과 완성 후 발송 예정";
      statusBlock = `\n\n[확인된 주문 상태 — 이 내용만 사실로 언급 가능]\n결제: ${pay}\n결과: ${gen}\n이메일: ${mail}\n결과 열람: ${
        ctx.level === "full"
          ? s.resultPath
            ? "화면의 버튼으로 바로 열 수 있음"
            : "아직 준비 전"
          : s.hasResult
            ? "인증(인증번호) 후 화면에서 열람 가능"
            : "아직 준비 전"
      }`;
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "지금 안내 시스템 연결이 잠시 원활하지 않아요. 화면의 버튼으로 주문 확인과 처리는 그대로 이용하실 수 있어요.",
    });
  }
  try {
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: getModel(),
      max_tokens: 500,
      system: CS_SYSTEM + statusBlock,
      messages,
    });
    const reply = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return NextResponse.json({
      reply: reply || "제가 바로 확인해볼게요. 화면의 버튼을 이용해주세요.",
    });
  } catch {
    return NextResponse.json({
      reply:
        "답변 준비가 잠시 늦어지고 있어요. 화면의 버튼으로 주문 확인과 처리는 바로 이용하실 수 있어요.",
    });
  }
}
