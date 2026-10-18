/**
 * 예약 시각이 지난 게시물을 채널별로 한 단계씩 진행.
 * 10분마다(GitHub Actions) + 관리자 화면에서 "지금 올리기"를 누를 때 실행됩니다.
 */
import "server-only";
import { getTokens, listPosts, savePost, type Channel, type ChannelState, type SocialPost } from "@/lib/social/store";
import { stepFacebook, stepInstagram, stepThreads, stepTiktok, stepYoutube } from "@/lib/social/channels";

const STEPS: Record<Channel, (p: SocialPost, t: Awaited<ReturnType<typeof getTokens>>, st?: ChannelState) => Promise<ChannelState>> = {
  instagram: stepInstagram,
  facebook: stepFacebook,
  threads: stepThreads,
  youtube: stepYoutube,
  tiktok: stepTiktok,
};

export async function advancePost(p: SocialPost): Promise<SocialPost> {
  const tokens = await getTokens();
  for (const ch of Object.keys(p.channels) as Channel[]) {
    const st = p.channels[ch];
    if (!st || (st.status !== "waiting" && st.status !== "processing")) continue;
    try {
      p.channels[ch] = await STEPS[ch](p, tokens, st);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const tries = (st.tries ?? 0) + 1;
      // 일시적 오류는 3번까지 다시 시도 (처리 중 단계는 처음부터 다시)
      p.channels[ch] =
        tries < 3 && !/연결 안 됨/.test(msg)
          ? { status: "waiting", tries, error: msg.slice(0, 300), updatedAt: new Date().toISOString() }
          : { status: "error", tries, error: msg.slice(0, 300), updatedAt: new Date().toISOString() };
      console.error(`[social] ${p.id} ${ch} ${msg.slice(0, 120)}`);
    }
    await savePost(p);
  }
  return p;
}

export async function runDue(): Promise<{ checked: number; advanced: string[] }> {
  const posts = await listPosts(40);
  const nowMs = Date.now();
  const advanced: string[] = [];
  for (const p of posts) {
    if (new Date(p.scheduledAt).getTime() > nowMs) continue;
    const active = Object.values(p.channels).some((s) => s && (s.status === "waiting" || s.status === "processing"));
    if (!active) continue;
    await advancePost(p);
    advanced.push(p.id);
  }
  return { checked: posts.length, advanced };
}
