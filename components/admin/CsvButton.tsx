"use client";

/** 지금 화면 목록을 엑셀에서 열리는 CSV로 내려받기 (한글 깨짐 방지 BOM 포함) */
export default function CsvButton({
  filename,
  header,
  rows,
  label = "엑셀(CSV) 내려받기",
}: {
  filename: string;
  header: string[];
  rows: (string | number | null)[][];
  label?: string;
}) {
  const download = () => {
    const esc = (v: string | number | null) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = String.fromCharCode(0xfeff) + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="h-9 shrink-0 rounded-full border border-gold-dim/50 px-4 text-[0.78rem] text-ivory disabled:opacity-40"
    >
      {label}
    </button>
  );
}
