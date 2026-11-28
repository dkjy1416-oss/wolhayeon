"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/admin/LogoutButton";

/* 11/28 운영자 요청 "필요 없는 건 정리": 매일 보는 메뉴만 남김.
   홍보·SNS 업로드·통계(옛 화면)·리마인드 메일·사과 쿠폰 화면은 메뉴에서만 뺐고 주소로는 계속 열린다
   (/admin/promo · /admin/social · /admin/stats · /admin/remind · /admin/apology). */
const ITEMS: { href: string; label: string }[] = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/orders", label: "재회·책 주문" },
  { href: "/admin/chat", label: "카톡 주문" },
  { href: "/admin/customers", label: "고객" },
  { href: "/admin/marketing", label: "상세 통계" },
  { href: "/admin/cs", label: "고객센터" },
  { href: "/admin/reviews", label: "후기" },
];

export default function AdminNav() {
  const path = usePathname() ?? "";
  if (path.startsWith("/admin/login")) return null;

  const isActive = (href: string) =>
    href === "/admin" ? path === "/admin" : path.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-gold-dim/20 bg-ink/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-3">
        <Link
          href="/admin"
          className="shrink-0 text-[0.7rem] tracking-[0.3em] text-gold/90"
        >
          月下緣 ADMIN
        </Link>
        <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8rem] transition-colors ${
                isActive(it.href)
                  ? "bg-gold/15 text-gold"
                  : "text-ivory-dim hover:text-ivory"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
