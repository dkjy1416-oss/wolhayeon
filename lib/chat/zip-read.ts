/**
 * 11/28: 브라우저에서 .zip 안의 텍스트 파일만 꺼내 읽기 (외부 라이브러리 없음)
 * - 카톡 '대화 내보내기'(.zip) · 인스타그램 '내 정보 다운로드'(.zip)
 * - 파일 전체를 메모리에 올리지 않고 필요한 부분만 잘라 읽음 → 사진이 많은 큰 압축 파일도 가능
 * - 압축 해제는 브라우저 기본 DecompressionStream("deflate-raw") 사용
 * - 모든 처리는 휴대폰 안에서만 (서버 전송 없음)
 */
export interface ZipEntry {
  name: string;
  method: number; // 0 = 저장, 8 = deflate
  csize: number;
  usize: number;
  offset: number; // 로컬 헤더 위치
}

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);

async function slice(f: Blob, a: number, b: number): Promise<DataView> {
  return new DataView(await f.slice(a, b).arrayBuffer());
}

export async function listZip(f: Blob): Promise<ZipEntry[]> {
  const tailLen = Math.min(f.size, 66000);
  const tail = await slice(f, f.size - tailLen, f.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip");
  let cdSize = u32(tail, eocd + 12);
  let cdOff = u32(tail, eocd + 16);
  let count = u16(tail, eocd + 10);
  /* zip64 (큰 인스타 다운로드) */
  if (cdOff === 0xffffffff || cdSize === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20;
    if (loc < 0 || u32(tail, loc) !== 0x07064b50) throw new Error("zip64");
    const z64off = Number(tail.getBigUint64(loc + 8, true));
    const z = await slice(f, z64off, z64off + 56);
    if (u32(z, 0) !== 0x06064b50) throw new Error("zip64");
    count = Number(z.getBigUint64(32, true));
    cdSize = Number(z.getBigUint64(40, true));
    cdOff = Number(z.getBigUint64(48, true));
  }
  const cd = await slice(f, cdOff, cdOff + cdSize);
  const out: ZipEntry[] = [];
  const dec = new TextDecoder("utf-8");
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (u32(cd, p) !== 0x02014b50) break;
    const method = u16(cd, p + 10);
    let csize = u32(cd, p + 20);
    let usize = u32(cd, p + 24);
    const nl = u16(cd, p + 28);
    const xl = u16(cd, p + 30);
    const cl = u16(cd, p + 32);
    let offset = u32(cd, p + 42);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nl));
    /* zip64 확장 필드 */
    if (csize === 0xffffffff || usize === 0xffffffff || offset === 0xffffffff) {
      let x = p + 46 + nl;
      const end = x + xl;
      while (x + 4 <= end) {
        const id = u16(cd, x);
        const sz = u16(cd, x + 2);
        if (id === 0x0001) {
          let q = x + 4;
          if (usize === 0xffffffff) (usize = Number(cd.getBigUint64(q, true))), (q += 8);
          if (csize === 0xffffffff) (csize = Number(cd.getBigUint64(q, true))), (q += 8);
          if (offset === 0xffffffff) offset = Number(cd.getBigUint64(q, true));
          break;
        }
        x += 4 + sz;
      }
    }
    if (!name.endsWith("/")) out.push({ name, method, csize, usize, offset });
    p += 46 + nl + xl + cl;
  }
  return out;
}

export async function readZipText(f: Blob, e: ZipEntry): Promise<string> {
  const h = await slice(f, e.offset, e.offset + 30);
  if (u32(h, 0) !== 0x04034b50) throw new Error("zip");
  const start = e.offset + 30 + u16(h, 26) + u16(h, 28);
  const raw = f.slice(start, start + e.csize);
  if (e.method === 0) return await raw.text();
  if (e.method !== 8) throw new Error("method");
  const stream = raw.stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
  return await new Response(stream).text();
}

export function zipSupported(): boolean {
  try {
    new DecompressionStream("deflate-raw" as CompressionFormat);
    return true;
  } catch {
    return false;
  }
}
