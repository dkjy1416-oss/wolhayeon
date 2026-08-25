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
      },
      body: JSON.stringify(params),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as {
      method?: string;
      code?: string;
      message?: string;
    } | null;

    if (res.ok) {
      return { ok: true, method: json?.method };
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
