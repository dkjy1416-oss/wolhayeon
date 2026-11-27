import Link from "next/link";

/**
 * 11/27 운영자 요청: 왼쪽 위 로고를 홈(/home)과 같은 모양으로 통일 — 분홍 "월하연" + 작은 회색 "月下緣".
 * 누르면 항상 /home 으로.
 */
export default function BrandLogo({ className = "", size = 22 }: { className?: string; size?: number }) {
  return (
    <Link
      href="/home"
      aria-label="월하연 홈으로"
      className={`font-display inline-block whitespace-nowrap leading-none text-[#E4627B] ${className}`}
      style={{ fontSize: size }}
    >
      월하연 <span className="text-[#B5B5BA]" style={{ fontSize: Math.round(size / 2) }}>月下緣</span>
    </Link>
  );
}
