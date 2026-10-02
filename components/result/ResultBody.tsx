import Link from "next/link";
import LetterSection from "@/components/result/LetterSection";
import ReadingSection from "@/components/result/ReadingSection";
import RitualSection from "@/components/result/RitualSection";
import GuideSection from "@/components/result/GuideSection";
import TwentyOneDayJourney from "@/components/result/TwentyOneDayJourney";
import JournalSection from "@/components/result/JournalSection";
import ResultFooter from "@/components/result/ResultFooter";
import ResultOpenTracker from "@/components/result/ResultOpenTracker";
import ResultVideoHero from "@/components/result/ResultVideoHero";
import SummaryCard from "@/components/result/SummaryCard";
import PlaybookSection from "@/components/result/PlaybookSection";
import BookShelf from "@/components/result/BookShelf";
import SceneBreak from "@/components/apply/SceneBreak";
import type { RitualResult } from "@/lib/ritual-result-schema";

/** 결과 페이지 본문 (서버 렌더) — 데이터 조회는 app/result/[token]/page.tsx */
export default function ResultBody({
  token,
  name,
  viewPeriodLine,
  c,
  hasBook,
  maskedEmail,
  summary,
  reviewHref,
}: {
  token: string;
  name: string;
  viewPeriodLine: string;
  c: RitualResult;
  hasBook: boolean;
  maskedEmail: string | null;
  summary: React.ComponentProps<typeof SummaryCard> | null;
  reviewHref: string | null;
}) {
  const pb = c.bonus_playbook;
  const toc = [
    { href: "#letters", label: "첫 편지" },
    { href: "#reading", label: "관계 읽기" },
    { href: "#strategy", label: "연락 전략" },
    ...(pb ? [{ href: "#playbook", label: "실전 노트" }] : []),
    { href: "#ritual", label: "리추얼" },
    { href: "#journey", label: "21일" },
    { href: "#book", label: hasBook ? "내 책 받기" : "책" },
  ];

  return (
    <main id="top" className="min-h-[100svh] bg-ink">
      <ResultOpenTracker token={token} />
      <ResultVideoHero name={name} toc={toc} />
      <p className="px-6 pb-5 text-center text-[0.7rem] font-light tracking-wide text-ivory-dim/70">
        {viewPeriodLine}
      </p>

      {summary && <SummaryCard {...summary} />}
      {hasBook && <BookShelf token={token} hasBook maskedEmail={maskedEmail} />}

      {/* 번호는 표시용 우리말 제목 — 개발 key는 절대 노출하지 않음 */}
      <div id="letters" className="scroll-mt-6">
        <LetterSection no="하나" title={c.part_01_letter.title} content={c.part_01_letter.content} />
      </div>

      <SceneBreak
        video="/book/v3/w-thread.mp4"
        poster="/book/v3/w-thread.webp"
        eyebrow="관계 읽기"
        aspect="aspect-[4/5]"
        line={"이제, 두 사람 사이에 남은 것을\n천천히 읽어 볼게요."}
      />
      <div id="reading" className="scroll-mt-6">
        <ReadingSection no="둘 · 두 사람의 관계 이야기" title={c.part_02_relationship_story.title} content={c.part_02_relationship_story.content} />
        <ReadingSection no="셋 · 지금 내 마음 들여다보기" title={c.part_03_current_emotion.title} content={c.part_03_current_emotion.content} />
      </div>

      <SceneBreak
        video="/book/v3/night.mp4"
        poster="/book/v3/night.webp"
        eyebrow="반복된 흐름"
        aspect="aspect-[4/5]"
        line={"같은 자리에서 또 넘어지지 않게,\n흐름부터 봐요."}
      />
      <ReadingSection no="넷 · 반복되어 온 흐름" title={c.part_04_repeated_pattern.title} content={c.part_04_repeated_pattern.content} />
      <ReadingSection no="다섯 · 내가 정말 원하는 것" title={c.part_05_true_wish.title} content={c.part_05_true_wish.content} />

      <SceneBreak
        video="/book/v3/w-phone.mp4"
        poster="/book/v3/w-phone.webp"
        eyebrow="연락 전략"
        aspect="aspect-[4/5]"
        line={"그래서, 언제 · 어떤 말로.\n지금 할 수 있는 것."}
      />
      <ReadingSection
        id="strategy"
        highlight
        no="여섯 · 지금 내가 할 수 있는 것"
        title={c.part_06_controllable_now.title}
        content={c.part_06_controllable_now.content}
      />

      {pb && (
        <>
          <SceneBreak
            aspect="aspect-[4/5]"
            video="/book/v3/w-mirror.mp4"
            poster="/book/v3/w-mirror.webp"
            eyebrow="실전 노트"
        line={"답장이 오면, 안 오면.\n그 순간에 꺼내 보세요."}
          />
          <PlaybookSection
            title={pb.scenes_title}
            intro={pb.scenes_intro}
            scenes={pb.scenes}
            good={pb.signals_good}
            caution={pb.signals_caution}
            sos={pb.sos_cards}
          />
        </>
      )}

      <SceneBreak
        video="/book/v3/w-cups.mp4"
        poster="/book/v3/w-cups.webp"
        eyebrow="붉은 실 리추얼"
        aspect="aspect-[4/5]"
        line={"흔들리는 밤마다 5분,\n마음을 제자리에 두는 시간."}
      />
      <RitualSection
        ritual={c.part_07_ritual}
        items={c.part_08_preparation.items}
        steps={c.part_09_ritual_steps.steps}
        lines={c.part_10_personal_words.lines}
      />

      <GuideSection hours24={c.part_11_24h_guide.items} days7={c.part_12_7day_guide.items} />

      <SceneBreak
        video="/book/v3/bed.mp4"
        poster="/book/v3/bed.webp"
        eyebrow="스물하나의 밤"
        aspect="aspect-[4/5]"
        line={"혼자 버티는 밤이 아니라,\n하루씩 채워 가는 21일."}
      />
      <TwentyOneDayJourney days={c.part_13_21day_plan.days} />

      <SceneBreak
        video="/book/v3/w-final.mp4"
        poster="/book/v3/w-final.webp"
        eyebrow="마지막 편지"
        aspect="aspect-[4/5]"
        line={"끝까지 읽어 준 당신에게."}
      />
      <LetterSection no="마지막" title={c.part_14_final_letter.title} content={c.part_14_final_letter.content} />

      <JournalSection
        title={c.bonus_journal_questions.title}
        intro={c.bonus_journal_questions.intro}
        questions={c.bonus_journal_questions.questions}
      />

      {!hasBook && <BookShelf token={token} hasBook={false} maskedEmail={maskedEmail} />}

      {reviewHref && (
        <section className="mx-auto max-w-md px-6 pb-4 pt-10 text-center">
          <p className="text-[0.84rem] font-light leading-[1.95] text-ivory-dim">
            읽어 보시고, 월화에게 한마디 남겨 주시겠어요?
            <br />
            좋았던 점도 아쉬웠던 점도 그대로 들려주세요.
          </p>
          <Link
            href={reviewHref}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-gold/40 px-6 text-[0.84rem] text-gold"
          >
            후기 남기기
          </Link>
        </section>
      )}

      <ResultFooter />
    </main>
  );
}
