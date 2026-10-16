/** 10/16 리디자인 2차 — 홈·미리보기에서 쓰는 이미지·영상 경로 (모두 public/ 안의 실제 파일) */
export const V2 = {
  greet: "/wolhwa/v2/greet.webp",
  greetVideo: "/wolhwa/v2/greet.mp4",
  listen: "/wolhwa/v2/listen.webp",
  write: "/wolhwa/v2/write.webp",
  thread: "/wolhwa/v2/thread.webp",
  offer: "/wolhwa/v2/offer.webp",
  ritual1: "/wolhwa/v2/ritual-1.webp",
  ritual2: "/wolhwa/v2/ritual-2.webp",
  ritual3: "/wolhwa/v2/ritual-3.webp",
  set: "/wolhwa/v2/set.webp",
  moon: "/wolhwa/v2/moon.webp",
  moonVideo: "/wolhwa/v2/moon.mp4",
};

/** 고민 장면 (운영자 원본 영상 · 무음) → 고르면 신청서 첫 선택으로 (/apply?sit=) */
export const MOMENTS = [
  { src: "/book/v3/grab.mp4", poster: "/book/v3/grab.webp", line: "제가 너무 많이\n매달렸어요", sit: 1 },
  { src: "/book/v3/bed.mp4", poster: "/book/v3/bed.webp", line: "사과했는데\n단답만 왔어요", sit: 2 },
  { src: "/book/v3/fight.mp4", poster: "/book/v3/fight.webp", line: "같은 일로\n또 싸웠어요", sit: 3 },
  { src: "/book/v3/drink.mp4", poster: "/book/v3/drink.webp", line: "놓고 싶은데\nSNS를 계속 봐요", sit: 4 },
];

export const SHORTS = [
  { id: "01", title: "연락하고 싶은 밤에" },
  { id: "02", title: "답장이 없을 때\n자꾸 확인하는 이유" },
  { id: "03", title: "재회하고 싶다면 먼저 볼 것" },
  { id: "04", title: "다시 만나도\n같은 이유로 헤어질 때" },
  { id: "05", title: "그 사람이 필요한 걸까,\n그때가 그리운 걸까" },
].map((s) => ({ ...s, src: `/wolhwa/shorts/${s.id}.mp4`, poster: `/wolhwa/shorts/${s.id}-poster.webp` }));
