"use client";

/**
 * 홈 '지금 내 상황은' 카드 → /apply?sit=1~4
 * 고른 상황을 신청서 초안의 첫 선택(마음이 힘든 점·연락 상태)으로만 채운다.
 * 이미 고른 값이 있으면 건드리지 않고, 고객은 질문 화면에서 언제든 바꿀 수 있다.
 */
import { useEffect } from "react";
import { loadApplication, saveApplication } from "@/lib/ritual-storage";

const MAP: Record<string, { pain: string[]; contact?: string }> = {
  "1": { pain: ["waiting_contact"], contact: "no_contact" },
  "2": { pain: ["curious_feelings", "regret_my_fault"] },
  "3": { pain: ["want_restart"] },
  "4": { pain: ["checking_sns", "cant_forget"] },
};

export default function SitCapture() {
  useEffect(() => {
    try {
      const k = new URLSearchParams(window.location.search).get("sit") ?? "";
      const m = MAP[k];
      if (!m) return;
      const a = loadApplication();
      const next = { ...a };
      if (!a.pain_points.length) next.pain_points = m.pain;
      if (m.contact && !a.contact_status) next.contact_status = m.contact;
      saveApplication(next);
    } catch {
      /* 무시 */
    }
  }, []);
  return null;
}
