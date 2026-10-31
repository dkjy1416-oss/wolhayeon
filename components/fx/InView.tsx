"use client";

/** 화면에 들어오면 is-visible 를 붙이는 래퍼 (효과 클래스는 globals.css 의 fx-*) */
import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from "react";

export default function InView({
  as: Tag = "div",
  className = "",
  style,
  children,
  threshold = 0.2,
}: {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return void el.classList.add("is-visible");
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
