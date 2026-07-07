import { execFileSync } from "node:child_process";
import type { CheckerArgs, LineEnding } from "./constants.mjs";
import type { EditorConfigProps } from "./constants.mjs";
import { editorCharsetToLabel } from "./editorconfig.mjs";
import { detectLineEndingFromRaw, lineEndingToSep } from "./normalize.mjs";
import { allowLegacyGuess, legacyGuessCharset } from "./legacy-guess.mjs";

export function detectLeadingBom(raw: Buffer): {
  charset: string | null;
  leadingUtf8Bom: boolean;
} {
  if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    return { charset: "utf-8", leadingUtf8Bom: true };
  }
  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    return { charset: "utf-16le", leadingUtf8Bom: false };
  }
  if (raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff) {
    return { charset: "utf-16be", leadingUtf8Bom: false };
  }
  return { charset: null, leadingUtf8Bom: false };
}

export function isGitTracked(repoRoot: string, relPath: string): boolean {
  try {
    execFileSync("git", ["-C", repoRoot, "ls-files", "--error-unmatch", "--", relPath], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

export function detectOutputLineEnding(
  raw: Buffer,
  relPath: string,
  repoRoot: string,
  editorProps: EditorConfigProps,
): LineEnding {
  const editorEol = editorProps.end_of_line ?? "lf";
  if (!isGitTracked(repoRoot, relPath)) {
    return editorEol as LineEnding;
  }
  const detected = detectLineEndingFromRaw(raw);
  if (detected) {
    return detected;
  }
  return editorEol as LineEnding;
}

export function detectEncodingMetadata(
  raw: Buffer,
  relPath: string,
  repoRoot: string,
  editorProps: EditorConfigProps,
) {
  const bom = detectLeadingBom(raw);
  const outputLineEnding = detectOutputLineEnding(raw, relPath, repoRoot, editorProps);
  if (bom.charset) {
    return {
      inputCharset: bom.charset,
      leadingUtf8Bom: bom.leadingUtf8Bom,
      outputLineEnding,
      fromEditorConfig: false,
      charsetFromBom: true,
    };
  }
  const inputCharset = editorCharsetToLabel(editorProps.charset);
  return {
    inputCharset,
    leadingUtf8Bom: false,
    outputLineEnding,
    fromEditorConfig: true,
    charsetFromBom: false,
  };
}

export function resolveInputCharsetAfterUtf8Failure(
  raw: Buffer,
  hadLeadingBom: boolean,
  relPath: string,
  args: CheckerArgs,
): string {
  if (allowLegacyGuess(relPath, args)) {
    const guessed = legacyGuessCharset(raw, hadLeadingBom, args);
    if (guessed) {
      return guessed;
    }
  }
  return "utf-8";
}

export function outputLineEndingSep(eol: LineEnding): string {
  return lineEndingToSep(eol);
}
