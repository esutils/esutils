import path from "node:path";
import { SOURCE_EXTENSIONS } from "./constants.mjs";
import { normalizeLine } from "./text-checks.mjs";

export interface CommentSpan {
  start: number;
  end: number;
}

function isCStyleSource(ext: string): boolean {
  return new Set([
    ".c",
    ".cc",
    ".cpp",
    ".cs",
    ".go",
    ".h",
    ".hpp",
    ".java",
    ".js",
    ".jsx",
    ".mjs",
    ".mts",
    ".rs",
    ".ts",
    ".tsx",
  ]).has(ext);
}

function isHashCommentSource(ext: string): boolean {
  return new Set([".py", ".sh", ".bash", ".zsh", ".ps1", ".psd1"]).has(ext);
}

export function shouldScanCommentsOnly(relPath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

export function getCommentSpansByLine(relPath: string, text: string): Map<number, CommentSpan[]> {
  const ext = path.extname(relPath).toLowerCase();
  const spans = new Map<number, CommentSpan[]>();
  const lines = text.split("\n");
  let inBlock = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineSpans: CommentSpan[] = [];

    if (isHashCommentSource(ext)) {
      const hash = line.indexOf("#");
      if (hash !== -1) {
        lineSpans.push({ start: hash, end: line.length });
      }
    } else if (isCStyleSource(ext)) {
      let i = 0;
      let quote: string | null = null;
      while (i < line.length) {
        const ch = line[i];
        const next = line[i + 1];
        if (inBlock) {
          const start = i;
          const end = line.indexOf("*/", i);
          if (end === -1) {
            lineSpans.push({ start, end: line.length });
            i = line.length;
          } else {
            lineSpans.push({ start, end: end + 2 });
            i = end + 2;
            inBlock = false;
          }
          continue;
        }
        if (quote) {
          if (ch === "\\" && i + 1 < line.length) {
            i += 2;
            continue;
          }
          if (ch === quote) {
            quote = null;
          }
          i++;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
          quote = ch;
          i++;
          continue;
        }
        if (ch === "/" && next === "/") {
          lineSpans.push({ start: i, end: line.length });
          break;
        }
        if (ch === "/" && next === "*") {
          const end = line.indexOf("*/", i + 2);
          if (end === -1) {
            lineSpans.push({ start: i, end: line.length });
            inBlock = true;
            break;
          }
          lineSpans.push({ start: i, end: end + 2 });
          i = end + 2;
          continue;
        }
        i++;
      }
    }

    if (lineSpans.length > 0) {
      spans.set(lineIndex + 1, lineSpans);
    }
  }

  return spans;
}

export function normalizeCommentSpans(
  relPath: string,
  text: string,
  lineFilter: Set<number> | null,
): string {
  const spansByLine = getCommentSpansByLine(relPath, text);
  const lines = text.split("\n");
  for (const [lineNumber, spans] of spansByLine) {
    if (lineFilter && !lineFilter.has(lineNumber)) {
      continue;
    }
    let line = lines[lineNumber - 1];
    for (let i = spans.length - 1; i >= 0; i--) {
      const span = spans[i];
      line = line.slice(0, span.start) + normalizeLine(line.slice(span.start, span.end)) + line.slice(span.end);
    }
    lines[lineNumber - 1] = line;
  }
  return lines.join("\n");
}

export function sliceCommentText(relPath: string, text: string, lineFilter: Set<number> | null): string {
  const spansByLine = getCommentSpansByLine(relPath, text);
  const lines = text.split("\n");
  return lines
    .map((line, i) => {
      const lineNumber = i + 1;
      if (lineFilter && !lineFilter.has(lineNumber)) {
        return "";
      }
      return (spansByLine.get(lineNumber) ?? []).map((span) => line.slice(span.start, span.end)).join(" ");
    })
    .join("\n");
}
