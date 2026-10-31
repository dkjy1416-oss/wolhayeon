/**
 * 카톡 분석 — 무료 선택형 질문 + 무료 대화 유형 판정 (API 없음, 클라이언트·서버 공용)
 * 업계 공통 무료 진단(이별 기간·연락 빈도·연락 마무리·읽씹 대처 등)을 참고하되,
 * "재회 확률 %" 같은 근거 없는 숫자 대신 '대화 유형'으로 보여 준다.
 */
export interface ChatQuestion {
  id: string;
  q: string;
  sub?: string;
  options: { v: string; label: string }[];
}

export const CHAT_QUESTIONS: ChatQuestion[] = [
  {
    id: "rel",
    q: "그 사람과 지금 어떤 사이예요?",
    options: [
      { v: "ex", label: "헤어진 연인" },
      { v: "lover", label: "연애 중" },
      { v: "some", label: "썸 · 알아가는 중" },
      { v: "crush", label: "짝사랑" },
      { v: "lost", label: "연락이 뜸해진 사이" },
    ],
  },
  {
    id: "elapsed",
    q: "마지막으로 대화가 오간 건 언제예요?",
    options: [
      { v: "today", label: "오늘 · 어제" },
      { v: "week", label: "일주일 안" },
      { v: "month", label: "한 달 안" },
      { v: "long", label: "한 달보다 더 전" },
    ],
  },
  {
    id: "who_first",
    q: "카톡은 주로 누가 먼저 보내요?",
    options: [
      { v: "me", label: "거의 내가 먼저" },
      { v: "even", label: "비슷해요" },
      { v: "partner", label: "주로 그 사람이 먼저" },
    ],
  },
  {
    id: "reply",
    q: "요즘 그 사람 답장은 어때요?",
    options: [
      { v: "same", label: "예전이랑 비슷해요" },
      { v: "slow", label: "눈에 띄게 느려졌어요" },
      { v: "short", label: "단답이 많아졌어요" },
      { v: "ignored", label: "읽고 답이 없거나 안 읽어요" },
    ],
  },
  {
    id: "length",
    q: "메시지 길이를 비교하면?",
    options: [
      { v: "me_long", label: "내 메시지가 훨씬 길어요" },
      { v: "even", label: "비슷해요" },
      { v: "partner_long", label: "그 사람이 더 길게 써요" },
    ],
  },
  {
    id: "ends",
    q: "대화는 보통 누가 끝내요?",
    options: [
      { v: "partner", label: "그 사람이 답을 안 하며 끝나요" },
      { v: "me", label: "내가 먼저 마무리해요" },
      { v: "natural", label: "자연스럽게 인사하고 끝나요" },
    ],
  },
  {
    id: "my_last",
    q: "내가 마지막으로 보낸 메시지는 어떤 거였어요?",
    options: [
      { v: "hello", label: "가벼운 안부 · 일상 얘기" },
      { v: "feeling", label: "마음을 담은 긴 메시지" },
      { v: "sorry", label: "사과" },
      { v: "ask", label: "\"우리 무슨 사이야?\" 같은 확인 질문" },
      { v: "none", label: "아직 아무것도 안 보냈어요" },
    ],
  },
  {
    id: "tone",
    q: "그 사람 말투를 한 단어로 고르면?",
    options: [
      { v: "warm", label: "다정해요" },
      { v: "plain", label: "평범해요" },
      { v: "dry", label: "건조해요" },
      { v: "cold", label: "차갑거나 날카로워요" },
    ],
  },
  {
    id: "on_ignore",
    q: "답이 없을 때 나는 보통?",
    options: [
      { v: "wait", label: "그냥 기다려요" },
      { v: "again", label: "한 번 더 보내요" },
      { v: "long", label: "길게 마음을 써서 보내요" },
      { v: "other", label: "전화하거나 다른 SNS로 연락해요" },
    ],
  },
  {
    id: "want",
    q: "이 대화에서 가장 알고 싶은 건?",
    options: [
      { v: "heart", label: "그 사람 마음이 아직 있는지" },
      { v: "timing", label: "지금 연락해도 되는지" },
      { v: "what", label: "다음에 뭐라고 보내야 할지" },
      { v: "mistake", label: "내가 뭘 잘못하고 있는지" },
      { v: "letgo", label: "정리해야 하는 건지" },
    ],
  },
];

export interface FreeChatType {
  key: string;
  name: string;
  line: string;
  desc: string;
  avoid: { what: string; why: string }[];
}

