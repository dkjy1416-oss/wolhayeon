/**
 * 영상 한 개 → 채널별 캡션 자동 작성 (Claude).
 * 채널마다 다른 추적 링크(utm_source=채널, utm_content=게시물 id)를 붙여
 * 관리자 마케팅 화면에서 채널·게시물별 유입이 따로 보이게 합니다.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getModelId } from "@/lib/ritual-generate";
import type { Captions } from "@/lib/social/store";

const SITE = "https://thewolha.com/";

export function trackedLink(source: string, postId: string, campaign = "auto"): string {
  return `${SITE}?utm_source=${source}&utm_campaign=${campaign}&utm_content=${postId}`;
}

const SYSTEM = `너는 "월하연 月下緣"의 SNS 담당자야. 월하연은 헤어진 뒤 잠 못 드는 사람의 이별·재회·연락 고민 사연을 끝까지 읽고 편지로 답해주는 서비스(thewolha.com, 미리보기 무료)야.
짧은 연애·이별 숏폼 영상 하나에 대해 채널별 글을 써. 목표는 조회수·공감·댓글·저장.

공통 규칙
- 첫 줄은 스크롤을 멈추게 하는 훅(공감되는 상황/질문). 20자 안팎.
- 반말 섞인 친근한 말투, 이모지는 1~3개만. 과장·허위 금지: 후기·사용자 수·효과 보장·전문 상담사 표현 절대 쓰지 마.
- 댓글을 부르는 질문을 넣어.
- 해시태그는 한국어 위주, 채널 규칙 따라.
- 링크는 쓰지 마(서버가 따로 붙임).

채널별
- instagram.caption: 3~6줄 + 투표형 질문(예: "너라면? 1️⃣ 먼저 연락한다 2️⃣ 끝까지 기다린다 — 댓글로 숫자만!") + "🔗 내 사연 무료 미리보기는 프로필 링크" 한 줄 + 해시태그 5~8개.
- instagram.first_comment: 투표 선택지를 다시 정리한 짧은 댓글(예: "1️⃣ 먼저 연락 / 2️⃣ 기다린다 👇 숫자로 투표해줘"). 해시태그 없음.
- facebook.caption: 인스타와 비슷하되 해시태그 3개 이하, 투표형 질문 포함.
- threads.text: 400자 이내, 해시태그 1개 이하, 대화하듯. 질문으로 끝내.
- youtube.title: 60자 이내, 궁금증 유발, 끝에 " #shorts".
- youtube.description: 2~3줄 + 해시태그 6개(#shorts 포함).
- tiktok.caption: 150자 이내, 질문 + 해시태그 4~5개, 마지막에 "내 사연 무료 미리보기는 프로필 링크".

반드시 아래 JSON만 출력:
{"instagram":{"caption":"","first_comment":""},"facebook":{"caption":""},"threads":{"text":""},"youtube":{"title":"","description":""},"tiktok":{"caption":""}}`;

export async function generateCaptions(memo: string): Promise<Captions> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return fallbackCaptions(memo);
  const client = new Anthropic({ apiKey });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const msg = await client.messages.create({
        model: getModelId(),
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: "user", content: `영상 내용/제목:\n${memo.slice(0, 1500)}` }],
      });
      const text = msg.content.filter((c) => c.type === "text").map((c) => (c as { text: string }).text).join("");
      const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Captions;
      if (!j.instagram?.caption || !j.youtube?.title || !j.threads?.text) throw new Error("shape");
      return j;
    } catch (e) {
      console.error("[social] caption_failed", attempt, e instanceof Error ? e.message.slice(0, 80) : "");
    }
  }
  return fallbackCaptions(memo);
}

export function fallbackCaptions(memo: string): Captions {
  const t = memo.split("\n")[0].slice(0, 50) || "헤어진 뒤 잠 못 드는 밤";
  return {
    instagram: {
      caption: `${t}\n\n너라면? 1️⃣ 먼저 연락한다 2️⃣ 끝까지 기다린다\n댓글로 숫자만 남겨줘🌙\n\n🔗 내 사연 무료 미리보기는 프로필 링크\n#이별 #재회 #연애 #헤어진후 #연락타이밍 #월하연`,
      first_comment: "1️⃣ 먼저 연락한다 / 2️⃣ 끝까지 기다린다 👇 숫자로 투표해줘",
    },
    facebook: { caption: `${t}\n\n너라면? 1️⃣ 먼저 연락한다 2️⃣ 끝까지 기다린다 — 댓글로 숫자만!\n#이별 #재회 #월하연` },
    threads: { text: `${t}\n\n이럴 때 너라면 먼저 연락해, 아니면 기다려?` },
    youtube: { title: `${t.slice(0, 50)} #shorts`, description: `헤어진 뒤 잠 못 드는 밤, 월화가 끝까지 들어줄게요🌙\n\n#shorts #이별 #재회 #전남친 #연애 #월하연` },
    tiktok: { caption: `${t} 너라면 어떻게 해? #이별 #재회 #연애 #월하연 내 사연 무료 미리보기는 프로필 링크` },
  };
}

/** 저장된 캡션에 채널별 추적 링크를 붙여 실제 게시 문구를 만든다 */
export function finalText(c: Captions, postId: string) {
  return {
    instagram: c.instagram.caption, // 인스타 본문 링크는 눌리지 않아 프로필 링크(utm_source=ig 자동)로 유도
    instagramComment: c.instagram.first_comment,
    facebook: `${c.facebook.caption}\n\n▶ 내 사연 무료 미리보기 👉 ${trackedLink("facebook", postId)}`,
    threads: `${c.threads.text.slice(0, 390)}\n\n👉 ${trackedLink("threads", postId)}`,
    youtubeTitle: c.youtube.title.slice(0, 100),
    youtubeDescription: `${c.youtube.description}\n\n▶ 내 사연으로 무료 미리보기: ${trackedLink("youtube", postId)}`,
    tiktok: c.tiktok.caption.slice(0, 2000),
  };
}
