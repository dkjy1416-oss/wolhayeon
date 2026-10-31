/** 카톡 분석 결과 화면 (손님 결과 · 관리자 미리보기 공용) */
import Link from "next/link";
import InView from "@/components/fx/InView";
import SplitWords from "@/components/fx/SplitWords";
import type { ChatOrder, ChatResult } from "@/lib/chat/types";

const VIEW_DAYS = 30;

export default function ChatResultView({
  o,
  r,
  orderNumber,
  bundleHref,
}: {
  o: ChatOrder;
  r: ChatResult;
  orderNumber: string;
  bundleHref: string | null;
}) {
  const partner = o.partner_label || "그 사람";
  const sec = "mt-8";
  const h = "fx-kicker text-gold";
  const card = "fx-glass mt-3 rounded-2xl px-5 py-4";
  return (
    <article className="mx-auto max-w-[620px]">
      <p className="text-[0.74rem] tracking-[0.2em] text-gold">月下緣 · 카톡 대화 분석</p>
      <SplitWords as="h1" className="font-display mt-3 block text-[1.85rem] font-black leading-[1.3]" wordClassName="fx-shine" text={r.type_label} />
      <p className="mt-3 text-[1rem] leading-[1.9] text-ivory">{r.summary}</p>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>두 사람의 대화 온도</p>
        <div className={card}>
          {[
            [o.name || "나", r.temperature.me],
            [partner, r.temperature.partner],
          ].map(([k, v]) => (
            <div key={String(k)} className="mt-2 first:mt-0">
              <div className="flex justify-between text-[0.86rem] text-ivory">
                <span>{k}</span>
                <span className="tabular-nums">{v}°</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink">
                <div className="fx-bar h-full rounded-full bg-gradient-to-r from-[#8a2442] to-[#e46b8a]" style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}
          <p className="mt-3 text-[0.8rem] leading-[1.7] text-ivory-dim">{r.temperature.note}</p>
        </div>
      </InView>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>대화의 균형</p>
        <div className={`${card} flex flex-col gap-2 text-[0.9rem] leading-[1.8] text-ivory`}>
          <p><b>먼저 말 거는 쪽</b> · {r.balance.first_contact}</p>
          <p><b>메시지 길이</b> · {r.balance.length}</p>
          <p><b>답장 속도</b> · {r.balance.reply_speed}</p>
        </div>
      </InView>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>대화가 달라진 지점</p>
        {r.turning_points.map((x, i) => (
          <div key={i} className={card}>
            <p className="text-[0.8rem] text-[#e46b8a]">{x.when}</p>
            <p className="mt-1 text-[0.92rem] leading-[1.85] text-ivory">{x.what}</p>
          </div>
        ))}
      </InView>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>{partner}의 신호</p>
        <div className={`${card} text-[0.9rem] leading-[1.8]`}>
          <p className="font-semibold text-ivory">긍정적으로 볼 수 있는 것</p>
          <ul className="mt-1 text-ivory">{r.partner_signals.positive.map((x) => <li key={x}>· {x}</li>)}</ul>
          <p className="mt-3 font-semibold text-ivory">조심해서 봐야 할 것</p>
          <ul className="mt-1 text-ivory">{r.partner_signals.caution.map((x) => <li key={x}>· {x}</li>)}</ul>
        </div>
      </InView>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>내가 반복하고 있는 말 습관</p>
        {r.my_patterns.map((x) => (
          <div key={x.pattern} className={card}>
            <p className="text-[0.93rem] font-medium text-ivory">{x.pattern}</p>
            <p className="mt-1 text-[0.85rem] leading-[1.8] text-ivory-dim">{x.why_it_hurts}</p>
          </div>
        ))}
      </InView>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>지금 보내면 안 되는 말</p>
        {r.avoid_messages.map((x) => (
          <div key={x.text} className={card}>
            <p className="text-[0.93rem] text-ivory">✕ “{x.text}”</p>
            <p className="mt-1 text-[0.85rem] leading-[1.8] text-ivory-dim">{x.why}</p>
          </div>
        ))}
      </InView>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>다음에 보낼 메시지 (부담 낮은 순서)</p>
        {r.next_messages.map((x, i) => (
          <div key={i} className="mt-3 rounded-2xl border border-[#e46b8a]/40 bg-[#e46b8a]/10 px-5 py-4">
            <p className="w-fit max-w-full rounded-2xl rounded-tr-md bg-[#fee500] px-3.5 py-2 text-[0.93rem] text-[#191919]">{x.text}</p>
            <p className="mt-2 text-[0.84rem] leading-[1.75] text-ivory"><b>의도</b> · {x.intent}</p>
            <p className="text-[0.84rem] leading-[1.75] text-ivory-dim"><b>예상 반응</b> · {x.likely_response}</p>
          </div>
        ))}
      </InView>

      <InView as="section" className={`reveal ${sec}`} threshold={0.1}>
        <p className={h}>실천 계획</p>
        {r.plan.map((x) => (
          <div key={x.period} className={card}>
            <p className="text-[0.86rem] font-semibold text-[#e46b8a]">{x.period}</p>
            <ul className="mt-1 text-[0.9rem] leading-[1.8] text-ivory">{x.actions.map((a) => <li key={a}>· {a}</li>)}</ul>
          </div>
        ))}
      </InView>

      <p className="mt-8 text-[0.98rem] leading-[1.95] text-ivory">{r.closing}</p>

      {bundleHref && (
        <div className="mt-10 rounded-2xl border-2 border-[#e46b8a]/70 bg-ink-soft px-5 py-5 text-center">
          <p className="text-[0.95rem] font-semibold text-ivory">패키지에 포함된 재회 분석이 남아 있어요</p>
          <p className="mt-1 text-[0.84rem] text-ivory-dim">사연을 들려주시면 편지·리추얼·21일 가이드까지 추가 결제 없이 받아요.</p>
          <Link href={bundleHref} className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-b from-burgundy to-burgundy-deep font-semibold text-ivory">
            재회 분석 이어서 받기
          </Link>
        </div>
      )}

      <p className="mt-10 text-center text-[0.74rem] leading-[1.8] text-ivory-dim">
        이 결과는 올려 주신 대화에서 보이는 패턴을 바탕으로 한 참고 의견이에요. 관계의 결과를 보장하지 않아요.
        <br />
        올려 주신 캡처는 분석 직후 삭제했어요 · {VIEW_DAYS}일 동안 열람 · 주문번호 {orderNumber}
      </p>
    </article>
  );
}
