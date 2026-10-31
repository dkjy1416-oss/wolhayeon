/**
 * 10/16 3차 상세페이지형 홈 — 뒷부분 (POINT 1~5 · 책 · 마지막 버튼)
 * 예시 화면·예시 답변은 가상 사연('지수'님)으로 만든 실제 결과 형식 — 화면에 '예시'로 표시.
 */
import Image from "next/image";
import Link from "next/link";
import LoopVideo from "@/components/book/LoopVideo";
import PageFlipper from "@/components/book/PageFlipper";
import { BOOK_SAMPLE_PAGES } from "@/lib/book/book-pages";
import { PRODUCTS } from "@/lib/ritual-types";
import { CONTENT_VIEW_DAYS } from "@/lib/content-access-policy";
import { REFUND_WINDOW_DAYS } from "@/lib/refund-policy";
import { PRICE } from "@/components/home2/content";
import { V2 } from "@/components/home2/media";
import { Cta, Phone } from "./parts";

function PointHead({ n, title, sub }: { n: number; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="px-5 text-center">
      <span className="font-display block text-[0.78rem] font-bold tracking-[0.35em] text-[#a83a57]">POINT</span>
      <span className="font-display block bg-gradient-to-b from-[#a83a57] to-[#e8b04a] bg-clip-text text-[3.2rem] font-black leading-none text-transparent">{String(n).padStart(2, "0")}</span>
      <h2 className="font-display mt-3 text-[1.7rem] font-black leading-[1.38] text-[#2a2326]">{title}</h2>
      {sub && <p className="mt-3 text-[0.95rem] leading-[1.75] text-[#6a5f61]">{sub}</p>}
    </div>
  );
}
const R = ({ children }: { children: React.ReactNode }) => <span className="text-[#a83a57]">{children}</span>;

export function Point1() {
  return (
    <section className="py-16">
      <PointHead
        n={1}
        title={<>내 이야기로만 쓴<br /><R>한 통의 편지</R>로 시작해요</>}
        sub={<>똑같은 문장 대신, 들려준 사연 속 말과 날짜로<br />월화가 처음부터 다시 써요.</>}
      />
      <div className="mt-9 flex items-start justify-center gap-0 overflow-hidden px-2">
        <div className="-mr-16 mt-10 scale-[0.86]">
          <Phone tilt="-rotate-6">
            <p className="text-[0.62rem] tracking-[0.15em] text-[#8a6a33]">02 · 우리 관계 읽기</p>
            <p className="font-display mt-1 text-[0.95rem] font-bold">사과는 길었고, 답은 짧았어요</p>
            <p className="mt-2">긴 사과 뒤의 짧은 답은 ‘마음이 닫혔다’로도, ‘아직 정리 중이다’로도 읽힐 수 있어요.</p>
            <p className="mt-2 rounded-lg bg-white px-2.5 py-2"><b className="text-[#a83a57]">반복된 패턴</b> · 서운함을 바로 말하지 않고 쌓아 두다가 한 번에 터졌어요.</p>
          </Phone>
        </div>
        <div className="relative z-10">
          <Phone>
            <p className="text-[0.62rem] tracking-[0.15em] text-[#8a6a33]">01 · 월화의 편지</p>
            <p className="font-display mt-1 text-[1.05rem] font-bold">지수님에게</p>
            <p className="mt-2">3주 동안 하루에도 몇 번씩 대화창을 열었다 닫았을 거예요. 길게 쓴 사과에 돌아온 네 글자가, 그동안의 시간 전부를 대답하는 것처럼 느껴졌겠죠.</p>
            <p className="mt-2">그 답이 두 사람의 끝을 정한 건 아니에요. 다만 지금은 그 문장을 다시 해석하는 일보다, 지수님이 오늘 하루를 어떻게 지나갈지가 먼저예요.</p>
            <p className="font-display mt-3 text-right text-[#8a6a33]">— 월화</p>
          </Phone>
        </div>
      </div>
      <p className="mt-4 text-center text-[0.76rem] text-[#6a5f61]">가상 사연 예시 화면 · 내 결과는 내 사연으로 써져요</p>
    </section>
  );
}

