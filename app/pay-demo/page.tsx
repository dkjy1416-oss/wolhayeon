"use client";

/**
 * 11/28 결제 팝업 시안 (운영자 확인용 · 검색 제외 · 실제 결제 없음).
 * 금액은 11/28 운영자 승인안: 첫 구매가 / 정가(두 번째 구매부터) 기준 할인율.
 */
import { useMemo, useState } from "react";
import PackSheet, { type PackOption, type PackService } from "@/components/pay/PackSheet";

const R = 19900; // 재회 정가
const K = 34900; // 카톡 정가 (안)
const B = 45000; // 책 정가 (안) — 전부 패키지가 딱 50%가 되도록
const ALL: PackOption = { key: "all", name: "전부 받기 패키지", desc: "재회 분석 + 카톡 분석 + 120쪽 심층 리포트", price: 49900, regular: R + K + B };
const RK = (name: string): PackOption => ({ key: "rk", name, desc: "카톡 대화로 보는 그 사람 마음 · 다음에 보낼 메시지 3개까지", price: 29900, regular: R + K, badge: "추천" });
const RB = (name: string): PackOption => ({ key: "rb", name, desc: "내 사연으로 만든 120쪽 심층 리포트까지", price: 39900, regular: R + B, badge: "추천" });

export default function PayDemo() {
  const [svc, setSvc] = useState<PackService | null>(null);
  const [sel, setSel] = useState("");
  /* 재회 분석의 두 번째 선택지는 손님마다 무작위 (재회+카톡 / 재회+책) */
  const ritualSecond = useMemo(() => (Math.random() < 0.5 ? "rk" : "rb"), []);
  const opts: Record<PackService, PackOption[]> = {
    ritual: [
      { key: "r", name: "월화의 재회 분석", desc: "내 사연으로 쓴 편지 · 연락 기준 · 24시간·7일·21일 가이드", price: 12900, regular: R },
      ritualSecond === "rk" ? RK("재회 분석 + 카톡 분석") : RB("재회 분석 + 심층 리포트"),
      ALL,
    ],
    chat: [
      { key: "k", name: "카톡 해석 리포트", desc: "그 사람 마음 해석 · 보내면 안 되는 문장 · 다음 메시지 3개", price: 24900, regular: K },
      { ...RK("카톡 분석 + 재회 분석"), desc: "내 사연으로 쓴 재회 분석(편지·리추얼·21일 가이드)까지" },
      ALL,
    ],
    book: [
      { key: "b", name: "120쪽 심층 리포트", desc: "내 이름으로 만든 PDF 책 한 권", price: 29000, regular: B },
      { ...RB("심층 리포트 + 재회 분석"), desc: "내 사연으로 쓴 재회 분석(편지·리추얼·21일 가이드)까지" },
      ALL,
    ],
  };
  const open = (s: PackService) => {
    setSvc(s);
    setSel(opts[s][1].key);
  };
  return (
    <main className="min-h-[100svh] bg-[#f6f1ec] px-5 py-14 text-[#1d1418]">
      <p className="text-[0.8rem] text-[#8a7f83]">운영자 확인용 시안 · 실제 결제 없음</p>
      <h1 className="mt-2 text-[1.4rem] font-bold">결제 팝업 시안</h1>
      <div className="mt-6 flex flex-col gap-3">
        {([
          ["ritual", "재회 분석에서 결제 누르기"],
          ["chat", "카톡 분석에서 결제 누르기"],
          ["book", "심층 리포트에서 결제 누르기"],
        ] as const).map(([k, t]) => (
          <button key={k} type="button" onClick={() => open(k)} className="h-14 rounded-2xl bg-[#7a1f3d] font-bold text-white">
            {t}
          </button>
        ))}
      </div>
      <p className="mt-4 text-[0.78rem] leading-relaxed text-[#8a7f83]">
        처음엔 추천(두 번째)이 골라져 있어요. 재회 분석의 두 번째 선택지는 열 때마다 무작위로 재회+카톡 / 재회+심층 리포트가 나와요(새로고침하면 바뀜).
      </p>
      {svc && (
        <PackSheet open service={svc} options={opts[svc]} selected={sel} onSelect={setSel} onClose={() => setSvc(null)} onPay={() => setSvc(null)} />
      )}
    </main>
  );
}
