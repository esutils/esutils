import fs from "node:fs";
import path from "node:path";
import type { EditorConfigProps } from "./constants.mjs";
import { toPosix } from "./args.mjs";

function editorConfigGlobMatch(pattern: string, relPath: string): boolean {
  const parts = pattern.split("/");
  return matchEditorConfigParts(parts, 0, relPath, 0);
}

function matchEditorConfigParts(
  patternParts: string[],
  pi: number,
  relPath: string,
  ri: number,
): boolean {
  if (pi === patternParts.length) {
    return ri === relPath.length || relPath[ri] === "/";
  }
  const part = patternParts[pi];
  if (part === "**") {
    if (pi === patternParts.length - 1) {
      return true;
    }
    for (let i = ri; i <= relPath.length; i++) {
      if (matchEditorConfigParts(patternParts, pi + 1, relPath, i)) {
        return true;
      }
    }
    return false;
  }
  if (ri >= relPath.length) {
    return false;
  }
  const slash = relPath.indexOf("/", ri);
  const segment = slash === -1 ? relPath.slice(ri) : relPath.slice(ri, slash);
  const re = new RegExp(
    `^${part
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, "[^/]")}$`,
    "i",
  );
  if (!re.test(segment)) {
    return false;
  }
  const next = slash === -1 ? relPath.length : slash + 1;
  return matchEditorConfigParts(patternParts, pi + 1, relPath, next);
}

function parseEditorConfig(content: string) {
  const sections: { patterns: string[]; props: Record<string, string> }[] = [];
  let current: { patterns: string[]; props: Record<string, string> } | null = null;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const section = trimmed.match(/^\[(.+)\]$/);
    if (section) {
      current = {
        patterns: section[1].split(",").map((s) => s.trim()),
        props: {},
      };
      sections.push(current);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1 || !current) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    current.props[key] = value;
  }
  return sections;
}

export function loadEditorConfigSections(repoRoot: string) {
  const configPath = path.join(repoRoot, ".editorconfig");
  if (!fs.existsSync(configPath)) {
    return [];
  }
  return parseEditorConfig(fs.readFileSync(configPath, "utf8"));
}

export function getEditorConfigForPath(
  sections: ReturnType<typeof loadEditorConfigSections>,
  relPath: string,
): EditorConfigProps {
  const posix = toPosix(relPath);
  const props: EditorConfigProps = {};
  for (const section of sections) {
    for (const pattern of section.patterns) {
      if (editorConfigGlobMatch(pattern, posix)) {
        Object.assign(props, section.props);
      }
    }
  }
  return props;
}

export function editorCharsetToLabel(charset?: string): string {
  switch ((charset ?? "utf-8").toLowerCase()) {
    case "utf-8-bom":
    case "utf-8":
      return "utf-8";
    case "latin1":
      return "latin1";
    case "utf-16be":
      return "utf-16be";
    case "utf-16le":
      return "utf-16le";
    default:
      return "utf-8";
  }
}
