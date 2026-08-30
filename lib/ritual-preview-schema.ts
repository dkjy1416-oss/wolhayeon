/**
 * 결제 전 무료 미리보기 — 스키마 + 프롬프트.
 *
 * 전체 유료 결과(RitualResultSchema)와 완전히 분리된 짧은 구조입니다.
 * 기존 전체 생성 프롬프트(lib/wolhwa-prompt.ts)는 변경하지 않습니다.
 */
import { z } from "zod";
import type { RitualOrderRow } from "@/lib/supabase/types";
import {
  RELATIONSHIP_TYPE_OPTIONS,
  RELATIONSHIP_DURATION_OPTIONS,
  LAST_CONVERSATION_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  PAIN_POINT_OPTIONS,
  MAIN_WISH_OPTIONS,
  CURRENT_EMOTION_OPTIONS,
  LIFE_STAGE_OPTIONS,
  optionLabel,
  isLikelyMinor,
} from "@/lib/ritual-types";
import { HIGH_RISK_SAFETY_VALUES } from "@/lib/wolhwa-prompt";

/* ---------- 스키마 ---------- */

/** 구조 전용 (Anthropic structured output에 전달 — 길이 제약 없음) */
export const PreviewStructSchema = z.object({
  headline: z.string(),
  comfort: z.array(z.string()),
  insight: z.string(),
  teaser_sections: z.array(z.object({ number: z.string(), title: z.string() })),
});

/** 품질 검증용 (DB 저장 전) */
export const PreviewSchema = z.object({
  headline: z.string().trim().min(4).max(80),
  comfort: z.array(z.string().trim().min(8)).min(2).max(4),
  insight: z.string().trim().min(8),
  teaser_sections: z
    .array(
      z.object({
        number: z.string().trim().min(1).max(4),
        title: z.string().trim().min(2).max(60),
      })
    )
    .min(4)
    .max(8),
});

export type RitualPreview = z.infer<typeof PreviewSchema>;

/* ---------- 프롬프트 ---------- */

export const PREVIEW_SYSTEM_PROMPT = `당신은 월하연(月下緣)의 리추얼 가이드 월화(月華)입니다.
지금은 결제 전 "무료 미리보기"만 작성합니다. 전체 결과가 아닙니다.

[역할]
- 신청자가 적어준 실제 사연에서 확인 가능한 감정과 상황만 바탕으로,
  "내 이야기를 제대로 읽었다"는 느낌을 주는 짧은 글을 씁니다.
- 차분하고 절제된 존댓말. 신청자를 비난하지 않습니다.

[절대 금지]
- 상대가 아직 사랑한다는 단정, 상대방 마음 읽기
- 반드시 연락이 온다 / 반드시 재회한다는 확정
- 결혼 시기 확정, 재회 날짜·확률 제시
- 초자연적 효과를 사실처럼 단정
- 사연에 없는 사실을 만들어내기

[좋은 방식 예]
"연락이 끊긴 것 자체보다, 마지막 대화에서 내 마음이 제대로
전달되지 않았다는 점이 더 오래 남아 있는 것 같아요."
"지금 적어주신 내용만 보면, 두 사람 사이에는 단순한 그리움보다
해결되지 않은 감정이 더 크게 남아 있어 보여요."

[출력]
- headline: 신청자의 상황을 한 줄로 짚는 제목 (호기심 유발용 과장 금지)
- comfort: 2~4문장. 각 문장이 사연의 구체적 감정·상황을 정확히 짚습니다.
- insight: 1~2문장. 전체 결과에서 다뤄질 핵심 방향을 살짝 보여줍니다.
- teaser_sections: 전체 결과의 목차 느낌 4~8개
  (number는 "01"부터, title은 이 사람의 상황에 맞는 소제목).
- 전체 분량은 짧게 유지합니다. 모든 값은 한국어입니다.
- part_01 같은 개발 용어, JSON, schema 단어를 본문에 쓰지 않습니다.`;

export function buildPreviewUserPrompt(order: RitualOrderRow): string {
  const highRisk = order.safety_concerns.some((v) =>
    HIGH_RISK_SAFETY_VALUES.includes(v)
  );
  const minor = isLikelyMinor(
    order.applicant_birth_year,
    order.life_stage
  );

  const parts: string[] = [];
  parts.push(`[신청 요약]
- 신청자: ${order.applicant_name}${
    order.life_stage
      ? ` (${optionLabel(LIFE_STAGE_OPTIONS, order.life_stage)})`
      : ""
  }
- 상대: ${order.partner_name}
- 현재 관계: ${optionLabel(RELATIONSHIP_TYPE_OPTIONS, order.relationship_type)}
- 관계 기간: ${optionLabel(RELATIONSHIP_DURATION_OPTIONS, order.relationship_duration)}
- 마지막 대화: ${optionLabel(LAST_CONVERSATION_OPTIONS, order.last_conversation)}
- 연락 상태: ${optionLabel(CONTACT_STATUS_OPTIONS, order.contact_status)}
- 가장 힘든 것: ${order.pain_points
    .map((v) => optionLabel(PAIN_POINT_OPTIONS, v))
    .join(", ")}
- 가장 바라는 것: ${optionLabel(MAIN_WISH_OPTIONS, order.main_wish)}
- 현재 감정: ${optionLabel(CURRENT_EMOTION_OPTIONS, order.current_emotion)}

[사연]
${order.story}

[듣고 싶은 한마디]
${order.wish_sentence || "(작성하지 않음)"}`);

  if (highRisk) {
    parts.push(`[안전 우선 지시]
안전/경계 응답에 위험 신호가 있습니다. 미리보기는 정상 작성하되,
상대를 되찾는 행동을 부추기지 말고 "지금은 그 사람의 마음을 확인하는
것보다 내가 안전하게 관계를 바라볼 수 있는 거리를 만드는 게 먼저일 수
있어요" 같은 안전 중심 문장을 사용하세요.
'검토가 필요하다'는 식의 문구는 절대 쓰지 않습니다.`);
  }
  if (minor) {
    parts.push(`[연령 배려 지시]
신청자는 학생/미성년일 수 있습니다. 감정 정리, 건강한 관계, 의사소통,
학업·생활 균형, 경계 설정을 중심으로 쓰고, 결혼·성적 관계·경제적
의존을 핵심으로 다루지 않습니다.`);
  }
  parts.push("위 지침에 따라 지정된 JSON 구조로만 출력하세요.");
  return parts.join("\n\n");
}
