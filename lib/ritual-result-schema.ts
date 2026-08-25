/**
 * 월화 리추얼 결과 JSON 스키마 (Zod).
 *
 * 두 개의 스키마를 사용합니다.
 *
 * 1) RitualResultStructSchema (구조 전용)
 *    - Anthropic 공식 구조화 출력(output_config.format)에 전달.
 *    - API가 이 구조의 JSON만 생성하도록 강제 → 코드펜스·설명문·
 *      깨진 JSON이 원천적으로 발생하지 않음.
 *    - Anthropic 구조화 출력은 문자열 길이 제약(minLength 등)을
 *      지원하지 않으므로 여기에는 타입/필수 여부만 둡니다.
 *
 * 2) RitualResultSchema (품질 검증용)
 *    - DB 저장 직전 서버에서 다시 검증(원칙 유지).
 *    - 최소 분량·항목 수 등 품질 기준을 여기서 강제.
 *    - 배열 항목은 min(1): "펜", "물"처럼 짧지만 정상적인
 *      준비물 표현을 거부하지 않음. (이전 min(4)가 실패 원인)
 */
import { z } from "zod";

/* ---------- 1) 구조 전용 (structured output에 전달) ---------- */

const sTitled = z.object({ title: z.string(), content: z.string() });
const sLines = z.array(z.string());

export const RitualResultStructSchema = z.object({
  part_01_letter: sTitled,
  part_02_relationship_story: sTitled,
  part_03_current_emotion: sTitled,
  part_04_repeated_pattern: sTitled,
  part_05_true_wish: sTitled,
  part_06_controllable_now: sTitled,
  part_07_ritual: z.object({ title: z.string(), meaning: z.string() }),
  part_08_preparation: z.object({ items: sLines }),
  part_09_ritual_steps: z.object({ steps: sLines }),
  part_10_personal_words: z.object({ lines: sLines }),
  part_11_24h_guide: z.object({ items: sLines }),
  part_12_7day_guide: z.object({ items: sLines }),
  part_13_21day_plan: z.object({
    days_1_7: sLines,
    days_8_14: sLines,
    days_15_21: sLines,
  }),
  part_14_final_letter: sTitled,
  bonus_journal_questions: sLines,
});

/* ---------- 2) 품질 검증용 (DB 저장 전) ---------- */

const text = z.string().trim().min(10);
const title = z.string().trim().min(2).max(80);
/** 배열 항목: 비어 있지만 않으면 허용 ("펜", "물" 등 짧은 준비물 포함) */
const line = z.string().trim().min(1);
const lines = (min: number) => z.array(line).min(min).max(20);

const titledContent = z.object({ title, content: text });

export const RitualResultSchema = z.object({
  part_01_letter: titledContent,
  part_02_relationship_story: titledContent,
  part_03_current_emotion: titledContent,
  part_04_repeated_pattern: titledContent,
  part_05_true_wish: titledContent,
  part_06_controllable_now: titledContent,
  part_07_ritual: z.object({ title, meaning: text }),
  part_08_preparation: z.object({ items: lines(2) }),
  part_09_ritual_steps: z.object({ steps: lines(3) }),
  part_10_personal_words: z.object({ lines: lines(3) }),
  part_11_24h_guide: z.object({ items: lines(3) }),
  part_12_7day_guide: z.object({ items: lines(3) }),
  part_13_21day_plan: z.object({
    days_1_7: lines(2),
    days_8_14: lines(2),
    days_15_21: lines(2),
  }),
  part_14_final_letter: titledContent,
  bonus_journal_questions: z.array(line).min(3).max(12),
});

export type RitualResult = z.infer<typeof RitualResultSchema>;

/**
 * AI 응답 텍스트에서 JSON을 안전하게 추출·검증.
 * 구조화 출력 사용 시 코드펜스가 나올 수 없지만, 방어적으로 유지합니다.
 */
export function parseRitualResult(
  raw: string
): { ok: true; data: RitualResult } | { ok: false; reason: string } {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fence) text = fence[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return { ok: false, reason: "no_json_object" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, reason: "json_parse_error" };
  }
  const result = RitualResultSchema.safeParse(parsed);
  if (!result.success) {
    // 어떤 파트가 어긋났는지 '경로'만 기록 (내용·개인정보는 로그에 남기지 않음)
    const paths = result.error.issues
      .slice(0, 5)
      .map((i) => i.path.join("."))
      .join(",");
    return { ok: false, reason: `schema_invalid:${paths}` };
  }
  return { ok: true, data: result.data };
}
