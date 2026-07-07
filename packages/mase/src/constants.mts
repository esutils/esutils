export const TEXT_EXTENSIONS = new Set([
  ".bash",
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
  ".md",
  ".mdc",
  ".mjs",
  ".mts",
  ".ps1",
  ".psd1",
  ".py",
  ".rs",
  ".sh",
  ".ts",
  ".tsx",
  ".zsh",
  ".yml",
  ".yaml",
  ".json",
]);

export const SOURCE_EXTENSIONS = new Set([
  ".bash",
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
  ".ps1",
  ".psd1",
  ".py",
  ".rs",
  ".sh",
  ".ts",
  ".tsx",
  ".zsh",
]);

export const MULTI_REPLACEMENTS: [string, string][] = [
  ["\u00a1\u00aa", "-"],
  ["\u00a1\u00b0", "'"],
  ["\u00a1\u00af", "'"],
  ["\u00a1\u00c0", '"'],
  ["\u00a1\u00b1", '"'],
  ["\u00a1\u00ad", "..."],
  ["\u00a1\u00fa", "->"],
];

export const CHAR_REPLACEMENTS = new Map<string, string>([
  ["\u2014", "-"],
  ["\u2013", "-"],
  ["\u2212", "-"],
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u201a", "'"],
  ["\u201b", "'"],
  ["\u201c", '"'],
  ["\u201d", '"'],
  ["\u201e", '"'],
  ["\u201f", '"'],
  ["\u2032", "'"],
  ["\u2033", '"'],
  ["\u2026", "..."],
  ["\u00a0", " "],
  ["\u2192", "->"],
  ["\u2194", "<->"],
  ["\u2193", "v"],
  ["\u25ba", ">"],
  ["\u25b6", ">"],
  ["\u2039", "<"],
  ["\u203a", ">"],
  ["\u2030", "%"],
  ["\u2022", "-"],
]);

export const CP1252_PUNCT_MAP = new Map<number, number>([
  [0x82, 0x201a],
  [0x84, 0x201e],
  [0x85, 0x2026],
  [0x89, 0x2030],
  [0x8b, 0x2039],
  [0x91, 0x2018],
  [0x92, 0x2019],
  [0x93, 0x201c],
  [0x94, 0x201d],
  [0x95, 0x2022],
  [0x96, 0x2013],
  [0x97, 0x2014],
  [0x9b, 0x203a],
]);

export type LineEnding = "lf" | "crlf" | "cr";

export interface CheckerArgs {
  check: boolean;
  write: boolean;
  paths: string[];
  allowlist: string[];
  fallbackScope: string[];
  fallbackEncodings: string[];
  diffMode: "all" | "worktree" | "staged" | "since";
  sinceRef: string | null;
  commitMessagePath: string | null;
}

export interface EditorConfigProps {
  charset?: string;
  end_of_line?: string;
}

export interface DetectionResult {
  inputCharset: string;
  leadingUtf8Bom: boolean;
  outputLineEnding: LineEnding;
  fromEditorConfig: boolean;
}

export interface DecodedFile {
  text: string;
  encoding: string;
  hadLeadingBom: boolean;
}

export interface Diagnostic {
  path: string;
  line: number;
  reason: string;
}

export interface ProcessResult {
  diagnostics: Diagnostic[];
  changed: boolean;
}
