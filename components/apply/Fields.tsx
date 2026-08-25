"use client";

import { Option } from "@/lib/ritual-types";

/* 선택 카드 (단일 선택) */
export function SingleSelect({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3" role="radiogroup">
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`min-h-13 rounded-xl border px-5 py-4 text-left text-[0.95rem] transition-colors ${
              selected
                ? "border-gold/70 bg-burgundy/30 text-ivory"
                : "border-gold-dim/30 bg-transparent text-ivory-dim active:bg-ivory/5"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* 선택 카드 (복수 선택, 최대 개수/배타 옵션 지원) */
export function MultiSelect({
  options,
  values,
  onChange,
  max,
  exclusiveValues,
}: {
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  max?: number;
  /** 이 목록의 값들은 각각 단독 선택만 가능 ('없음', '답하고 싶지 않음' 등) */
  exclusiveValues?: string[];
}) {
  const toggle = (v: string) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
      return;
    }
    let next = [...values, v];
    if (exclusiveValues && exclusiveValues.length > 0) {
      next = exclusiveValues.includes(v)
        ? [v] // 배타 항목 선택 → 그 항목만 남김
        : next.filter((x) => !exclusiveValues.includes(x)); // 일반 항목 선택 → 배타 항목 자동 해제
    }
    if (max && next.length > max) return; // 최대 개수 초과 시 무시
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {options.map((o) => {
        const selected = values.includes(o.value);
        const atMax = !!max && values.length >= max && !selected;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(o.value)}
            className={`min-h-13 rounded-xl border px-5 py-4 text-left text-[0.95rem] transition-colors ${
              selected
                ? "border-gold/70 bg-burgundy/30 text-ivory"
                : atMax
                  ? "border-gold-dim/15 text-ivory-dim/40"
                  : "border-gold-dim/30 text-ivory-dim active:bg-ivory/5"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* 한 줄 텍스트 입력 */
export function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  return (
    <input
      type={type}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) onEnter();
      }}
      placeholder={placeholder}
      className="h-14 w-full rounded-xl border border-gold-dim/30 bg-ink-soft px-5 text-base text-ivory placeholder:text-ivory-dim/40 focus:border-gold/60 focus:outline-none"
    />
  );
}

/* 여러 줄 입력 + 글자 수 표시 */
export function TextAreaField({
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength: number;
  rows?: number;
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full resize-none rounded-xl border border-gold-dim/30 bg-ink-soft px-5 py-4 text-[0.95rem] leading-relaxed text-ivory placeholder:text-ivory-dim/40 focus:border-gold/60 focus:outline-none"
      />
      <p className="mt-2 text-right text-xs text-ivory-dim/60">
        {value.length.toLocaleString()} / {maxLength.toLocaleString()}
      </p>
    </div>
  );
}

/* 동의 체크 항목 */
export function ConsentCheck({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-4 rounded-xl border px-5 py-4 text-left transition-colors ${
        checked
          ? "border-gold/70 bg-burgundy/25"
          : "border-gold-dim/30 active:bg-ivory/5"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] ${
          checked
            ? "border-gold bg-gold text-ink"
            : "border-gold-dim/50 text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="text-[0.85rem] leading-relaxed text-ivory-dim">
        {label}
        {required && <span className="ml-1 text-gold/80">(필수)</span>}
        {!required && <span className="ml-1 text-ivory-dim/50">(선택)</span>}
      </span>
    </button>
  );
}
