/**
 * 무료 미리보기 생성 (서버 전용).
 *
 * 비용 보호
 *  - 이미 preview_content가 있으면 Anthropic 호출 없이 재사용.
 *  - preview_generated_at IS NULL 조건부 UPDATE로 원자적 선점 —
 *    새로고침/반복 클릭/동시 요청이 API 비용을 반복 발생시키지 않음.
 *  - 실패 시 선점 해제(재시도 가능), 성공 시 캐시 저장.
 *
 * 접근 보호
 *  - orderNumber + 신청 세션의 submission_id 가 함께 일치해야 함
 *    (주문번호만 아는 제3자가 미리보기를 열람/생성 불가).
 *
 * 전체 유료 결과는 절대 생성하지 않으며(짧은 Preview 구조만),
 * 기존 전체 프롬프트/스키마는 사용하지 않습니다.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getModelId } from "@/lib/ritual-generate";
import {
  PreviewStructSchema,
  PreviewSchema,
  PREVIEW_SYSTEM_PROMPT,
  buildPreviewUserPrompt,
  type RitualPreview,
} from "@/lib/ritual-preview-schema";
import type { RitualOrderRow } from "@/lib/supabase/types";

const PREVIEW_MAX_TOKENS = 1500;

export type PreviewOutcome =
  | { status: "ready"; preview: RitualPreview }
  | { status: "pending" } // 다른 요청이 생성 중 — 잠시 후 재요청
  | { status: "not_found" }
  | { status: "failed" }
  | { status: "server_error" };

export async function getOrCreatePreview(
  orderNumber: string,
  submissionId: string
): Promise<PreviewOutcome> {
  try {
    const supabase = getSupabaseAdmin();

    const res = await supabase
      .from("ritual_orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (res.error || !res.data) return { status: "not_found" };
    const order = res.data as RitualOrderRow & {
      id: string;
      submission_id: string | null;
    };

    /* 신청 세션 확인 — 주문번호만으로는 접근 불가 */
    if (!order.submission_id || order.submission_id !== submissionId) {
      return { status: "not_found" };
    }

    /* 캐시 재사용 — Anthropic 반복 호출 방지 */
    if (order.preview_content) {
      const cached = PreviewSchema.safeParse(order.preview_content);
      if (cached.success) return { status: "ready", preview: cached.data };
      /* 캐시가 깨져 있으면 아래에서 재생성 시도 */
    }

    /* 원자적 선점: preview_generated_at IS NULL 인 경우에만 */
    const claim = await supabase
      .from("ritual_orders")
      .update({ preview_generated_at: new Date().toISOString() })
      .eq("id", order.id)
      .is("preview_generated_at", null)
      .select("id")
      .maybeSingle();
    if (claim.error) {
      console.error(`[preview] claim_error code=${claim.error.code}`);
      return { status: "server_error" };
    }
    if (!claim.data) {
      /* 다른 요청이 선점함 — 콘텐츠가 이미 생겼는지 재확인 */
      const probe = await supabase
        .from("ritual_orders")
        .select("preview_content")
        .eq("id", order.id)
        .maybeSingle();
      const parsedProbe = PreviewSchema.safeParse(probe.data?.preview_content);
      if (parsedProbe.success)
        return { status: "ready", preview: parsedProbe.data };
      return { status: "pending" };
    }

    /* 선점 성공 → 생성. 실패 시 선점 해제해 재시도 가능하게 */
    const releaseClaim = async () => {
      await supabase
        .from("ritual_orders")
        .update({ preview_generated_at: null })
        .eq("id", order.id)
        .is("preview_content", null);
    };

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      await releaseClaim();
      console.error("[preview] config_missing");
      return { status: "failed" };
    }

    let rawText = "";
    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: getModelId(),
        max_tokens: PREVIEW_MAX_TOKENS,
        system: PREVIEW_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPreviewUserPrompt(order) }],
        output_config: { format: zodOutputFormat(PreviewStructSchema) },
      });
      if (
        message.stop_reason === "max_tokens" ||
        message.stop_reason === "refusal"
      ) {
        await releaseClaim();
        console.error(`[preview] stop_${message.stop_reason}`);
        return { status: "failed" };
      }
      rawText = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    } catch (e) {
      await releaseClaim();
      const code =
        e instanceof Anthropic.APIError ? `api_${e.status}` : "api_error";
      console.error(`[preview] ${code}`);
      return { status: "failed" };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText.trim());
    } catch {
      await releaseClaim();
      console.error("[preview] json_parse_error");
      return { status: "failed" };
    }
    const check = PreviewSchema.safeParse(parsedJson);
    if (!check.success) {
      await releaseClaim();
      console.error("[preview] schema_invalid");
      return { status: "failed" };
    }

    const save = await supabase
      .from("ritual_orders")
      .update({ preview_content: check.data })
      .eq("id", order.id);
    if (save.error) {
      console.error(`[preview] save_failed code=${save.error.code}`);
      /* 저장 실패해도 이번 응답은 정상 반환 (다음 요청은 재생성) */
      await releaseClaim();
    }

    return { status: "ready", preview: check.data };
  } catch {
    console.error("[preview] server_error");
    return { status: "server_error" };
  }
}
