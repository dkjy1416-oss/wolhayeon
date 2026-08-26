import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { RESULT_TOKEN_RE, canShowResult } from "@/lib/result-access";
import { RitualResultSchema } from "@/lib/ritual-result-schema";
import ResultHero from "@/components/result/ResultHero";
import LetterSection from "@/components/result/LetterSection";
import ReadingSection from "@/components/result/ReadingSection";
import RitualSection from "@/components/result/RitualSection";
import GuideSection from "@/components/result/GuideSection";
import TwentyOneDayJourney from "@/components/result/TwentyOneDayJourney";
import JournalSection from "@/components/result/JournalSection";
import ResultFooter from "@/components/result/ResultFooter";

/** 항상 동적 서버 조회 — 정적 생성/공용 캐시 금지 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 모든 실패 사유(토큰 오류/승인 전/미결제/검수 전/검증 실패)를
 * 완전히 동일한 화면으로 처리 — 내부 상태를 외부에 노출하지 않음.
 */
function NotAvailable() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs tracking-[0.35em] text-gold/80">월하연 月下緣</p>
      <h1 className="font-display mt-6 text-xl leading-relaxed text-ivory">
        결과를 찾을 수 없습니다.
      </h1>
      <p className="mt-4 text-[0.85rem] font-light leading-[1.9] text-ivory-dim">
        주소가 정확한지 다시 확인해주세요.
      </p>
      <Link
        href="/"
        className="mt-9 inline-flex h-12 items-center justify-center rounded-full border border-gold-dim/40 px-8 text-sm text-ivory"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  /* 토큰 형식이 아니면 DB 조회 없이 동일 화면 */
  if (typeof token !== "string" || !RESULT_TOKEN_RE.test(token)) {
    return <NotAvailable />;
  }

  let name = "";
  let content: ReturnType<typeof RitualResultSchema.safeParse>["data"] | null =
    null;

  try {
    const supabase = getSupabaseAdmin();

    /* 조회만 수행 — 어떤 컬럼도 수정하지 않음 (delivery/approved/reviewed 불변) */
    const r = await supabase
      .from("ritual_results")
      .select("order_id, approved_at, reviewed_content")
      .eq("result_token", token)
      .maybeSingle();
    if (r.error || !r.data) return <NotAvailable />;

    const o = await supabase
      .from("ritual_orders")
      .select("applicant_name, payment_status, generation_status, review_status")
      .eq("id", r.data.order_id)
      .maybeSingle();
    if (o.error || !o.data) return <NotAvailable />;

    /* 공개 조건 판정 (하나라도 실패 시 동일 화면) */
    if (!canShowResult(r.data, o.data)) return <NotAvailable />;

    /* 고객 제공본은 reviewed_content 하나뿐 — generated_content 폴백 금지 */
    const parsed = RitualResultSchema.safeParse(r.data.reviewed_content);
    if (!parsed.success) {
      // 승인본 파손: 사유는 로그 코드로만 (토큰/콘텐츠 미기록)
      console.error("[result] approved_content_invalid");
      return <NotAvailable />;
    }

    name = o.data.applicant_name;
    content = parsed.data;
  } catch {
    console.error("[result] lookup_failed");
    return <NotAvailable />;
  }

  if (!content) return <NotAvailable />;
  const c = content;

  return (
    <main id="top" className="min-h-[100svh] bg-ink">
      <ResultHero name={name} />

      {/* 01 · 14와 같은 번호는 표시용 우리말 제목 — 개발 key는 절대 노출하지 않음 */}
      <div id="letters" className="scroll-mt-6">
        <LetterSection
          no="하나"
          title={c.part_01_letter.title}
          content={c.part_01_letter.content}
        />
      </div>

      <div id="reading" className="mt-4 scroll-mt-6">
        <ReadingSection
          no="둘 · 두 사람의 관계 이야기"
          title={c.part_02_relationship_story.title}
          content={c.part_02_relationship_story.content}
        />
        <ReadingSection
          no="셋 · 지금 내 마음 들여다보기"
          title={c.part_03_current_emotion.title}
          content={c.part_03_current_emotion.content}
        />
        <ReadingSection
          no="넷 · 반복되어 온 흐름"
          title={c.part_04_repeated_pattern.title}
          content={c.part_04_repeated_pattern.content}
        />
        <ReadingSection
          no="다섯 · 내가 정말 원하는 것"
          title={c.part_05_true_wish.title}
          content={c.part_05_true_wish.content}
        />
        <ReadingSection
          no="여섯 · 지금 내가 할 수 있는 것"
          title={c.part_06_controllable_now.title}
          content={c.part_06_controllable_now.content}
        />
      </div>

      <RitualSection
        ritual={c.part_07_ritual}
        items={c.part_08_preparation.items}
        steps={c.part_09_ritual_steps.steps}
        lines={c.part_10_personal_words.lines}
      />

      <GuideSection
        hours24={c.part_11_24h_guide.items}
        days7={c.part_12_7day_guide.items}
      />

      <TwentyOneDayJourney days={c.part_13_21day_plan.days} />

      <LetterSection
        no="마지막"
        title={c.part_14_final_letter.title}
        content={c.part_14_final_letter.content}
      />

      <JournalSection
        title={c.bonus_journal_questions.title}
        intro={c.bonus_journal_questions.intro}
        questions={c.bonus_journal_questions.questions}
      />

      <ResultFooter />
    </main>
  );
}
