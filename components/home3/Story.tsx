/**
 * 10/16 3차 상세페이지형 홈 — 앞부분 (공감 → 반전 → 궁금증 → 답 → 월화 등장 → 웹툰 → 체크리스트 → 고민 → 준비했어요)
 * 원칙: 결과·재회·연락을 장담하지 않는다 · 지어낸 후기/대화/경력 없음 · 예시는 '예시'로 표시.
 */
import Image from "next/image";
import LoopVideo from "@/components/book/LoopVideo";
import TrackedCtaLink from "@/components/TrackedCtaLink";
import { V2, MOMENTS } from "@/components/home2/media";
import { Big, Bubble, Cta, Hl, Panel, V3 } from "./parts";

export function Hook() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden>
        <LoopVideo src="/book/v3/check.mp4" poster="/book/v3/check.webp" className="h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120e10] via-[#120e10]/60 to-[#120e10]" />
      </div>
      <div className="relative px-5 pb-14 pt-28 text-center">
        <p className="text-[1.05rem] font-bold text-[#e46b8a]">혹시 오늘도,</p>
        <Big className="mt-3 text-[1.85rem]">{"하루에 몇 번씩\n대화창을 열었다\n닫았나요?"}</Big>

        {/* 보내지 못한 메시지 — 예시 화면 */}
        <div className="mx-auto mt-9 w-full max-w-[19rem] rounded-[1.6rem] border border-white/10 bg-[#1d181b]/90 p-4 text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
            <span className="h-7 w-7 rounded-full bg-[#3a3134]" />
            <span className="text-[0.82rem] text-ivory-dim">그 사람</span>
            <span className="ml-auto text-[0.66rem] text-ivory-dim/70">마지막 대화 · 21일 전</span>
          </div>
          <p className="mt-3 w-fit max-w-[85%] rounded-2xl rounded-tl-md bg-[#2c2528] px-3.5 py-2 text-[0.86rem] text-ivory">응 잘 지내</p>
          <div className="mt-5 flex items-end gap-2">
            <p className="flex-1 rounded-2xl border border-[#e46b8a]/50 bg-[#2a1d22] px-3.5 py-2.5 text-[0.86rem] leading-[1.6] text-ivory">
              자니..? 그냥 갑자기 생각나서<span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#e46b8a] align-middle" />
            </p>
            <span className="rounded-full bg-[#3a3134] px-3 py-2 text-[0.74rem] text-ivory-dim">전송</span>
          </div>
          <p className="mt-2 text-right text-[0.64rem] text-ivory-dim/60">예시 화면</p>
        </div>

        <p className="mt-8 text-[1.02rem] leading-[1.8] text-ivory-dim">
          보낼까, 말까.
          <br />그 사이에서 오늘 밤도 지나가죠.
        </p>
      </div>
    </section>
  );
}

export function Turn() {
  return (
    <section className="pb-14">
      <div className="mx-5 rounded-[1.4rem] bg-gradient-to-r from-[#7a2340] via-[#a83a57] to-[#7a2340] px-5 py-7 text-center shadow-[0_0_60px_rgba(168,58,87,0.35)]">
        <p className="text-[1.5rem] font-extrabold text-[#fbf7f2]">그런데,</p>
        <p className="mt-3 text-[1.18rem] font-bold leading-[1.6] text-[#fbf7f2]">
          지금 보내는 그 한 줄이
          <br />두 사람을 더 멀어지게 할 수도 있어요.
        </p>
      </div>
      <p className="mt-8 px-6 text-center text-[0.98rem] leading-[1.8] text-ivory-dim">
        길게 쓴 사과, 다시 묻는 질문, 확인하는 메시지…
        <br />
        <b className="text-ivory">무엇을 보낼지보다, 지금 내 상황이 어떤지</b>가 먼저예요.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-2 px-4">
        {MOMENTS.map((m) => (
          <TrackedCtaLink key={m.src} event="home_cta_click" placement={`moment_${m.sit}`} href={`/apply?sit=${m.sit}`} className="relative block overflow-hidden rounded-2xl bg-[#1d181b]">
            <LoopVideo src={m.src} poster={m.poster} className="block aspect-[9/13] w-full object-cover" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#120e10] via-[#120e10]/75 to-transparent" />
            <p className="pointer-events-none absolute inset-x-0 bottom-0 whitespace-pre-line px-3 pb-3 text-[0.9rem] font-bold leading-[1.45] text-ivory">{m.line}</p>
          </TrackedCtaLink>
        ))}
      </div>
      <p className="mt-3 text-center text-[0.76rem] text-ivory-dim">내 상황을 누르면 그 이야기로 시작해요</p>
    </section>
  );
}

