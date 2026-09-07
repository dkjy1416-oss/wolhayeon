import { redirect } from "next/navigation";

/**
 * (구) "이야기를 모두 들었습니다" 가격 화면 — 흐름 재정비로 제거.
 * 결제 전 가격 노출 없이 confirm → 미리보기로 바로 이어지도록
 * 이 경로는 내용 확인 화면으로 되돌린다. (구 링크/북마크 안전)
 */
export default function ReadyPage() {
  redirect("/apply/confirm");
}
