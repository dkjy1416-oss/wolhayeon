import Reveal from "@/components/home/Reveal";
import HomeImage from "@/components/home/HomeImage";

/** SECTION 02 — 감정 공감 (editorial 블록 + cinematic 이미지 브레이크) */
const FEELINGS_A = [
  "마지막 카톡을 계속 다시 보고 있다",
  "차단, 언팔, 프로필 변화 하나에도\n자꾸 의미를 찾게 된다",
  "연락하고 싶은데\n먼저 하면 더 멀어질까 무섭다",
];
const FEELINGS_B = [
  "다시 만나고 싶지만\n또 같은 이유로 헤어질까 겁난다",
  "그 사람이 그리운 건지,\n그 사람과 있을 때의 내가 그리운 건지 헷갈린다",
  "주변에서는 그냥 잊으라고 하는데\n나는 아직 그렇게 못 하겠다",
];

export default function EmotionSection({
  emotionPhone,
}: {
  emotionPhone: string | null;
}) {
  return (
    <section className="py-20">
      <div className="px-6">
        <Reveal>
          <h2 className="font-display text-center text-[1.4rem] font-semibold leading-snug text-ivory">
            혹시 지금 이런 상태인가요?
          </h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-4">
          {FEELINGS_A.map((line, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="border-l-2 border-thread/40 bg-ink-soft/60 px-5 py-5">
                <p className="whitespace-pre-line text-[0.93rem] font-light leading-[1.95] text-ivory">
                  “{line}”
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* cinematic image break — 모바일 폭 전체 사용 */}
      <Reveal className="mt-10">
        <HomeImage
          src={emotionPhone}
          alt="붉은 밤, 휴대폰을 바라보는 여인"
          aspect="aspect-[4/5]"
          sizes="(max-width: 520px) 100vw, 520px"
        />
      </Reveal>

      <div className="px-6">
        <div className="mt-10 flex flex-col gap-4">
          {FEELINGS_B.map((line, i) => (
            <Reveal key={i} delay={i * 70}>
              <div className="border-l-2 border-thread/40 bg-ink-soft/60 px-5 py-5">
                <p className="whitespace-pre-line text-[0.93rem] font-light leading-[1.95] text-ivory">
                  “{line}”
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <p className="mt-14 text-center text-[0.98rem] font-light leading-[2.1] text-ivory">
            마음이 아직 끝나지 않았는데
            <br />
            억지로 끝난 척할 필요는 없어요.
          </p>
          <p className="mt-4 text-center text-[0.9rem] font-light leading-[2.05] text-ivory-dim">
            대신 지금 내가 어디에 서 있는지는
            <br />한 번 제대로 볼 필요가 있습니다.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
