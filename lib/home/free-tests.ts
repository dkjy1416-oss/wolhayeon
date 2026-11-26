/** 11/26 운영자 요청: 무료 테스트 3종 (바로 결과가 나오는 재미용) — 홈 '무료' 카드와 각 화면이 같이 쓴다. */
export type FreeTest = { id: string; title: string; sub: string; img: string; bg: string; ink: string; href: string };

export const FREE_TESTS: FreeTest[] = [
  { id: "mbti", title: "MBTI 애정 궁합", sub: "너랑 나, MBTI로 보면 몇 점일까?", img: "/wolhwa/doodle/girl_heart.webp", bg: "#FFE6EC", ink: "#B3263F", href: "/free/mbti" },
  { id: "love-score", title: "생년월일 애정 점수", sub: "두 사람 생일로 보는 애정 온도", img: "/wolhwa/doodle/girl_curly.webp", bg: "#FFF3D1", ink: "#9A6400", href: "/free/love-score" },
  { id: "zodiac", title: "띠 궁합", sub: "쥐띠부터 돼지띠까지, 우리는 찰떡일까?", img: "/wolhwa/doodle/bunny_book.webp", bg: "#ECE7FF", ink: "#5B45B0", href: "/free/zodiac" },
];
