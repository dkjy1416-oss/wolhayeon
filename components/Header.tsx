"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-ink/80 backdrop-blur-md border-b border-gold-dim/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link
          href="/"
          className="font-display text-base text-ivory tracking-wide"
        >
          월하연 <span className="text-gold">月下緣</span>
        </Link>
        <Link
          href="#pricing"
          className="rounded-full border border-gold-dim/40 px-4 py-2 text-sm text-ivory transition-colors hover:border-gold/70 hover:text-gold"
        >
          리추얼 시작하기
        </Link>
      </div>
    </header>
  );
}
