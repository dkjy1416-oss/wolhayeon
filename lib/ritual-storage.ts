/**
 * 신청서 작성 중 데이터 보관.
 *
 * - sessionStorage만 사용: 탭을 닫으면 자동 삭제되어
 *   민감한 내용이 브라우저에 장기간 남지 않습니다.
 * - localStorage, 쿠키, URL query, analytics로는 절대 보내지 않습니다.
 * - 서버 전송 없음 (Supabase 연결은 다음 단계).
 */
import { RitualApplication, EMPTY_APPLICATION } from "./ritual-types";

const STORAGE_KEY = "wolhayeon_ritual_application_v1";
const STEP_KEY = "wolhayeon_ritual_step_v1";

export function loadApplication(): RitualApplication {
  if (typeof window === "undefined") return { ...EMPTY_APPLICATION };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_APPLICATION };
    const parsed = JSON.parse(raw) as Partial<RitualApplication>;
    // 필드 누락에 대비해 기본값과 병합
    return { ...EMPTY_APPLICATION, ...parsed };
  } catch {
    return { ...EMPTY_APPLICATION };
  }
}

export function saveApplication(data: RitualApplication): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 저장 실패(사생활 모드 등) 시에도 작성은 계속 가능해야 하므로 조용히 무시
  }
}

export function loadStep(): number {
  if (typeof window === "undefined") return -1;
  try {
    const raw = window.sessionStorage.getItem(STEP_KEY);
    const n = raw === null ? -1 : parseInt(raw, 10);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export function saveStep(step: number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STEP_KEY, String(step));
  } catch {
    /* noop */
  }
}

export function clearApplication(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STEP_KEY);
  } catch {
    /* noop */
  }
}

/** 작성된 데이터가 실질적으로 존재하는지 (confirm 페이지 가드용) */
export function hasMeaningfulData(data: RitualApplication): boolean {
  return (
    data.applicant_name.trim() !== "" &&
    data.partner_name.trim() !== "" &&
    data.relationship_type !== ""
  );
}
