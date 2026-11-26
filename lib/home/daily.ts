/**
 * 11/26 운영자 요청: '오늘 밤의 한 문장' — 누르면 그날의 한 문장 + 짧은 칼럼 한 토막. 날짜(한국 시간)마다 바뀐다.
 * 원칙: 재회·상대 마음을 장담하지 않는다. 오늘 밤 할 수 있는 작은 행동 하나로 끝낸다.
 */
export type Daily = { line: string; body: string; act: string; slug: string };

export const DAILY: Daily[] = [
  { line: "보내고 싶은 마음은 진짜지만, 보내는 시간은 고를 수 있어요.", body: "밤에는 같은 문장도 더 무겁게 읽혀요. 하고 싶은 말은 사라지지 않으니, 오늘은 메모장에만 남겨 두어도 괜찮아요.", act: "보내고 싶은 말을 메모장에 한 줄로 적기", slug: "before-you-send" },
  { line: "답장 속도는 마음의 크기가 아니라, 그 사람의 하루일 때가 많아요.", body: "늦은 답장 하나에 이유를 여러 개 붙이기 시작하면 밤이 길어져요. 본 것과 상상한 것을 나눠 보세요.", act: "오늘 실제로 받은 메시지만 다시 읽기", slug: "shorter-replies" },
  { line: "멈추는 것도 하나의 대답이 될 수 있어요.", body: "이미 많이 보냈다면, 지금 할 수 있는 가장 큰 일은 연락을 쉬는 거예요. 쉬는 동안 두 사람 모두 생각할 여유가 생겨요.", act: "연락하고 싶을 때마다 10분 기다려 보기", slug: "held-on-too-much" },
  { line: "사과는 한 번, 짧게, 조건 없이.", body: "단답이 왔다고 더 길게 다시 사과하면 첫 사과가 흐려져요. 사과는 이미 도착했어요.", act: "‘들어 줘서 고마워’ 한 줄로 대화 닫기", slug: "short-reply-after-apology" },
  { line: "스토리 한 장에는 생각보다 적은 정보가 담겨 있어요.", body: "사진 한 장에 의미를 붙이기 시작하면 상상이 사실처럼 느껴져요. 오늘은 확인하러 들어가지 않는 연습을 해 봐요.", act: "휴대폰을 침대에서 손 닿지 않는 곳에 두기", slug: "checking-their-sns" },
  { line: "‘너는 항상’ 대신 ‘나는 그때’로 시작해 보세요.", body: "같은 일로 또 싸웠다면, 싸움의 주제보다 그때 내가 바랐던 것을 먼저 찾아보는 게 도움이 돼요.", act: "최근 싸움에서 내가 바랐던 것 한 가지 적기", slug: "same-fight-again" },
  { line: "오늘의 목표는 결론이 아니라, 오늘을 버티는 거예요.", body: "가장 아픈 날에 내린 결정은 마음이 가라앉은 뒤에 낯설게 느껴질 때가 많아요. 결론은 내일로 미뤄도 괜찮아요.", act: "믿을 만한 친구 한 명에게 오늘 기분 말하기", slug: "first-24-hours" },
  { line: "오래 기다린 한 줄일수록, 답장은 짧게 시작해요.", body: "‘잘 지내?’ 한 줄에 그동안의 마음을 다 담으면 상대가 준비한 대화보다 무거운 답이 도착해요.", act: "받은 만큼만 돌려주는 답장 연습하기", slug: "reply-to-how-are-you" },
  { line: "다시 만나는 것보다 어려운 건, 같은 이별을 반복하지 않는 거예요.", body: "다시 만난다면 무엇이 달라야 하는지 먼저 적어 두면, 흔들리는 날 나를 지킬 수 있어요.", act: "다시 만나도 꼭 지키고 싶은 기준 하나 적기", slug: "standard-before-reunion" },
  { line: "보내지 않은 편지도 마음을 정리해 줘요.", body: "차단된 마음에 다른 길로 연락하고 싶을 때, 종이에 적고 접어 두는 것만으로도 오늘 밤이 조금 가벼워져요.", act: "하고 싶은 말을 종이에 적고 접어 두기", slug: "blocked-another-account" },
];

/** 한국 시간 기준 날짜로 하나 고르기 */
export function todayDaily(now = Date.now()) {
  const kst = new Date(now + 9 * 3600 * 1000);
  const day = Math.floor(kst.getTime() / 86400000);
  const d = DAILY[day % DAILY.length];
  return { ...d, date: `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일` };
}
