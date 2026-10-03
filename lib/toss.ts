/**
 * 토스페이먼츠 결제 승인 (서버 전용).
 *
 * - TOSS_SECRET_KEY는 서버에서만 사용합니다. (server-only 가드로
 *   클라이언트 import 시 빌드 실패)
 * - 시크릿 키 뒤에 ':'을 붙여 base64 인코딩한 Basic 인증 헤더 사용.
 * - 승인 API가 200을 반환해야 실제 결제가 완료된 것입니다.
 * - 테스트 키(test_sk_...)를 사용하면 실제 청구가 발생하지 않습니다.
 */
import "server-only";

const CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

export interface TossConfirmResult {
  ok: boolean;
  /** 성공 시: 구매자가 선택한 결제수단 (예: '카드') */
  method?: string;
  /** 실패 시: 토스 오류 코드 (개인정보 아님, 로그용) */
  code?: string;
  /** 실패 시: 사용자에게 보여줄 수 있는 토스 안내 메시지 */
  message?: string;
  /** 성공 시: 토스가 승인한 주문번호·금액 (우리 주문과 대조용) */
  orderId?: string;
  totalAmount?: number;
}

/** 토스에 실제 결제 상태 조회 (승인 응답을 못 받았을 때 대조용) */
export interface TossPaymentStatus {
  status: string;
  orderId: string | null;
  totalAmount: number | null;
  method: string | null;
}

export async function getTossPayment(paymentKey: string): Promise<TossPaymentStatus | null> {
  if (!paymentKey) return null;
  return tossGet(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}`);
}

/** 주문번호로 토스 결제 조회 (결제 키를 모를 때 — 승인 응답 유실 주문 재확인용) */
export async function getTossPaymentByOrderId(orderId: string): Promise<TossPaymentStatus & { paymentKey: string | null } | null> {
  if (!orderId) return null;
  return tossGet(`https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`);
}

async function tossGet(url: string): Promise<TossPaymentStatus & { paymentKey: string | null } | null> {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!secretKey) return null;
  try {
    const res = await fetch(
      url,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!res.ok) return null;
    const j = (await res.json().catch(() => null)) as {
      status?: string;
      orderId?: string;
      totalAmount?: number;
      method?: string;
      paymentKey?: string;
    } | null;
    if (!j || typeof j.status !== "string") return null;
    return {
      paymentKey: typeof j.paymentKey === "string" ? j.paymentKey : null,
      status: j.status,
      orderId: typeof j.orderId === "string" ? j.orderId : null,
      totalAmount: typeof j.totalAmount === "number" ? j.totalAmount : null,
      method: typeof j.method === "string" ? j.method : null,
    };
  } catch {
    return null;
  }
}

export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!secretKey) {
    return {
      ok: false,
      code: "CONFIG_MISSING",
      message: "결제 설정이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  try {
    const res = await fetch(CONFIRM_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
        /* 같은 결제를 두 번 승인 요청해도 토스가 한 번만 처리 */
        "Idempotency-Key": `confirm-${params.orderId}-${params.amount}-${params.paymentKey}`.slice(0, 300),
      },
      body: JSON.stringify(params),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    const json = (await res.json().catch(() => null)) as {
      status?: string;
      method?: string;
      orderId?: string;
      totalAmount?: number;
      code?: string;
      message?: string;
    } | null;

    if (res.ok) {
      /* 가상계좌 입금 대기 등 "완료(DONE)"가 아닌 승인은 결제 완료로 보지 않음 */
      if (json?.status && json.status !== "DONE") {
        return {
          ok: false,
          code: `STATUS_${json.status}`.slice(0, 60),
          message: "결제가 아직 완료되지 않았어요. 카드나 간편결제로 다시 시도해 주세요.",
        };
      }
      return {
        ok: true,
        method: json?.method,
        orderId: typeof json?.orderId === "string" ? json.orderId : undefined,
        totalAmount: typeof json?.totalAmount === "number" ? json.totalAmount : undefined,
      };
    }
    return {
      ok: false,
      code: json?.code ?? `HTTP_${res.status}`,
      message:
        json?.message ??
        "결제 승인에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  } catch {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: "결제 승인 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
