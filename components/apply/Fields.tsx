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

/* ------------------------------------------------------------------ */
/*  EmailField — [아이디] @ [도메인 선택▾] (+직접 입력) + 오타 제안       */
/* ------------------------------------------------------------------ */
import { useEffect as useEffectEmail, useState as useStateEmail } from "react";
import {
  EMAIL_DOMAINS,
  CUSTOM_DOMAIN_VALUE,
  normalizeEmailId,
  normalizeDomain,
  composeEmail,
  suggestDomainFix,
} from "@/lib/email-suggest";

export function EmailField({
  value,
  onChange,
}: {
  /** 완성된 이메일 문자열 (DB 저장 형식 그대로) */
  value: string;
  onChange: (email: string) => void;
}) {
  /* 기존 값 복원: abc@naver.com → id/도메인 분리 */
  const [id, setId] = useStateEmail("");
  const [domainSel, setDomainSel] = useStateEmail<string>(EMAIL_DOMAINS[0]);
  const [customDomain, setCustomDomain] = useStateEmail("");
  const [dismissedFix, setDismissedFix] = useStateEmail<string | null>(null);
  const [restored, setRestored] = useStateEmail(false);

  useEffectEmail(() => {
    if (restored) return;
    setRestored(true);
    const at = value.indexOf("@");
    if (at > 0) {
      const vid = value.slice(0, at);
      const vdomain = value.slice(at + 1).toLowerCase();
      setId(vid);
      if ((EMAIL_DOMAINS as readonly string[]).includes(vdomain)) {
        setDomainSel(vdomain);
      } else {
        setDomainSel(CUSTOM_DOMAIN_VALUE);
        setCustomDomain(vdomain);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDomain =
    domainSel === CUSTOM_DOMAIN_VALUE ? customDomain : domainSel;

  const emit = (nextId: string, nextDomain: string) => {
    onChange(composeEmail(nextId, nextDomain));
  };

  const fix =
    domainSel === CUSTOM_DOMAIN_VALUE ? suggestDomainFix(customDomain) : null;
  const showFix =
    !!fix && fix !== normalizeDomain(customDomain) && dismissedFix !== fix;

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          value={id}
          onChange={(e) => {
            const v = normalizeEmailId(e.target.value);
            setId(v);
            emit(v, activeDomain);
          }}
          placeholder="이메일 아이디"
          className="h-14 w-0 flex-1 rounded-xl border border-gold-dim/30 bg-ink-soft px-4 text-base text-ivory placeholder:text-ivory-dim/40 focus:border-gold/60 focus:outline-none"
        />
        <span className="text-ivory-dim">@</span>
        <select
          value={domainSel}
          onChange={(e) => {
            const v = e.target.value;
            setDomainSel(v);
            setDismissedFix(null);
            emit(id, v === CUSTOM_DOMAIN_VALUE ? customDomain : v);
          }}
          className="h-14 w-[9.5rem] shrink-0 rounded-xl border border-gold-dim/30 bg-ink-soft px-3 text-[0.95rem] text-ivory focus:border-gold/60 focus:outline-none"
        >
          {EMAIL_DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          <option value={CUSTOM_DOMAIN_VALUE}>직접 입력</option>
        </select>
      </div>

      {domainSel === CUSTOM_DOMAIN_VALUE && (
        <input
          type="text"
          inputMode="email"
          autoCapitalize="none"
          value={customDomain}
          onChange={(e) => {
            const v = normalizeDomain(e.target.value);
            setCustomDomain(v);
            setDismissedFix(null);
            emit(id, v);
          }}
          placeholder="도메인 직접 입력 (예: company.co.kr)"
          className="mt-3 h-14 w-full rounded-xl border border-gold-dim/30 bg-ink-soft px-4 text-base text-ivory placeholder:text-ivory-dim/40 focus:border-gold/60 focus:outline-none"
        />
      )}

      {/* 오타 의심 시 — 자동 변경하지 않고 제안만 */}
      {showFix && (
        <div className="mt-3 rounded-xl border border-gold/40 bg-ink-soft px-4 py-3">
          <p className="text-sm text-ivory">
            혹시 <span className="text-gold">{fix}</span>을 입력하려고
            하셨나요?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCustomDomain(fix!);
                emit(id, fix!);
              }}
              className="rounded-full border border-gold/50 px-4 py-1.5 text-xs text-gold"
            >
              {fix}(으)로 변경
            </button>
            <button
              type="button"
              onClick={() => setDismissedFix(fix!)}
              className="rounded-full border border-gold-dim/40 px-4 py-1.5 text-xs text-ivory-dim"
            >
              그대로 사용
            </button>
          </div>
        </div>
      )}

      {value && (
        <p className="mt-3 text-center text-sm text-ivory-dim">
          입력된 주소: <span className="text-ivory">{value}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  YearSelect — 출생연도 선택 dropdown (모바일 네이티브 셀렉트)          */
/* ------------------------------------------------------------------ */
const YEAR_SELECT_MIN = 1940;

export function YearSelect({
  value,
  onChange,
  includeUnknown = false,
  unknownLabel = "모름",
  placeholder = "출생연도를 선택해주세요",
}: {
  /** 선택된 연도 (미선택/모름 = null) */
  value: number | null;
  onChange: (year: number | null) => void;
  /** true면 첫 옵션으로 '모름'(null) 제공 (상대방용) */
  includeUnknown?: boolean;
  unknownLabel?: string;
  placeholder?: string;
}) {
  const nowYear = new Date().getFullYear();
  const maxYear = nowYear - 10; // 기존 공통 validation(isRealisticBirthYear)과 동일한 상한
  const years: number[] = [];
  for (let y = maxYear; y >= YEAR_SELECT_MIN; y--) years.push(y);

  return (
    <select
      value={value === null ? (includeUnknown ? "unknown" : "") : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" || v === "unknown" ? null : Number(v));
      }}
      className="h-14 w-full appearance-none rounded-xl border border-gold-dim/30 bg-ink-soft px-4 text-base text-ivory focus:border-gold/60 focus:outline-none"
    >
      {includeUnknown ? (
        <option value="unknown">{unknownLabel}</option>
      ) : (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {years.map((y) => (
        <option key={y} value={y}>
          {y}년
        </option>
      ))}
    </select>
  );
}
