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
import {
  WOLHWA_SYSTEM_PROMPT,
  buildCoreUserPrompt,
  buildActionUserPrompt,
  buildJourneyUserPrompt,
  buildPlaybookUserPrompt,
} from "@/lib/wolhwa-prompt";
import { z } from "zod";
import type { CoreKey } from "@/lib/wolhwa-prompt";
import {
  parseRitualResultObject,
  normalizeRitualPartial,
  containsDevKeys,
  RitualCoreStructSchema,
  RitualActionStructSchema,
  RitualJourneyStructSchema,
  RitualPlaybookStructSchema,
  RitualResultSchema,
} from "@/lib/ritual-result-schema";
import { PreviewCoreSchema } from "@/lib/ritual-preview-schema";
import { mergeLetterOpening } from "@/lib/letter-merge";
import type { RitualOrderRow } from "@/lib/supabase/types";
import { sendOpsAlert } from "@/lib/ops-alert";
import { fallbackForGroup } from "@/lib/ritual-fallback";

/** 모델 ID는 이 한 곳에서만 관리.
 *  ANTHROPIC_MODEL 환경변수가 있으면 그 값을, 없으면 현재
 *  Claude API의 Sonnet 모델(claude-sonnet-4-6)을 사용. */
const DEFAULT_MODEL = "claude-sonnet-4-6";
export function getModelId(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

/** 15개 파트 한국어 결과는 8천 토큰을 넘을 수 있어 여유 있게 설정.
 *  (1차 실패 원인: 8192에서 출력이 잘려 JSON이 중간에 끊김) */
/* 병렬 두 호출의 그룹별 출력 상한.
   기존 전체 결과가 한 호출 약 10~14k 토큰이었고 각 그룹은 그 절반 수준이라
   9000이면 JSON 절단 없이 충분한 여유 (stop_reason=max_tokens 시 실패 처리). */
const ACTION_MAX_TOKENS = 8000;
const JOURNEY_MAX_TOKENS = 9000;

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

    /* 결제 전 미리보기에서 고객이 이미 본 첫 편지 서두 (정상 구조일 때만 사용) */
    const previewParsed = PreviewCoreSchema.safeParse(order.preview_content);
    const letterOpening = previewParsed.success
      ? previewParsed.data.preview_letter_excerpt
      : null;
    const introLines = previewParsed.success
      ? previewParsed.data.intro_lines
      : null;

    /* 선점 이후의 모든 실패는 failed로 되돌린다 */
    const markFailed = async (code: string) => {
      console.error(`[gen:${requestId}] failed code=${code}`);
      await sendOpsAlert("generation_failed", { orderNumber, code });
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

    /* 2-b) 6-way 병렬 생성.
       관계/감정 핵심을 4개 호출로 쪼개고(편지·관계 / 마음·패턴 / 원하는 것·연락 전략 /
       리추얼·마지막 편지) 실행 가이드·21일 여정과 함께 동시에 만든다.
       - 가장 긴 호출의 길이가 곧 대기시간 → 잘게 나눌수록 빨라진다.
       - 각 그룹은 '그 그룹 스키마'로 바로 검증하고, 어긋나면 그 그룹만 다시 만든다
         (최대 3회). 한 파트가 비었다고 전체 결과를 버리지 않는다. */
    const genStartedAt = Date.now();
    /* 서버 실행 한도 300초 — 결과 저장·자동 승인·메일까지 끝내려면 AI 작성은 200초 안에 마무리.
       SDK 자체 재시도는 끄고(시간 계산이 어긋남) 아래에서 남은 시간 안에서만 다시 시도한다. */
    const GEN_DEADLINE = genStartedAt + 200_000;
    const remaining = () => GEN_DEADLINE - Date.now();
    const client = new Anthropic({ apiKey, timeout: 110_000, maxRetries: 0 });

    type Group = {
      label: string;
      prompt: string;
      struct: z.ZodTypeAny;
      check: z.ZodTypeAny;
      maxTokens: number;
    };
    const corePick = (keys: CoreKey[]) =>
      Object.fromEntries(keys.map((k) => [k, true])) as Record<CoreKey, true>;
    const coreGroup = (label: string, keys: CoreKey[], maxTokens: number): Group => ({
      label,
      prompt: buildCoreUserPrompt(order, letterOpening, introLines, keys),
      struct: RitualCoreStructSchema.pick(corePick(keys)),
      check: RitualResultSchema.pick(corePick(keys)),
      maxTokens,
    });
    const groups: Group[] = [
      coreGroup("core_a", ["part_01_letter", "part_02_relationship_story"], 8000),
      coreGroup("core_b", ["part_03_current_emotion", "part_04_repeated_pattern"], 8000),
      coreGroup("core_c", ["part_05_true_wish", "part_06_controllable_now"], 8000),
      coreGroup("core_d", ["part_07_ritual", "part_14_final_letter"], 6000),
      /* 실행 가이드는 둘로 나눠 만든다 — 한 번에 만들면 길이 한도(토큰)를 넘겨 잘리는 일이 있었음 */
      {
        label: "action_a",
        prompt: buildActionUserPrompt(order, introLines, [
          "part_08_preparation",
          "part_09_ritual_steps",
          "part_10_personal_words",
        ]),
        struct: RitualActionStructSchema.pick({
          part_08_preparation: true,
          part_09_ritual_steps: true,
          part_10_personal_words: true,
        }),
        check: RitualResultSchema.pick({
          part_08_preparation: true,
          part_09_ritual_steps: true,
          part_10_personal_words: true,
        }),
        maxTokens: ACTION_MAX_TOKENS,
      },
      {
        label: "action_b",
        prompt: buildActionUserPrompt(order, introLines, [
          "part_11_24h_guide",
          "part_12_7day_guide",
          "bonus_journal_questions",
        ]),
        struct: RitualActionStructSchema.pick({
          part_11_24h_guide: true,
          part_12_7day_guide: true,
          bonus_journal_questions: true,
        }),
        check: RitualResultSchema.pick({
          part_11_24h_guide: true,
          part_12_7day_guide: true,
          bonus_journal_questions: true,
        }),
        maxTokens: ACTION_MAX_TOKENS,
      },
      {
        label: "journey",
        prompt: buildJourneyUserPrompt(order, introLines),
        struct: RitualJourneyStructSchema,
        check: RitualResultSchema.pick({ part_13_21day_plan: true }),
        maxTokens: JOURNEY_MAX_TOKENS,
      },
    ];

    const MAX_ATTEMPTS = 3;
    const fallbackUsed: string[] = [];
    const runGroup = async (g: Group): Promise<Record<string, unknown>> => {
      let lastCode = "unknown";
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        /* 남은 시간 안에서만 시도 — 다시 시도는 최소 45초가 남았을 때만 */
        const left = remaining();
        if (left < (attempt === 1 ? 15_000 : 45_000)) break;
        const t0 = Date.now();
        try {
          const message = await client.messages.create(
            {
              model: getModelId(),
              max_tokens: g.maxTokens,
              system: WOLHWA_SYSTEM_PROMPT,
              messages: [
                {
                  role: "user",
                  /* 직전 시도가 길이 한도로 잘렸으면 더 짧게 쓰도록 안내 */
                  content: lastCode.startsWith("output_truncated")
                    ? `${g.prompt}\n\n[중요] 직전 작성이 길이 한도를 넘어 잘렸습니다. 개수는 최소 기준만 채우고, 모든 문장을 절반 길이로 짧게 쓰세요.`
                    : g.prompt,
                },
              ],
              /* 구조화 출력: 그룹 스키마에 맞는 JSON만 생성하도록 API 차원 강제 */
              output_config: { format: zodOutputFormat(g.struct as never) },
            },
            { timeout: Math.min(110_000, left) }
          );
          if (message.stop_reason === "max_tokens") {
            lastCode = `output_truncated_${g.label}`;
          } else if (message.stop_reason === "refusal") {
            lastCode = `model_refusal_${g.label}`;
          } else {
            const text = message.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
            let json: unknown;
            try {
              json = JSON.parse(text.trim());
            } catch {
              json = null;
            }
            if (!json) {
              lastCode = `json_parse_${g.label}`;
            } else {
              const normalized = normalizeRitualPartial(json);
              const ok = g.check.safeParse(normalized);
              if (ok.success && !containsDevKeys(ok.data)) {
                console.error(`[perf] ${g.label}_ms=${Date.now() - t0} attempt=${attempt}`);
                return ok.data as Record<string, unknown>;
              }
              lastCode = ok.success
                ? `dev_key_leak_${g.label}`
                : `schema_invalid:${ok.error.issues
                    .slice(0, 4)
                    .map((i) => i.path.join("."))
                    .join(",")}`;
            }
          }
        } catch (e) {
          lastCode =
            e instanceof Anthropic.APIError ? `api_${e.status}_${g.label}` : `api_error_${g.label}`;
          /* AI 서버 혼잡(429·529·5xx)이면 잠깐 쉬었다가 다시 */
          if (e instanceof Anthropic.APIError && (e.status === 429 || (e.status ?? 0) >= 500)) {
            await new Promise((r) => setTimeout(r, Math.min(5_000, Math.max(0, remaining() - 45_000))));
          }
        }
        console.error(`[gen:${requestId}] retry ${g.label} attempt=${attempt} code=${lastCode}`);
      }
      /* 3번 모두 실패 — 실전 노트(선택)는 건너뛰고, 필수 그룹은 기본 원고로 채운다.
         (결제한 손님의 결과가 '생성 실패'로 멈추지 않게) */
      if (g.label !== "playbook") {
        const fb = g.check.safeParse(normalizeRitualPartial(fallbackForGroup(g.label, order)));
        if (fb.success) {
          console.error(`[gen:${requestId}] fallback_used ${g.label} last=${lastCode}`);
          fallbackUsed.push(`${g.label}(${lastCode})`);
          return fb.data as Record<string, unknown>;
        }
      }
      throw { code: lastCode };
    };

    /* 선택 그룹 — 실전 노트. 실패해도 결과 전체는 그대로 진행 */
    const playbookGroup: Group = {
      label: "playbook",
      prompt: buildPlaybookUserPrompt(order, introLines),
      struct: RitualPlaybookStructSchema,
      check: RitualResultSchema.pick({ bonus_playbook: true }).required(),
      maxTokens: 7000,
    };
    const playbookPromise = runGroup(playbookGroup).catch((e) => {
      console.error(`[gen:${requestId}] playbook_skipped code=${(e as { code?: string })?.code ?? "unknown"}`);
      return {} as Record<string, unknown>;
    });

    let merged: Record<string, unknown> = {};
    try {
      const parts = await Promise.all(groups.map(runGroup));
      /* 실전 노트(선택)가 늦으면 기다리지 않고 나머지로 결과를 연다 */
      const playbook = await Promise.race([
        playbookPromise,
        new Promise<Record<string, unknown>>((r) =>
          setTimeout(() => r({}), Math.max(0, remaining() + 5_000))
        ),
      ]);
      merged = Object.assign({}, ...parts, playbook);
    } catch (e) {
      /* 3회 재시도 후에도 실패한 그룹이 있을 때만 failed 처리 */
      const thrownCode = (e as { code?: string })?.code;
      const code = typeof thrownCode === "string" ? thrownCode : "api_error";
      await markFailed(code.startsWith("schema_invalid") ? `validation_${code}` : code);
      return { status: "generation_failed", code };
    }

    if (fallbackUsed.length > 0) {
      await sendOpsAlert("process_error", {
        orderNumber,
        code: `fallback_used:${fallbackUsed.join(",")}`.slice(0, 80),
        level: "info",
        detail:
          "AI가 일부 파트를 3번 모두 만들지 못해 기본 원고로 채워 결과를 열었습니다. 손님은 결과를 정상적으로 받았습니다. 필요하면 검수 화면에서 해당 파트를 다듬어 주세요.",
      });
    }

    /* 3) 그룹 병합 후 전체 구조 검증 — 실패 시 부분 저장 없이 failed */
    const mergeStartedAt = Date.now();
    const parsed = parseRitualResultObject(merged);
    if (!parsed.ok) {
      await markFailed(`validation_${parsed.reason}`);
      return { status: "generation_failed", code: "invalid_result" };
    }

    /* 3-b) 미리보기 서두를 첫 편지 맨 앞에 정확히 결합 (중복 방지 포함).
       결합 후 최종 구조를 한 번 더 전체 검증 — 실패 시 DB 저장 금지 */
    if (letterOpening) {
      const originalLetter = parsed.data.part_01_letter.content;
      parsed.data.part_01_letter.content = mergeLetterOpening(
        letterOpening,
        parsed.data.part_01_letter.content
      );
      const finalCheck = RitualResultSchema.safeParse(parsed.data);
      if (finalCheck.success) {
        parsed.data = finalCheck.data;
      } else {
        /* 서두 결합이 어긋나면 결합 없이 원문 편지로 진행 (실패 처리하지 않음) */
        console.error(`[gen:${requestId}] merged_letter_invalid — 결합 생략`);
        parsed.data.part_01_letter.content = originalLetter;
      }
    }
    console.error(`[perf] merge_validation_ms=${Date.now() - mergeStartedAt}`);
    /* 병렬 호출 → parse → merge → 스키마 검증 → 서두 결합까지 완료 시점 */
    console.error(`[perf] generation_total_ms=${Date.now() - genStartedAt}`);

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
    for (let i = 0; i < 3; i++) {
      const upd = await supabase
        .from("ritual_orders")
        .update({ generation_status: "generated", review_status: "waiting" })
        .eq("id", order.id)
        .eq("generation_status", "generating");
      if (!upd.error) break;
      console.error(`[gen:${requestId}] status_update code=${upd.error.code} try=${i + 1}`);
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
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