export function Mystery() {
  return (
    <section className="pb-16">
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <Image src={V3.hands} alt="붉은 실로 이어진 두 손" fill sizes="480px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120e10] via-transparent to-[#120e10]" />
        <div className="absolute inset-x-0 top-10 px-5 text-center">
          <p className="text-[1.05rem] font-bold text-gold">끊어진 줄 알았던 실,</p>
          <Big className="mt-2">{"다시 이을 실마리가\n궁금하신가요?"}</Big>
        </div>
      </div>
      <div className="px-5 text-center">
        <p className="text-[1.08rem] leading-[1.8] text-ivory-dim">그 답은 이미</p>
        <Big className="mt-1">
          두 사람이 겪은
          <br />
          <Hl>이야기 안</Hl>에 있어요.
        </Big>
      </div>
      <div className="mx-5 mt-9 rounded-[1.4rem] border border-gold/30 bg-[#1d181b] px-5 py-6">
        <p className="text-center text-[0.86rem] font-bold tracking-[0.08em] text-gold">미치도록 궁금했던 그 이야기</p>
        <ul className="mt-5 flex flex-col gap-4">
          {[
            ["왜 헤어졌는지", "반복된 갈등과 마지막 대화로 읽는 관계의 흐름"],
            ["그 사람은 지금 어떤 마음일지", "답장과 행동으로 볼 수 있는 상대 반응 · 가능한 해석"],
            ["지금 연락해도 될지", "내 상황에 맞춘 연락 기준과 기다림의 기준"],
            ["보낸다면 뭐라고 할지", "보낼 문장 초안 · 답이 오면 · 단답이면 · 없으면"],
            ["흔들리는 밤엔 뭘 해야 할지", "나만의 리추얼 · 첫날 · 7일 · 21일 실천 가이드"],
          ].map(([q, a], i) => (
            <li key={q} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a83a57] text-[0.74rem] font-bold text-[#fbf7f2]">{i + 1}</span>
              <p className="min-w-0">
                <b className="font-display block text-[1.08rem] text-ivory">{q}</b>
                <span className="text-[0.88rem] leading-[1.6] text-ivory-dim">{a}</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-white/10 pt-4 text-center text-[0.96rem] font-bold leading-[1.7] text-ivory">
          <Hl>14장</Hl>의 편지와 가이드로,
          <br />내 사연만으로 써서 알려 드릴게요.
        </p>
      </div>
    </section>
  );
}

export function MeetWolhwa() {
  return (
    <section className="pb-14">
      <div className="relative">
        <Panel src={V2.greet} alt="손을 내밀며 맞이하는 월화" say={<>당신의 이야기를<br />끝까지 들어 드릴게요.</>} pos="top-6" ratio="aspect-[4/5]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#120e10] to-transparent" />
      </div>
      <div className="mx-5 -mt-10 relative rounded-[1.4rem] border border-gold/30 bg-[#1d181b] px-5 py-5">
        <p className="font-display text-[1.7rem] font-bold text-ivory">
          월화 <span className="text-[1rem] text-gold">月華</span>
        </p>
        <div className="mt-1 h-px w-full bg-gradient-to-r from-gold/50 to-transparent" />
        <ul className="mt-3 flex flex-col gap-1.5 text-[0.9rem] leading-[1.6] text-ivory-dim">
          <li>· 달빛 아래 인연(月下緣)을 읽는 월하연의 이야기 안내자</li>
          <li>· 사연을 읽고, 편지를 쓰고, 오늘 밤의 리추얼을 건네요</li>
          <li>· 생년월일이 아니라 두 사람이 겪은 이야기에서 시작해요</li>
        </ul>
      </div>
    </section>
  );
}

export function Webtoon() {
  return (
    <section className="flex flex-col gap-1.5 pb-14">
      <Panel src={V3.smile} alt="미소 짓는 월화" say={<>혹시…<br />아직 망설이고 계신가요?</>} pos="top-6" />
      <Panel src={V2.listen} alt="편지를 읽는 월화" say={<>관계에는<br />타이밍이 있어요.</>} side="right" pos="bottom-8" />
      <Panel src={V2.write} alt="편지를 쓰는 월화" say={<>오늘 보내지 않은 한 줄이,<br />내일의 대화를 지켜 주기도 해요.</>} pos="top-6" />
      <Panel src={V2.offer} alt="봉투를 건네는 월화" say={<>오늘 밤,<br />같이 천천히 정리해 볼까요?</>} side="right" pos="bottom-8" />
      <div className="mt-8">
        <Cta placement="webtoon" />
      </div>
    </section>
  );
}

const CHECKS = [
  "그 사람에게 계속 연락하고 싶어요",
  "왜 헤어졌는지 아직도 이해가 안 돼요",
  "그 사람의 마음이 어떤지 궁금해요",
  "연락할 타이밍을 모르겠어요",
  "다시 만나도 같은 이유로 싸울까 봐 무서워요",
  "이제는 내 마음부터 정리하고 싶어요",
];

export function Checklist() {
  return (
    <section className="px-5 pb-16">
      <div className="rounded-[1.4rem] bg-[#f7f3ef] px-5 py-7 text-[#312b2d]">
        <p className="text-center text-[0.9rem] text-[#6a5f61]">하나라도 해당된다면?</p>
        <p className="font-display mt-1 text-center text-[1.45rem] font-bold">
          <span className="text-[#a83a57]">월화의 편지</span>가 필요해요
        </p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-[0.94rem] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-[#a83a57] text-[0.7rem] text-white">✓</span>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const WORRIES: Array<[string, "l" | "r"]> = [
  ["기다리면 다시 연락이 올까요?", "l"],
  ["장문으로 사과했는데 단답만 왔어요…", "r"],
  ["차단당했는데 아무것도 못 하나요?", "l"],
  ["다른 사람이 생긴 것 같아서 불안해요", "r"],
  ["다시 만나도 또 싸울까 봐 무서워요", "l"],
];

export function Worries() {
  return (
    <section className="pb-16">
      <div className="px-5 text-center">
        <p className="text-[1.02rem] font-bold text-[#e46b8a]">그 사람과 헤어지고,</p>
        <Big className="mt-2">{"지금 이런 고민\n하고 계신가요?"}</Big>
      </div>
      <div className="mt-8 flex flex-col gap-3 px-5">
        {WORRIES.map(([w, s]) => (
          <p
            key={w}
            className={`w-fit max-w-[82%] rounded-2xl px-4 py-3 text-[0.96rem] text-ivory ${
              s === "l" ? "rounded-tl-md bg-[#2a2427]" : "ml-auto rounded-tr-md bg-[#4a2433]"
            }`}
          >
            {w}
          </p>
        ))}
      </div>
      <p className="mt-10 px-5 text-center text-[1.05rem] leading-[1.8] text-ivory-dim">
        같은 이별은 하나도 없어요.
        <br />
        <b className="text-ivory">그래서 답도, 당신의 이야기에서 찾아야 해요.</b>
      </p>
    </section>
  );
}

export function Prepared() {
  return (
    <section className="pb-12">
      <div className="px-5 text-center">
        <Big>
          그래서
          <br />
          <Hl>준비했어요!</Hl>
        </Big>
      </div>
      <div className="relative mt-6">
        <Panel src={V3.explain} alt="책을 펼쳐 설명하는 월화" say={<>사주를 몰라도 괜찮아요.<br />겪은 이야기만 들려주세요.</>} side="right" pos="top-6" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#120e10] to-transparent" />
      </div>
      <div className="relative -mt-16 px-5 text-center">
        <p className="text-[0.96rem] text-gold">내 사연으로 쓰는 편지와 리추얼</p>
        <p className="font-display mt-1 text-[2rem] font-bold leading-[1.3] text-ivory">
          월화의
          <br />
          관계 리추얼
        </p>
        <p className="mt-3 text-[0.96rem] text-ivory-dim">지금부터 하나씩 보여 드릴게요.</p>
      </div>
    </section>
  );
}
