"use client";

/** 제목을 어절 단위로 하나씩 떠오르게 (줄바꿈은 \n) */
import InView from "@/components/fx/InView";

export default function SplitWords({
  text,
  as = "span",
  className = "",
  delayMs = 0,
  wordClassName = "",
}: {
  text: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  delayMs?: number;
  wordClassName?: string;
}) {
  let i = 0;
  return (
    <InView as={as} className={`fx-split ${className}`} style={{ ["--d" as string]: `${delayMs}ms` }}>
      {text.split("\n").map((line, li, arr) => (
        <span key={li}>
          {line.split(" ").map((w, wi) => (
            <span key={wi} className={`fx-word ${wordClassName}`} style={{ ["--i" as string]: i++ }}>
              {w}
              {wi < line.split(" ").length - 1 ? " " : ""}
            </span>
          ))}
          {li < arr.length - 1 && <br />}
        </span>
      ))}
    </InView>
  );
}
