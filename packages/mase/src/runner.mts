import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { CheckerArgs, Diagnostic, ProcessResult } from "./constants.mjs";
import { TEXT_EXTENSIONS } from "./constants.mjs";
import { toPosix } from "./args.mjs";
import { loadDiffLineMap } from "./diff-scope.mjs";
import { getEditorConfigForPath, loadEditorConfigSections } from "./editorconfig.mjs";
import { detectEncodingMetadata, outputLineEndingSep } from "./detect.mjs";
import { decodeFile } from "./decode.mjs";
import { normalizeCommentSpans, shouldScanCommentsOnly, sliceCommentText } from "./comments.mjs";
import { runCommitMessageChecker } from "./message.mjs";
import {
  applyOutputEol,
  collectUnsupportedPunctuation,
  firstDiffLine,
  normalizeText,
  toUtf8Bytes,
} from "./normalize.mjs";
import { collectFullWidthAscii, collectReplacementAndMojibake, normalizeLine } from "./text-checks.mjs";

function listTrackedTextFiles(repoRoot: string): string[] {
  const raw = execFileSync("git", ["-C", repoRoot, "ls-files"], {
    encoding: "utf8",
  });
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s)
    .filter((s) => TEXT_EXTENSIONS.has(path.extname(s).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function isPlanDocument(relPath: string): boolean {
  return /plan.*\.md$/i.test(path.basename(relPath));
}

function filterTextByLines(text: string, lineFilter: Set<number> | null): string {
  if (!lineFilter) {
    return text;
  }
  return text
    .split("\n")
    .map((line, i) => (lineFilter.has(i + 1) ? line : ""))
    .join("\n");
}

function normalizeChangedLines(text: string, hadLeadingBom: boolean, lineFilter: Set<number>): string {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const lineNumber of lineFilter) {
    const index = lineNumber - 1;
    if (index < 0 || index >= lines.length) {
      continue;
    }
    const line = lines[index];
    if (hadLeadingBom && lineNumber === 1 && line.startsWith("\uFEFF")) {
      lines[index] = `\uFEFF${normalizeLine(line.slice(1))}`;
    } else {
      lines[index] = normalizeLine(line);
    }
  }
  return lines.join("\n");
}

function addTextIssues(
  diagnostics: Diagnostic[],
  relPath: string,
  text: string,
  normalizedText: string,
): void {
  for (const issue of collectReplacementAndMojibake(text)) {
    diagnostics.push({ path: relPath, line: issue.line, reason: issue.reason });
  }
  for (const issue of collectFullWidthAscii(text)) {
    diagnostics.push({ path: relPath, line: issue.line, reason: issue.reason });
  }
  for (const issue of collectUnsupportedPunctuation(normalizedText)) {
    diagnostics.push({ path: relPath, line: issue.line, reason: issue.reason });
  }
}

export function processFile(
  repoRoot: string,
  relPath: string,
  args: CheckerArgs,
  editorSections: ReturnType<typeof loadEditorConfigSections>,
  diffLines: Set<number> | null = null,
): ProcessResult {
  const absPath = path.join(repoRoot, relPath);
  const raw = fs.readFileSync(absPath);
  const editorProps = getEditorConfigForPath(editorSections, relPath);
  const meta = detectEncodingMetadata(raw, relPath, repoRoot, editorProps);
  const diagnostics: Diagnostic[] = [];

  let decoded;
  try {
    decoded = decodeFile(raw, relPath, repoRoot, editorProps, args);
  } catch (err) {
    diagnostics.push({
      path: relPath,
      line: 1,
      reason: String((err as Error).message ?? err),
    });
    return { diagnostics, changed: false };
  }

  const decodedLf = decoded.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const commentsOnly = shouldScanCommentsOnly(relPath);
  let normalizedLf = commentsOnly
    ? normalizeCommentSpans(relPath, decodedLf, diffLines)
    : diffLines
      ? normalizeChangedLines(decodedLf, decoded.hadLeadingBom, diffLines)
      : normalizeText(decoded.text, decoded.hadLeadingBom);
  if (isPlanDocument(relPath)) {
    if (decoded.hadLeadingBom) {
      if (!args.write) {
        diagnostics.push({ path: relPath, line: 1, reason: "plan-file-bom" });
      }
      normalizedLf = normalizedLf.startsWith("\uFEFF") ? normalizedLf.slice(1) : normalizedLf;
    }
    if (decoded.encoding.toLowerCase() !== "utf-8") {
      if (!args.write) {
        diagnostics.push({ path: relPath, line: 1, reason: `plan-file-not-utf8 ${decoded.encoding}` });
      }
    }
  }

  const eolSep = outputLineEndingSep(meta.outputLineEnding);
  const normalized = applyOutputEol(normalizedLf, eolSep);
  const body = normalizedLf.startsWith("\uFEFF") ? normalizedLf.slice(1) : normalizedLf;
  const scanText = commentsOnly ? sliceCommentText(relPath, decodedLf, diffLines) : filterTextByLines(decodedLf, diffLines);
  const normalizedScanText = commentsOnly
    ? sliceCommentText(relPath, normalizedLf, diffLines)
    : filterTextByLines(body, diffLines);
  addTextIssues(diagnostics, relPath, scanText, normalizedScanText);

  const outBytes = toUtf8Bytes(normalized);
  const wouldChange = !Buffer.from(outBytes).equals(raw);
  if (wouldChange) {
    if (args.write) {
      fs.writeFileSync(absPath, Buffer.from(outBytes));
    } else {
      diagnostics.push({
        path: relPath,
        line: firstDiffLine(decoded.text, normalizedLf),
        reason: "would-normalize",
      });
    }
    return { diagnostics, changed: true };
  }
  return { diagnostics, changed: false };
}

export function runChecker(args: CheckerArgs, repoRoot: string = process.cwd()) {
  if (args.commitMessagePath !== null) {
    return runCommitMessageChecker(args, repoRoot);
  }

  const editorSections = loadEditorConfigSections(repoRoot);
  const diffLineMap = loadDiffLineMap(repoRoot, args);
  const relPaths =
    args.paths.length > 0
      ? args.paths.map((p) => toPosix(path.relative(repoRoot, path.resolve(repoRoot, p))))
      : diffLineMap
        ? [...diffLineMap.keys()].filter((s) => TEXT_EXTENSIONS.has(path.extname(s).toLowerCase()))
      : listTrackedTextFiles(repoRoot);

  const allowlistSet = new Set(args.allowlist.map((p) => toPosix(p)));
  const diagnostics: Diagnostic[] = [];
  let changed = 0;

  for (const relPath of relPaths.sort((a, b) => a.localeCompare(b))) {
    const absPath = path.join(repoRoot, relPath);
    if (!fs.existsSync(absPath)) {
      continue;
    }
    if (allowlistSet.has(relPath)) {
      continue;
    }
    const diffLines = diffLineMap?.get(relPath) ?? null;
    if (diffLineMap && (!diffLines || diffLines.size === 0)) {
      continue;
    }
    const result = processFile(repoRoot, relPath, args, editorSections, diffLines);
    diagnostics.push(...result.diagnostics);
    if (result.changed) {
      changed++;
    }
  }

  diagnostics.sort((a, b) => {
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path);
    }
    return a.line - b.line;
  });

  return { diagnostics, changed, write: args.write };
}

export function printResults(result: ReturnType<typeof runChecker>): number {
  for (const d of result.diagnostics) {
    console.error(`${d.path}:${d.line}:${d.reason}`);
  }
  if (result.diagnostics.length > 0) {
    return 1;
  }
  if (result.write) {
    console.log(`normalized ${result.changed} file(s)`);
  } else {
    console.log("text normalization check passed");
  }
  return 0;
}
