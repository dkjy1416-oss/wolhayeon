import { redirect } from "next/navigation";

/* 11/27 운영자 요청: 프로토타입은 메인(/)으로 옮김 — 예전 주소로 오면 메인으로 */
export default function ApplyV2Page() {
  redirect("/");
}