export function Point2() {
  return (
    <section className="bg-[#efe7df] py-16">
      <PointHead
        n={2}
        title={<>지금 내 상황과 시기에 맞춘<br /><R>구체적인 답</R></>}
        sub={<>마지막 대화, 지금의 연락 상태, 반복된 갈등까지 보고<br />월화가 정리한 10가지 상황별 대응 가이드를 함께 참고해요.</>}
      />
      <div className="mt-8 flex flex-col gap-3 px-5">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-[#a83a57] px-4 py-3 text-[0.95rem] text-[#fbf7f2]">
          3주 전에 헤어졌어요. 지금 연락해도 될까요?
          <span className="mt-1 block text-[0.7rem] opacity-80">가상 사연 · 지수님</span>
        </div>
        <div className="flex items-end gap-2.5">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#d9c9a8]">
            <Image src={V2.listen} alt="" fill sizes="48px" className="object-cover object-[50%_18%]" />
          </div>
          <div className="min-w-0 rounded-2xl rounded-bl-md bg-white px-4 py-4 text-[0.9rem] leading-[1.7] text-[#312b2d] shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <p className="text-[0.74rem] font-bold text-[#a83a57]">① 연락을 고려할 조건</p>
            <p>마지막 대화 뒤 2주 이상 지났고, SNS를 보고 바로 반응하고 싶은 마음이 가라앉았을 때 — 한 번만.</p>
            <p className="mt-2.5 text-[0.74rem] font-bold text-[#a83a57]">② 첫 메시지 초안</p>
            <p className="font-display">“요즘 날이 많이 추워졌더라. 감기 조심해.”</p>
            <p className="mt-2.5 text-[0.74rem] font-bold text-[#a83a57]">③ 반응별 다음 행동</p>
            <p>따뜻한 답 → 같은 온도로 한 번만 · 단답 → 그대로 마무리 · 무응답 → 다시 보내지 않기</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[0.76rem] text-[#6a5f61]">가상 사연 예시 · 내 결과의 조건·문장·기간은 사연에 따라 달라져요</p>
    </section>
  );
}

export function Point3() {
  const rows: Array<[string, string, string]> = [
    ["무엇을 보나요", "생년월일 · 타고난 운", "두 사람이 실제로 겪은 사연"],
    ["무엇이 반영되나요", "같은 생일이면 비슷한 풀이", "마지막 대화 · 연락 상태 · 반복된 갈등"],
    ["무엇을 받나요", "시기와 흐름 중심의 이야기", "연락 기준 · 문장 초안 · 날짜별 실천"],
  ];
  return (
    <section className="py-16">
      <PointHead n={3} title={<>생년월일 풀이와<br /><R>무엇이 다를까요?</R></>} />
      <div className="mx-5 mt-8 overflow-hidden rounded-[1.2rem] border border-[#d9c9a8] bg-white text-[0.86rem] leading-[1.55]">
        <div className="grid grid-cols-[4.6rem_1fr_1fr] bg-[#f1ebe4] text-center text-[0.78rem] font-bold">
          <span className="py-2.5" />
          <span className="py-2.5 text-[#6a5f61]">일반적인 운세 풀이</span>
          <span className="bg-[#a83a57] py-2.5 text-[#fbf7f2]">월하연</span>
        </div>
        {rows.map(([k, a, b]) => (
          <div key={k} className="grid grid-cols-[4.6rem_1fr_1fr] border-t border-[#efe7df]">
            <span className="px-2 py-3 text-[0.74rem] font-bold text-[#8a6a33]">{k}</span>
            <span className="px-2.5 py-3 text-[#6a5f61]">{a}</span>
            <span className="bg-[#fbf2f4] px-2.5 py-3 font-semibold text-[#2a2326]">{b}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 px-6 text-center text-[0.82rem] leading-[1.7] text-[#6a5f61]">상대의 속마음이나 재회를 장담하지 않아요. 대신 지금 내가 할 일과 멈출 일을 분명하게 정리해요.</p>
    </section>
  );
}

const TOC: Array<{ ch: string; title: string; items: string[]; say: string }> = [
  { ch: "1장", title: "월화의 편지", items: ["당신에게 쓰는 첫 편지"], say: "마음이 가장 시끄러운 밤에, 처음부터 천천히 읽어요." },
  { ch: "2장", title: "우리 관계 읽기", items: ["두 사람의 이야기", "지금의 감정", "반복된 패턴", "내가 진짜 바라는 것"], say: "왜 같은 곳에서 엉켰는지 보이면, 다음이 보여요." },
  { ch: "3장", title: "지금 할 수 있는 것", items: ["연락 기준", "보낼 문장 초안", "답이 오면 · 단답이면 · 없으면"], say: "보낼지 말지, 보낸다면 무엇을. 여기서 정해요." },
  { ch: "4장", title: "나만의 리추얼", items: ["리추얼의 의미", "준비물", "진행 순서", "나에게 건네는 말"], say: "보내고 싶은 말이 차오를 때 휴대폰 대신 펼쳐요." },
  { ch: "5장", title: "실천 가이드", items: ["첫날 할 일", "7일 가이드", "21일 계획"], say: "날짜별로 하나씩만. 그게 제일 오래가요." },
  { ch: "마지막", title: "마지막 편지", items: ["21일 뒤의 나에게"], say: "끝까지 온 당신에게 건네는 한 장." },
];

export function Point4() {
  return (
    <section className="bg-[#efe7df] py-16">
      <PointHead n={4} title={<>편지부터 21일 계획까지<br /><R>14장으로 받는 전체 구성</R></>} />
      <div className="mx-5 mt-8 rounded-[1.2rem] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
        {TOC.map((t, i) => (
          <div key={t.title} className={i ? "mt-5 border-t border-[#efe7df] pt-5" : ""}>
            <p className="flex items-baseline gap-2">
              <span className="text-[0.8rem] font-bold text-[#a83a57]">{t.ch}</span>
              <span className="font-display text-[1.12rem] font-bold text-[#2a2326]">{t.title}</span>
            </p>
            <p className="mt-1 text-[0.86rem] text-[#6a5f61]">{t.items.join(" · ")}</p>
            <p className="font-display mt-2 w-fit rounded-xl rounded-tl-sm bg-[#f7f3ef] px-3 py-2 text-[0.86rem] text-[#312b2d]">
              <span className="mr-1 text-[#8a6a33]">월화</span> {t.say}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-3 gap-1.5 px-5">
        {[V2.ritual1, V2.ritual2, V2.ritual3].map((s, i) => (
          <div key={s} className="relative aspect-[4/5] overflow-hidden rounded-xl">
            <Image src={s} alt={`리추얼 ${i + 1}단계`} fill sizes="160px" className="object-cover" />
            <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[0.74rem] text-[#f3ece4]">{i + 1}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[0.76rem] text-[#6a5f61]">4장 · 나만의 리추얼 예시 — 적기 · 나누기 · 접어 두기</p>
    </section>
  );
}

export function Point5() {
  const p = PRODUCTS.message;
  return (
    <section id="price" className="scroll-mt-16 py-16">
      <PointHead n={5} title={<>한 번의 결제로<br /><R>부담 없이</R> 받아요</>} sub="미리보기는 무료 · 전체 구성이 필요할 때만 1회 결제" />
      <div className="mx-5 mt-8 overflow-hidden rounded-[1.4rem] border-2 border-[#a83a57] bg-white shadow-[0_10px_30px_rgba(168,58,87,0.15)]">
        <div className="relative aspect-[16/10] w-full">
          <Image src={V2.set} alt="편지 · 리추얼 카드 · 실천 가이드" fill sizes="480px" className="object-cover" />
        </div>
        <div className="px-5 py-5">
          <p className="font-display text-[1.35rem] font-bold text-[#2a2326]">{p.name}</p>
          <p className="mt-1 text-[0.84rem] text-[#6a5f61]">{p.tagline}</p>
          <div className="mt-4 flex items-end justify-between border-t border-[#efe7df] pt-4">
            <div>
              <p className="text-[0.8rem] text-[#6a5f61]">미리보기 후 24시간 첫 구매</p>
              <p className="text-[0.9rem] text-[#9a8f91] line-through">{PRICE.regular.toLocaleString()}원</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="whitespace-nowrap rounded-full bg-[#fbe9ee] px-2 py-0.5 text-[0.76rem] font-bold text-[#a83a57]">{PRICE.save.toLocaleString()}원 할인</span>
              <p className="whitespace-nowrap">
                <span className="text-[2rem] font-extrabold text-[#a83a57]">{PRICE.first.toLocaleString()}</span>
                <span className="text-[1rem] font-bold text-[#2a2326]">원</span>
              </p>
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-1.5 text-center text-[0.74rem] leading-[1.5] text-[#312b2d]">
            <li className="rounded-lg bg-[#f7f3ef] px-2 py-2">1회 결제 · 정기결제 없음</li>
            <li className="rounded-lg bg-[#f7f3ef] px-2 py-2">결제 후 보통 1~3분</li>
            <li className="rounded-lg bg-[#f7f3ef] px-2 py-2">{CONTENT_VIEW_DAYS}일 동안 다시 열람</li>
            <li className="rounded-lg bg-[#f7f3ef] px-2 py-2">열기 전 {REFUND_WINDOW_DAYS}일 안 전액 환불</li>
          </ul>
        </div>
      </div>
      <div className="mt-6">
        <Cta placement="price" label="무료 미리보기부터 받기" />
      </div>
    </section>
  );
}

export function BookAddon() {
  return (
    <section className="bg-[#efe7df] py-16">
      <div className="px-5 text-center">
        <p className="text-[0.86rem] font-bold text-[#8a6a33]">더 오래 곁에 두고 싶다면</p>
        <h2 className="mt-2 text-[1.45rem] font-extrabold leading-[1.42] text-[#2a2326]">
          내 이름으로 만든 <span className="text-[#a83a57]">한 권의 책</span>
        </h2>
        <p className="mt-3 text-[0.92rem] leading-[1.75] text-[#6a5f61]">흔들릴 때마다 다시 펼치는 상황별 문장 · 체크리스트 · 7일/21일 기록장 · 약 120쪽 PDF</p>
      </div>
      <div className="relative mx-auto mt-6 aspect-square w-[78%]">
        <Image src="/book/v2/cover-3d.webp" alt="개인 맞춤 PDF 책 표지" fill sizes="380px" className="object-contain drop-shadow-[0_24px_40px_rgba(49,43,45,0.35)]" />
      </div>
      <div className="mt-6 px-5">
        <PageFlipper pages={BOOK_SAMPLE_PAGES} />
        <p className="mt-2 text-center text-[0.76rem] text-[#6a5f61]">실제 책 페이지 · 가상 사연 예시</p>
      </div>
      <p className="mt-5 text-center text-[0.92rem] text-[#312b2d]">
        책만 {PRICE.book.toLocaleString()}원 · 관계 리추얼과 함께 미리보기 후 24시간 <b className="text-[#a83a57]">{PRICE.bundleFirst.toLocaleString()}원</b>
      </p>
      <div className="mt-3 text-center">
        <Link href="/book" className="inline-flex h-11 items-center justify-center rounded-full border border-[#a83a57] px-6 text-[0.9rem] font-bold text-[#a83a57]">
          책 자세히 보기
        </Link>
      </div>
    </section>
  );
}

export function Finale() {
  return (
    <section id="final-cta" className="relative overflow-hidden">
      <div className="relative aspect-[3/4] w-full">
        <LoopVideo src={V2.moonVideo} poster={V2.moon} className="h-full w-full object-cover object-[62%_50%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120e10]/70 via-transparent to-[#120e10]" />
        <div className="absolute inset-x-0 top-10 px-5 text-center">
          <p className="font-display text-[1.1rem] text-gold">나의 소중한 인연을</p>
          <h2 className="mt-1 text-[1.75rem] font-extrabold leading-[1.4] text-ivory">
            다시 들여다볼,
            <br />
            오늘 밤
          </h2>
        </div>
        <p className="font-display absolute bottom-24 right-4 max-w-[70%] rounded-[22px] rounded-br-md bg-[#fbf7f1] px-4 py-3 text-[1rem] leading-[1.55] text-[#2a2326] shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          당신의 이야기,
          <br />
          지금 들려주세요.
        </p>
      </div>
      <div className="-mt-10 relative pb-16">
        <Cta placement="final" />
      </div>
    </section>
  );
}
