/** 이미지 슬롯 — 파일이 없으면 분위기 있는 gradient fallback (깨진 아이콘 금지) */
import Image from "next/image";

export default function HomeImage({
  src,
  alt,
  aspect = "aspect-[4/5]",
  sizes = "(max-width: 768px) 100vw, 33vw",
  className = "",
  priority = false,
  bleed = false,
  sceneEyebrow,
  sceneTitle,
}: {
  src: string | null;
  alt: string;
  aspect?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  /** full-bleed 섹션용: 상하단을 배경(ink)으로 길게 녹임 */
  bleed?: boolean;
  /** 감정 장면 캡션 — 이미지 하단에 얹히는 짧은 라벨/한 줄 */
  sceneEyebrow?: string;
  sceneTitle?: string;
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
      {bleed ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink via-ink/50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink via-ink/55 to-transparent" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/20" />
      )}
      {(sceneEyebrow || sceneTitle) && (
        <div className="absolute inset-x-0 bottom-0 px-6 pb-7">
          {sceneEyebrow && (
            <p className="text-[0.62rem] tracking-[0.3em] text-gold/80">
              {sceneEyebrow}
            </p>
          )}
          {sceneTitle && (
            <p className="font-display mt-2 whitespace-pre-line text-[1.05rem] font-medium leading-[1.8] text-ivory">
              {sceneTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
