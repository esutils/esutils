import fs from "node:fs";
import path from "node:path";
import type { CheckerArgs, Diagnostic } from "./constants.mjs";
import { collectUnsupportedPunctuation, normalizeText, toUtf8Bytes } from "./normalize.mjs";
import { collectFullWidthAscii, collectReplacementAndMojibake } from "./text-checks.mjs";

function stripDisallowedControls(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x00 && code < 0x09) || (code > 0x0a && code < 0x20) || code === 0x7f) {
      continue;
    }
    out += ch;
  }
  return out;
}

function collectControlDiagnostics(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const ch of lines[i]) {
      const code = ch.codePointAt(0)!;
      if ((code >= 0x00 && code < 0x09) || (code > 0x0a && code < 0x20) || code === 0x7f) {
        diagnostics.push({
          path: "COMMIT_EDITMSG",
          line: i + 1,
          reason: `disallowed-control U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
        });
      }
    }
  }
  return diagnostics;
}

function firstBodyLine(lines: string[]): number {
  const blank = lines.findIndex((line) => line.trim() === "");
  return blank === -1 ? lines.length : blank + 2;
}

function collectCommitStyleDiagnostics(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = text.split("\n");
  const bodyStart = firstBodyLine(lines);
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];
    if (line.length > 80) {
      diagnostics.push({ path: "COMMIT_EDITMSG", line: lineNumber, reason: "line-too-long" });
    }
    if (lineNumber < bodyStart || line.trim() === "" || line.startsWith("#")) {
      continue;
    }
    if (!line.startsWith("- ")) {
      diagnostics.push({ path: "COMMIT_EDITMSG", line: lineNumber, reason: "commit-body-bullet-style" });
    }
  }
  return diagnostics;
}

export function runCommitMessageChecker(args: CheckerArgs, repoRoot: string) {
  const messagePath = path.resolve(repoRoot, args.commitMessagePath ?? ".git/COMMIT_EDITMSG");
  const raw = fs.readFileSync(messagePath);
  const diagnostics: Diagnostic[] = [];
  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return {
      diagnostics: [{ path: "COMMIT_EDITMSG", line: 1, reason: "decode failed" }],
      changed: 0,
      write: args.write,
    };
  }

  const normalized = stripDisallowedControls(normalizeText(text, false).replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  for (const issue of collectReplacementAndMojibake(text)) {
    diagnostics.push({ path: "COMMIT_EDITMSG", line: issue.line, reason: issue.reason });
  }
  for (const issue of collectFullWidthAscii(text)) {
    diagnostics.push({ path: "COMMIT_EDITMSG", line: issue.line, reason: issue.reason });
  }
  for (const issue of collectUnsupportedPunctuation(normalizeText(text, false))) {
    diagnostics.push({ path: "COMMIT_EDITMSG", line: issue.line, reason: issue.reason });
  }
  diagnostics.push(...collectControlDiagnostics(text));
  diagnostics.push(...collectCommitStyleDiagnostics(text));

  const wouldChange = !Buffer.from(toUtf8Bytes(normalized)).equals(raw);
  if (wouldChange) {
    if (args.write) {
      fs.writeFileSync(messagePath, Buffer.from(toUtf8Bytes(normalized)));
    } else {
      diagnostics.push({ path: "COMMIT_EDITMSG", line: 1, reason: "would-normalize" });
    }
  }

  diagnostics.sort((a, b) => a.line - b.line || a.reason.localeCompare(b.reason));
  return { diagnostics, changed: wouldChange ? 1 : 0, write: args.write };
}
