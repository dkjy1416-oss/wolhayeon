import "server-only";

/**
 * Supabase(PostgREST)는 한 번에 최대 1,000행만 돌려준다.
 * `.limit(50000)`을 걸어도 1,000행에서 잘리므로, 통계처럼 많은 행이 필요한 곳은
 * 1,000행씩 끊어서 끝까지 읽는다. (예: 10/9 방문 기록 3,895행 중 1,000행만 읽혀 오늘 방문자가 0으로 보였음)
 *
 * make(from, to) 는 같은 조건의 쿼리에 .order("id").range(from, to) 를 붙여 돌려줘야 한다.
 */
export async function fetchAll<T>(
  make: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  max = 60_000
): Promise<{ data: T[]; error: unknown }> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const { data, error } = await make(from, from + PAGE - 1);
    if (error) return { data: out, error };
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { data: out, error: null };
}
