import { MULTI_REPLACEMENTS, CHAR_REPLACEMENTS, CP1252_PUNCT_MAP } from "./constants.mjs";

export function decodeCp1252(raw: Buffer): string {
  let out = "";
  for (const b of raw) {
    const mapped = CP1252_PUNCT_MAP.get(b);
    if (mapped) {
      out += String.fromCodePoint(mapped);
    } else {
      out += String.fromCodePoint(b);
    }
  }
  return out;
}

export function decodeWithEncoding(raw: Buffer, enc: string): string {
  if (enc === "cp1252") {
    return decodeCp1252(raw);
  }
  return new TextDecoder(enc, { fatal: true }).decode(raw);
}

export function normalizeText(decodedText: string, hadLeadingBom: boolean): string {
  let text = decodedText;
  if (hadLeadingBom && !text.startsWith("\uFEFF")) {
    text = `\uFEFF${text}`;
  }

  const keepLeadingBom = hadLeadingBom && text.startsWith("\uFEFF");
  let body = keepLeadingBom ? text.slice(1) : text;

  body = body.replace(/\uFEFF/g, "");
  body = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (const [from, to] of MULTI_REPLACEMENTS) {
    body = body.split(from).join(to);
  }

  let out = "";
  for (const ch of body) {
    out += CHAR_REPLACEMENTS.get(ch) ?? ch;
  }

  return (keepLeadingBom ? "\uFEFF" : "") + out;
}

export function collectUnsupportedPunctuation(text: string) {
  const issues: { line: number; reason: string }[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch.charCodeAt(0) <= 127) {
        continue;
      }
      if (/\p{P}/u.test(ch)) {
        issues.push({
          line: i + 1,
          reason: `unsupported-punctuation U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
        });
      }
    }
  }
  return issues;
}

export function firstDiffLine(a: string, b: string): number {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    if ((aLines[i] ?? "") !== (bLines[i] ?? "")) {
      return i + 1;
    }
  }
  return 1;
}

export function countNonAscii(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (ch.codePointAt(0)! > 127) {
      n++;
    }
  }
  return n;
}

export function toUtf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function applyOutputEol(text: string, eolSep: string): string {
  if (eolSep === "\n") {
    return text;
  }
  return text.replace(/\n/g, eolSep);
}

export function lineEndingToSep(eol: string): string {
  switch ((eol ?? "lf").toLowerCase()) {
    case "crlf":
      return "\r\n";
    case "cr":
      return "\r";
    default:
      return "\n";
  }
}

export function detectLineEndingFromRaw(raw: Buffer): "lf" | "crlf" | "cr" | null {
  let crlf = 0;
  let cr = 0;
  let lf = 0;
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    if (b === 0x0d && raw[i + 1] === 0x0a) {
      crlf++;
      i++;
    } else if (b === 0x0d) {
      cr++;
    } else if (b === 0x0a) {
      lf++;
    }
  }
  if (crlf > 0 && crlf >= cr && crlf >= lf) {
    return "crlf";
  }
  if (cr > 0 && cr >= lf) {
    return "cr";
  }
  if (lf > 0) {
    return "lf";
  }
  return null;
}
