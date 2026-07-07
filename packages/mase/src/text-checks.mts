import { normalizeText } from "./normalize.mjs";

export interface TextIssue {
  line: number;
  reason: string;
}

const MOJIBAKE_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\u00C3[\u0080-\u00BF]/u,
    reason: "mojibake C3 xx",
  },
  {
    pattern: /\u00C2[\u0080-\u00BF\u00A0]/u,
    reason: "mojibake C2 xx",
  },
  {
    pattern: /\u00E2\u20AC./u,
    reason: "mojibake E2 80 xx",
  },
];

export function collectReplacementAndMojibake(text: string): TextIssue[] {
  const issues: TextIssue[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("\uFFFD")) {
      issues.push({ line: i + 1, reason: "replacement-character U+FFFD" });
    }
    for (const { pattern, reason } of MOJIBAKE_PATTERNS) {
      if (pattern.test(line)) {
        issues.push({ line: i + 1, reason });
      }
    }
  }
  return issues;
}

export function collectFullWidthAscii(text: string): TextIssue[] {
  const issues: TextIssue[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const ch of lines[i]) {
      const code = ch.codePointAt(0)!;
      if (code >= 0xff01 && code <= 0xff5e) {
        issues.push({
          line: i + 1,
          reason: `fullwidth-ascii U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
        });
      }
    }
  }
  return issues;
}

export function normalizeLine(line: string): string {
  return normalizeText(line, false);
}
