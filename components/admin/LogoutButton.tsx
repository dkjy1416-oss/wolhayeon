"use client";


export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/admin/login";
      }}
      className="rounded-full border border-gold-dim/40 px-4 py-2 text-xs text-ivory-dim hover:border-gold/60 hover:text-ivory"
    >
      로그아웃
    </button>
  );
}
