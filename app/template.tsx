/** 10/31: 페이지 진입 효과 — 화면이 바뀔 때마다 살짝 흐림에서 선명해지며 떠오름 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fx-page">{children}</div>;
}
