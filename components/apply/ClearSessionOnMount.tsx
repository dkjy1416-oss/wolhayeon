"use client";

/** 결제 완료 화면에서 신청 세션 데이터 정리 (1회) */
import { useEffect } from "react";
import { clearApplication } from "@/lib/ritual-storage";

export default function ClearSessionOnMount() {
  useEffect(() => {
    clearApplication();
  }, []);
  return null;
}
