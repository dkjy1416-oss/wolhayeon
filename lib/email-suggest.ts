/**
 * 이메일 입력 UX 순수 헬퍼 (유닛 테스트 대상).
 * 인증번호 기능은 만들지 않는다 — 조합·형식·오타 제안만 담당.
 */

/** 자주 쓰는 도메인 (UI 선택지 순서) */
export const EMAIL_DOMAINS = [
  "naver.com",
  "gmail.com",
  "daum.net",
  "hanmail.net",
  "nate.com",
  "kakao.com",
  "outlook.com",
  "icloud.com",
] as const;

export const CUSTOM_DOMAIN_VALUE = "__custom__";

/** 아이디 정리: 공백 제거 + '@' 이후 제거(중복 @ 방지) */
export function normalizeEmailId(raw: string): string {
  const noSpace = raw.replace(/\s+/g, "");
  const at = noSpace.indexOf("@");
  return at === -1 ? noSpace : noSpace.slice(0, at);
}

/** 도메인 정리: 공백/@ 제거, 소문자화 */
export function normalizeDomain(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/^@+/, "").toLowerCase();
}

/** 아이디+도메인 → 완성 이메일 (기존 DB email 문자열 그대로) */
export function composeEmail(id: string, domain: string): string {
  const cleanId = normalizeEmailId(id);
  const cleanDomain = normalizeDomain(domain);
  if (!cleanId || !cleanDomain) return "";
  return `${cleanId}@${cleanDomain}`;
}

/** 흔한 도메인 오타 → 제안 (자동 변경하지 않고 제안만) */
const TYPO_MAP: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "naver.con": "naver.com",
  "naver.co": "naver.com",
  "naver.cm": "naver.com",
  "navr.com": "naver.com",
  "nave.com": "naver.com",
  "daum.con": "daum.net",
  "daum.com": "daum.net",
  "hanmail.con": "hanmail.net",
  "hanmail.com": "hanmail.net",
  "nate.con": "nate.com",
  "kakao.con": "kakao.com",
  "outlook.con": "outlook.com",
  "icloud.con": "icloud.com",
  "icould.com": "icloud.com",
};

/**
 * 직접입력 도메인에 대한 오타 제안.
 * 반환: 제안 도메인 또는 null(제안 없음).
 */
export function suggestDomainFix(domain: string): string | null {
  const d = normalizeDomain(domain);
  if (!d) return null;
  if (TYPO_MAP[d]) return TYPO_MAP[d];
  // 점(.)이 없는 도메인 — 대표 도메인과 앞부분이 같으면 제안
  if (!d.includes(".")) {
    for (const known of EMAIL_DOMAINS) {
      if (known.startsWith(d) && d.length >= 4) return known;
    }
    return null;
  }
  // 일반 규칙: ○○.con / ○○.cm → ○○.com (위 map에 없는 경우)
  if (/\.(con|cm)$/.test(d)) return d.replace(/\.(con|cm)$/, ".com");
  return null;
}
