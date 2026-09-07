/** 이미지 슬롯 — 파일이 없으면 분위기 있는 gradient fallback (깨진 아이콘 금지) */
import Image from "next/image";

export default function HomeImage({
  src,
  alt,
  aspect = "aspect-[4/5]",
  sizes = "(max-width: 768px) 100vw, 33vw",
  className = "",
  priority = false,
}: {
  src: string | null;
  alt: string;
  aspect?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden ${aspect} ${className}`}
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-ink-soft via-[#131017] to-ink">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-thread/40 to-transparent" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/20" />
    </div>
  );
}
