import LoopVideo from "@/components/book/LoopVideo";

/**
 * 미리보기 카드 사이의 장면 — 운영자 원본 영상(무음) 또는 이미지 + 한 줄.
 * 읽는 흐름을 끊지 않도록 짧게, 위아래는 배경색으로 녹인다.
 */
export default function SceneBreak({
  video,
  image,
  poster,
  eyebrow,
  line,
  aspect = "aspect-[4/3.4]",
  position = "object-top",
}: {
  video?: string;
  image?: string;
  poster?: string;
  eyebrow?: string;
  line: string;
  aspect?: string;
  position?: string;
}) {
  return (
    <figure className="relative mt-8 overflow-hidden">
      {video ? (
        <LoopVideo src={video} poster={poster} label={line} className={`block ${aspect} w-full object-cover ${position}`} />
      ) : image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" className={`block ${aspect} w-full object-cover ${position}`} />
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink via-ink/75 to-transparent" />
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 px-7 pb-4">
        {eyebrow && <p className="text-[0.66rem] tracking-[0.28em] text-thread">{eyebrow}</p>}
        <p className="font-display mt-1.5 whitespace-pre-line text-[1.12rem] leading-[1.65] text-ivory">{line}</p>
      </figcaption>
    </figure>
  );
}
