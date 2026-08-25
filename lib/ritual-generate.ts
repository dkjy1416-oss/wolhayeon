/**
 * 리추얼 생성 오케스트레이션 (서버 전용).
 *
 * 흐름: 조건 확인 → 원자적 선점(generating) → Claude 호출 →
 *       JSON 검증 → ritual_results 저장 → 주문 상태 generated.
 *
 * 보호 장치
 *  - 결제 완료(paid) + generation_status waiting(또는 이전 실패 failed)
 *    + review_status waiting 인 주문만 생성.
 *  - 선점은 조건부 UPDATE 1회로 수행 → 동시에 두 요청이 와도
 *    한쪽만 선점에 성공 (중복 생성·중복 비용 차단).
 *  - 이미 generated면 재생성하지 않음 (1주문 1회).
 *  - 실패 시 generation_status = failed (개인정보 없는 코드 로그만).
 */
import "server-only";
import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { WOLHWA_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/wolhwa-prompt";
import {
  parseRitualResult,
  RitualResultStructSchema,
} from "@/lib/ritual-result-schema";
import type { RitualOrderRow } from "@/lib/supabase/types";

/** 모델 ID는 이 한 곳에서만 관리.
 *  ANTHROPIC_MODEL 환경변수가 있으면 그 값을, 없으면 현재
 *  Claude API의 Sonnet 모델(claude-sonnet-4-6)을 사용. */
const DEFAULT_MODEL = "claude-sonnet-4-6";
export function getModelId(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

/** 15개 파트 한국어 결과는 8천 토큰을 넘을 수 있어 여유 있게 설정.
 *  (1차 실패 원인: 8192에서 출력이 잘려 JSON이 중간에 끊김) */
const MAX_OUTPUT_TOKENS = 20000;

export type GenerateOutcome =
  | { status: "success"; orderNumber: string; resultVersion: number }
  | { status: "not_found" }
  | { status: "not_paid" }
  | { status: "already_generated" }
  | { status: "already_generating" }
  | { status: "not_reviewable" }
  | { status: "generation_failed"; code: string }
  | { status: "server_error" };

export async function generateRitualForOrder(
  orderNumber: string
): Promise<GenerateOutcome> {
  const requestId = randomUUID().slice(0, 8);

  try {
    const supabase = getSupabaseAdmin();

    /* 1) 원자적 선점: 조건을 모두 만족하는 경우에만 generating으로 전환.
          (이전 시도가 failed였던 주문은 재시도 허용) */
    const claim = await supabase
      .from("ritual_orders")
      .update({ generation_status: "generating" })
      .eq("order_number", orderNumber)
      .eq("payment_status", "paid")
      .in("generation_status", ["waiting", "failed"])
      .eq("review_status", "waiting")
      .select("*")
      .maybeSingle();

    if (claim.error) {
      console.error(`[gen:${requestId}] claim_error code=${claim.error.code}`);
      return { status: "server_error" };
    }

    /* 선점 실패 → 이유 진단 (상태만 조회, 개인정보 미사용) */
    if (!claim.data) {
      const probe = await supabase
        .from("ritual_orders")
        .select("payment_status, generation_status, review_status")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (probe.error || !probe.data) return { status: "not_found" };
      const p = probe.data;
      if (p.payment_status !== "paid") return { status: "not_paid" };
      if (p.generation_status === "generating")
        return { status: "already_generating" };
      if (p.generation_status === "generated")
        return { status: "already_generated" };
      if (p.review_status !== "waiting") return { status: "not_reviewable" };
      return { status: "server_error" };
    }

    const order = claim.data as RitualOrderRow & { id: string };

    /* 선점 이후의 모든 실패는 failed로 되돌린다 */
    const markFailed = async (code: string) => {
      console.error(`[gen:${requestId}] failed code=${code}`);
      await supabase
        .from("ritual_orders")
        .update({ generation_status: "failed" })
        .eq("id", order.id)
        .eq("generation_status", "generating");
    };

    /* 2) Claude 호출 */
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      await markFailed("anthropic_key_missing");
      return { status: "generation_failed", code: "config_missing" };
    }

    let rawText = "";
    try {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: getModelId(),
        max_tokens: MAX_OUTPUT_TOKENS,
        system: WOLHWA_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(order) }],
        /* Anthropic 공식 구조화 출력: 모델이 이 JSON schema에 맞는
           JSON만 생성하도록 API 차원에서 강제.
           → 코드펜스·설명문·앞뒤 문장·깨진 JSON이 발생하지 않음 */
        output_config: {
          format: zodOutputFormat(RitualResultStructSchema),
        },
      });

      /* 출력이 잘렸거나 모델이 거부한 경우를 명확히 구분 */
      if (message.stop_reason === "max_tokens") {
        await markFailed("output_truncated");
        return { status: "generation_failed", code: "output_truncated" };
      }
      if (message.stop_reason === "refusal") {
        await markFailed("model_refusal");
        return { status: "generation_failed", code: "model_refusal" };
      }

      rawText = message.content
        .filter(
          (block): block is Anthropic.TextBlock => block.type === "text"
        )
        .map((block) => block.text)
        .join("");
    } catch (e) {
      const code =
        e instanceof Anthropic.APIError ? `api_${e.status}` : "api_error";
      await markFailed(code);
      return { status: "generation_failed", code };
    }

    /* 3) JSON 구조 검증 — 잘못된 JSON은 저장하지 않음 */
    const parsed = parseRitualResult(rawText);
    if (!parsed.ok) {
      await markFailed(`validation_${parsed.reason}`);
      return { status: "generation_failed", code: "invalid_result" };
    }

    /* 4) 다음 result_version 계산 후 저장 (order_id+version unique가 경합 보호) */
    const latest = await supabase
      .from("ritual_results")
      .select("result_version")
      .eq("order_id", order.id)
      .order("result_version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (latest.data?.result_version ?? 0) + 1;

    const inserted = await supabase
      .from("ritual_results")
      .insert({
        order_id: order.id,
        result_version: nextVersion,
        generated_content: parsed.data,
        generated_at: new Date().toISOString(),
      })
      .select("result_version")
      .single();

    if (inserted.error) {
      await markFailed(`db_insert_${inserted.error.code}`);
      return { status: "generation_failed", code: "db_insert_failed" };
    }

    /* 5) 주문 상태: generated / 검수 대기 유지 (approved 아님) */
    const upd = await supabase
      .from("ritual_orders")
      .update({ generation_status: "generated", review_status: "waiting" })
      .eq("id", order.id)
      .eq("generation_status", "generating");
    if (upd.error) {
      console.error(`[gen:${requestId}] status_update code=${upd.error.code}`);
    }

    return {
      status: "success",
      orderNumber,
      resultVersion: inserted.data.result_version,
    };
  } catch {
    console.error(`[gen:${requestId}] server_error`);
    return { status: "server_error" };
  }
}
