/**
 * 책 HTML → PDF (서버 전용, 서버리스 Chromium).
 *
 * 서버리스 Chromium에는 한글 글꼴이 없으므로, 원고 글꼴(구글 폰트 공식 저장소의 TTF)을
 * 받아 @font-face(data URL)로 문서에 직접 넣는다. 같은 인스턴스에서는 메모리 캐시 재사용.
 */
import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const FONT_BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/";
const FONTS: Array<{ family: string; weight: number; file: string }> = [
  { family: "Gowun Batang", weight: 400, file: "gowunbatang/GowunBatang-Regular.ttf" },
  { family: "Gowun Batang", weight: 700, file: "gowunbatang/GowunBatang-Bold.ttf" },
  { family: "Nanum Myeongjo", weight: 400, file: "nanummyeongjo/NanumMyeongjo-Regular.ttf" },
  { family: "Nanum Myeongjo", weight: 700, file: "nanummyeongjo/NanumMyeongjo-Bold.ttf" },
  { family: "Nanum Myeongjo", weight: 800, file: "nanummyeongjo/NanumMyeongjo-ExtraBold.ttf" },
];

/* 한자 5자(月下緣華正) 전용 소형 글꼴 — Noto Serif CJK KR(SIL OFL) 부분 추출본.
   원고 글꼴에 없는 한자만 unicode-range로 이 글꼴이 대신 그린다. */
const HANJA_B64 =
  "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";
const HANJA_CSS = ["Gowun Batang", "Nanum Myeongjo"]
  .map(
    (fam) =>
      `@font-face{font-family:'${fam}';src:url(data:font/ttf;base64,${HANJA_B64}) format('truetype');unicode-range:U+4E00-9FFF;}`
  )
  .join("\n");

let fontCss: Promise<string> | null = null;

function loadFontCss(): Promise<string> {
  if (!fontCss) {
    fontCss = Promise.all(
      FONTS.map(async (f) => {
        const r = await fetch(FONT_BASE + f.file);
        if (!r.ok) throw new Error(`font_fetch_${r.status}`);
        const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
        return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
      })
    )
      .then((parts) => parts.join("\n") + "\n" + HANJA_CSS)
      .catch((e) => {
        fontCss = null;
        throw e;
      });
  }
  return fontCss;
}

export async function renderBookPdf(html: string): Promise<Buffer> {
  const css = await loadFontCss();
  const doc = html.replace("</head>", `<style>${css}</style></head>`);
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(doc, { waitUntil: "load", timeout: 90_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      timeout: 120_000,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}
