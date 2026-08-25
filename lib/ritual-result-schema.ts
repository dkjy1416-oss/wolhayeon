/**
 * 월화 리추얼 결과 JSON 스키마 (Zod).
 *
 * AI가 반환한 JSON을 저장하기 전에 이 스키마로 검증합니다.
 * 구조가 어긋나면 DB에 저장하지 않고 generation_status = failed 처리.
 * ritual_results.generated_content(JSONB)에 이 구조 그대로 저장됩니다.
 */
import { z } from "zod";

/** 본문 텍스트: 최소한의 실질 내용 강제 (빈 문자열/한두 글자 방지) */
const text = z.string().trim().min(10);
const title = z.string().trim().min(2).max(80);
const line = z.string().trim().min(4);
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
 * 코드펜스(```json ... ```)가 섞여 있어도 처리합니다.
 */
export function parseRitualResult(
  raw: string
): { ok: true; data: RitualResult } | { ok: false; reason: string } {
  let text = raw.trim();
  // 코드펜스 제거
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fence) text = fence[1];
  // 앞뒤 잡음이 있어도 가장 바깥 { ... } 만 취함
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
    // 어떤 파트가 어긋났는지 경로만 기록 (내용은 로그에 남기지 않음)
    const paths = result.error.issues
      .slice(0, 5)
      .map((i) => i.path.join("."))
      .join(",");
    return { ok: false, reason: `schema_invalid:${paths}` };
  }
  return { ok: true, data: result.data };
}
