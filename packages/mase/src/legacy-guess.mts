import { execFileSync } from "node:child_process";
import chardet from "chardet";
import type { CheckerArgs } from "./constants.mjs";
import { matchesAnyGlob } from "./args.mjs";
import {
  collectUnsupportedPunctuation,
  countNonAscii,
  decodeWithEncoding,
  normalizeText,
} from "./normalize.mjs";

export function getWindowsAcp(): number {
  if (process.platform !== "win32") {
    return 1252;
  }
  try {
    const out = execFileSync("cmd", ["/c", "chcp"], { encoding: "utf8" });
    const m = out.match(/:\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 1252;
  } catch {
    return 1252;
  }
}

export function acpToChardetName(acp: number): string {
  switch (acp) {
    case 936:
      return "GB18030";
    case 1252:
      return "windows-1252";
    default:
      return "windows-1252";
  }
}

export function chardetNameToCharset(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower === "windows-1252" || lower === "iso-8859-1") {
    return "cp1252";
  }
  if (lower === "gb18030" || lower === "gbk" || lower === "gb2312") {
    return "gbk";
  }
  if (lower === "utf-8") {
    return "utf-8";
  }
  return null;
}

export function getLegacyTryOrder(args: CheckerArgs): string[] {
  const extra = args.fallbackEncodings.filter((e) => e !== "gbk" && e !== "cp1252");
  if (process.platform === "win32") {
    const acp = getWindowsAcp();
    if (acp === 936) {
      return ["gbk", "cp1252", ...extra];
    }
    if (acp === 1252) {
      return ["cp1252", "gbk", ...extra];
    }
    return ["cp1252", "gbk", ...extra];
  }
  return ["gbk", "cp1252", ...extra];
}

export function getChardetCharsetCandidates(raw: Buffer): string[] {
  const out: string[] = [];
  if (process.platform === "win32") {
    const acpLabel = acpToChardetName(getWindowsAcp());
    const allowed = [acpLabel, "windows-1252"];
    for (const r of chardet.analyse(raw)) {
      if (r.confidence >= 50 && allowed.includes(r.name)) {
        const mapped = chardetNameToCharset(r.name);
        if (mapped && mapped !== "utf-8") {
          out.push(mapped);
        }
      }
    }
  } else {
    for (const r of chardet.analyse(raw)) {
      if (r.confidence >= 50) {
        const mapped = chardetNameToCharset(r.name);
        if (mapped && mapped !== "utf-8") {
          out.push(mapped);
        }
      }
    }
  }
  return out;
}

function scoreCharset(raw: Buffer, encoding: string, hadLeadingBom: boolean) {
  const text = decodeWithEncoding(raw, encoding);
  const normalized = normalizeText(text, hadLeadingBom);
  const body = normalized.startsWith("\uFEFF") ? normalized.slice(1) : normalized;
  const unsupported = collectUnsupportedPunctuation(body);
  return {
    encoding,
    unsupportedCount: unsupported.length,
    nonAsciiCount: countNonAscii(body),
  };
}

export function legacyGuessCharset(
  raw: Buffer,
  hadLeadingBom: boolean,
  args: CheckerArgs,
): string | null {
  const ordered = [...new Set([...getLegacyTryOrder(args), ...getChardetCharsetCandidates(raw)])];
  const candidates: ReturnType<typeof scoreCharset>[] = [];
  for (const enc of ordered) {
    try {
      candidates.push(scoreCharset(raw, enc, hadLeadingBom));
    } catch {
      // try next
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => {
    if (a.unsupportedCount !== b.unsupportedCount) {
      return a.unsupportedCount - b.unsupportedCount;
    }
    if (a.nonAsciiCount !== b.nonAsciiCount) {
      return a.nonAsciiCount - b.nonAsciiCount;
    }
    return a.encoding.localeCompare(b.encoding);
  });
  return candidates[0].encoding;
}

export function allowLegacyGuess(relPath: string, args: CheckerArgs): boolean {
  return args.fallbackScope.length === 0 || matchesAnyGlob(relPath, args.fallbackScope);
}
