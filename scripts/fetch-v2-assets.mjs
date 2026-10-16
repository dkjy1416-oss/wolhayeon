/**
 * 10/16 리디자인 2차 — 새 월화 이미지·영상을 빌드 때 받아 public/wolhwa/v2/ 에 둔다.
 * (원본은 Higgsfield에서 생성 · 저장소에 큰 파일을 올리지 않기 위해 빌드 때 받아서 압축)
 * - 이미지: 가로 최대 1200px webp
 * - 영상: 가로 최대 720px(가로형 1280px) H.264 · 무음 · faststart
 * 실패해도 빌드는 멈추지 않는다 (화면은 포스터·대체 이미지로 표시).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, execSync } from "node:child_process";

const B = "https://d8j0ntlcm91z4.cloudfront.net/user_3DbVBBUg293N8F55dosRpqwEfb6/";
const OUT = path.join(process.cwd(), "public", "wolhwa", "v2");

const IMAGES = [
  ["greet.webp", "hf_20261016_074341_b5862998-10da-4645-bca6-c751e94def3d.png"],
  ["listen.webp", "hf_20261016_074341_7d5e424a-b834-45ef-88d0-6dd5e757672b.png"],
  ["write.webp", "hf_20261016_074341_537c3cc4-31bd-4e68-9086-3a9e4a36ffc6.png"],
  ["thread.webp", "hf_20261016_074343_ca3b12ef-bfa8-401d-937a-8c27c3035f2c.png"],
  ["offer.webp", "hf_20261016_074342_bb870700-fe9f-4836-99ed-f92c89291070.png"],
  ["ritual-1.webp", "hf_20261016_074342_31e3995f-1ff4-46af-8484-2ceb287309a9.png"],
  ["ritual-2.webp", "hf_20261016_074342_13be40d5-6a51-4d13-bb5b-39eb2a055413.png"],
  ["ritual-3.webp", "hf_20261016_074342_f624c4ac-18fd-4404-a5c2-4efcccd4b953.png"],
  ["set.webp", "hf_20261016_074341_18b76d18-3707-4804-a15c-ecb2013f40a3.png"],
  ["moon.webp", "hf_20261016_074342_983ab802-03f6-444c-9c7f-96deb532c220.png"],
  ["explain.webp", "hf_20261016_081834_ba9fe3d9-bd0d-40d0-b675-0309167e4216.png"],
  ["smile.webp", "hf_20261016_081834_ae5c5c9a-a02b-47df-b246-5d54c9693d60.png"],
  ["hands.webp", "hf_20261016_081833_13ad7394-41e8-48e4-b721-769a80f38c49.png"],
];
const VIDEOS = [
  ["greet.mp4", "hf_20261016_074650_4c876ec8-7ee2-4569-a43e-7531d7277b63.mp4", 720],
  ["moon.mp4", "hf_20261016_074653_cde8a81c-18ba-4041-8b57-0496fd72782d.mp4", 1280],
];

async function get(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}

function ffmpegPath() {
  try {
    const dir = path.join(os.tmpdir(), "wh-ffmpeg");
    if (!fs.existsSync(path.join(dir, "node_modules", "ffmpeg-static", "ffmpeg"))) {
      fs.mkdirSync(dir, { recursive: true });
      execSync("npm i --no-save --no-package-lock --no-audit --no-fund ffmpeg-static@5.2.0", { cwd: dir, stdio: "ignore", timeout: 180_000 });
    }
    const p = path.join(dir, "node_modules", "ffmpeg-static", "ffmpeg");
    return fs.existsSync(p) ? p : null;
  } catch (e) {
    console.warn("[v2-assets] ffmpeg 준비 실패:", e?.message ?? e);
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let sharp = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.warn("[v2-assets] sharp 없음 — 이미지를 원본 그대로 저장");
  }
  await Promise.all(
    IMAGES.map(async ([name, src]) => {
      const out = path.join(OUT, name);
      if (fs.existsSync(out)) return;
      try {
        const buf = await get(B + src);
        if (sharp) await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
        else fs.writeFileSync(out, buf);
        console.log("[v2-assets] 이미지", name, fs.statSync(out).size);
      } catch (e) {
        console.warn("[v2-assets] 이미지 실패", name, e?.message ?? e);
      }
    })
  );

  const todo = VIDEOS.filter(([name]) => !fs.existsSync(path.join(OUT, name)));
  if (!todo.length) return;
  const ff = ffmpegPath();
  for (const [name, src, w] of todo) {
    const out = path.join(OUT, name);
    const raw = out + ".src.mp4";
    try {
      fs.writeFileSync(raw, await get(B + src));
      if (ff) {
        execFileSync(
          ff,
          ["-y", "-loglevel", "error", "-i", raw, "-vf", `scale='min(${w},iw)':-2`, "-c:v", "libx264", "-crf", "27", "-preset", "medium", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", out],
          { timeout: 240_000 }
        );
        fs.unlinkSync(raw);
      } else {
        fs.unlinkSync(raw); // 압축 없이 큰 원본을 올리지 않는다 (포스터 이미지로 표시)
        continue;
      }
      console.log("[v2-assets] 영상", name, fs.statSync(out).size);
    } catch (e) {
      console.warn("[v2-assets] 영상 실패", name, e?.message ?? e);
      try {
        fs.unlinkSync(raw);
      } catch {}
    }
  }
}

main()
  .catch((e) => console.warn("[v2-assets] 건너뜀:", e?.message ?? e))
  .finally(() => process.exit(0));