const TYPES: Record<string, Omit<FreeChatType, "avoid">> = {
  chase: {
    key: "chase",
    name: "다가갈수록 멀어지는 추격형",
    line: "내가 한 발 다가가면, 그 사람은 반 발 물러서는 대화",
    desc: "연락을 시작하는 쪽도, 길게 쓰는 쪽도 주로 나예요. 이 흐름에서 상대는 마음이 없어서라기보다 '답해야 한다는 부담' 때문에 속도를 늦추는 경우가 많아요.",
  },
  gap: {
    key: "gap",
    name: "같은 대화, 다른 온도의 온도차형",
    line: "대화는 이어지는데, 마음의 온도가 서로 다른 대화",
    desc: "답은 오지만 말의 길이와 표현이 한쪽으로 기울어 있어요. 지금은 '얼마나 자주'보다 '어떤 온도로' 주고받는지가 관계를 정해요.",
  },
  confirm: {
    key: "confirm",
    name: "답을 확인받고 싶은 확인형",
    line: "불안할수록 확인 질문이 늘어나는 대화",
    desc: "답이 늦거나 짧을 때 마음을 확인하는 메시지가 이어지는 흐름이에요. 확인 질문은 진심이어도 상대에게는 '시험'처럼 도착하기 쉬워요.",
  },
  pause: {
    key: "pause",
    name: "숨 고르는 중인 정지형",
    line: "문이 닫힌 게 아니라, 잠시 멈춰 있는 대화",
    desc: "지금은 대화가 거의 멈춰 있어요. 이 구간에서는 한 통의 메시지가 관계의 무게를 크게 바꾸기 때문에, 보내는 내용보다 보내는 순서가 더 중요해요.",
  },
  sync: {
    key: "sync",
    name: "편안함이 남아 있는 회복형",
    line: "주고받는 리듬이 아직 살아 있는 대화",
    desc: "먼저 말을 거는 쪽과 답의 길이가 비교적 고르게 오가요. 지금 필요한 건 큰 고백보다, 이 편안한 리듬을 깨지 않으면서 한 걸음 가까워지는 방법이에요.",
  },
};

const AVOID: Record<string, { what: string; why: string }> = {
  again: { what: "답이 없는데 이어서 보내는 두 번째 메시지", why: "기다림을 줄여 주지 않고, 상대가 답할 여유만 줄여요." },
  long: { what: "새벽에 쓰는 장문의 마음 고백", why: "진심이어도 감정이 가장 높을 때의 글은 '부담'으로 먼저 도착해요." },
  ask: { what: "\"우리 무슨 사이야?\" 같은 확인 질문", why: "답을 요구하는 질문은 상대를 방어하게 만들어요." },
  other: { what: "전화나 다른 SNS로 돌아서 연락하기", why: "카톡에서 멈춘 대화를 다른 길로 열면 '선을 넘는다'고 느끼기 쉬워요." },
  sns: { what: "프로필·스토리를 보고 바로 반응하기", why: "작은 신호에 바로 움직이면 관계의 속도를 내 불안이 정하게 돼요." },
  sorry: { what: "같은 사과를 반복하기", why: "반복된 사과는 미안함보다 '빨리 받아 달라'는 요구처럼 들려요." },
};

export function freeChatType(a: Record<string, string>): FreeChatType {
  const ignored = a.reply === "ignored" || a.elapsed === "long";
  let key: string;
  if (ignored && (a.tone === "cold" || a.tone === "dry" || a.elapsed === "long")) key = "pause";
  else if (a.my_last === "ask" || a.on_ignore === "again" || a.on_ignore === "long") key = "confirm";
  else if (a.who_first === "me" && (a.reply === "slow" || a.reply === "short" || a.length === "me_long")) key = "chase";
  else if (a.length !== "even" || a.tone === "dry") key = "gap";
  else key = "sync";
  const avoid: { what: string; why: string }[] = [];
  if (a.on_ignore === "again") avoid.push(AVOID.again);
  if (a.on_ignore === "long" || a.my_last === "feeling") avoid.push(AVOID.long);
  if (a.my_last === "ask") avoid.push(AVOID.ask);
  if (a.on_ignore === "other") avoid.push(AVOID.other);
  if (a.my_last === "sorry") avoid.push(AVOID.sorry);
  for (const k of ["long", "sns", "again"]) if (avoid.length < 2 && !avoid.includes(AVOID[k])) avoid.push(AVOID[k]);
  return { ...TYPES[key], avoid: avoid.slice(0, 2) };
}

export const CHAT_LOCKED_ITEMS = [
  "캡처 속 실제 대화로 본 두 사람의 대화 온도",
  "그 사람 답장이 식기 시작한 지점",
  "내가 반복하고 있는 말 습관",
  "지금 보내면 안 되는 문장",
  "다음에 보낼 메시지 예시 3개와 예상 반응",
  "1~2주 실천 계획",
];
