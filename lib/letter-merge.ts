/**
 * 결제 전 미리보기로 이미 보여준 "첫 편지 서두"를
 * 결제 후 생성된 첫 편지 본문 앞에 정확히 결합 (순수 함수, 유닛 테스트 대상).
 *
 * 안전 원칙
 *  - 서두는 항상 그대로 앞에 붙인다. 최종 출력은 반드시
 *    preview_letter_excerpt 문장들을 순서·내용 그대로 합친 문자열로 시작한다.
 *  - AI 본문 앞부분이 서두를 "확실하게"(공백/줄바꿈 차이만 무시하고 문장
 *    단위로 완전 일치) 반복한 경우에만 그 부분을 제거한다.
 *  - 제거 위치는 정규화 문자열 길이가 아니라, 원문 문자 인덱스 매핑으로
 *    계산한다 — 글자 중간이 잘리는 일이 없다.
 *  - 부분 일치·애매한 일치면 아무것도 잘라내지 않는다.
 *    (데이터 손실보다 드문 중복이 더 안전)
 */

/** 공백 정규화 문자열과, 정규화 인덱스 → 원문 인덱스 매핑을 함께 생성 */
function normalizeWithMap(s: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let prevSpace = true; // 선행 공백 제거 효과
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      if (!prevSpace) {
        norm += " ";
        map.push(i);
        prevSpace = true;
      }
    } else {
      norm += ch;
      map.push(i);
      prevSpace = false;
    }
  }
  return { norm, map };
}

function normLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function mergeLetterOpening(
  excerpt: string[] | null | undefined,
  aiContent: string
): string {
  if (!excerpt || excerpt.length === 0) return aiContent;
  const opening = excerpt.map((l) => l.trim()).filter(Boolean);
  if (opening.length === 0) return aiContent;
  const joined = opening.join(" ");

  const original = aiContent.trim();
  const { norm, map } = normalizeWithMap(original);

  /* AI 본문 앞부분에서 서두 문장이 순서대로 "완전 일치"로 반복된 만큼만 계산 */
  let normPos = 0; // norm 상의 진행 위치
  let cutNormEnd = 0; // 마지막으로 완전 일치한 문장의 norm 끝 위치
  for (const line of opening) {
    const target = normLine(line);
    if (target.length === 0) continue;
    /* 문장 사이 공백 1칸 허용 */
    let pos = normPos;
    if (norm[pos] === " ") pos += 1;
    if (norm.startsWith(target, pos)) {
      normPos = pos + target.length;
      cutNormEnd = normPos;
    } else {
      break; // 첫 불일치 문장에서 중단 — 그 이후는 자르지 않음
    }
  }

  let rest = original;
  if (cutNormEnd > 0) {
    /* 정규화 인덱스 → 원문 인덱스로 변환해 문자 경계에서만 절단 */
    const lastOrigIdx = map[cutNormEnd - 1];
    rest = original.slice(lastOrigIdx + 1).replace(/^\s+/, "");
  }

  return rest.length > 0 ? `${joined}\n\n${rest}` : joined;
}
