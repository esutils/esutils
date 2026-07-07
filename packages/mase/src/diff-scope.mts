import { execFileSync } from "node:child_process";
import type { CheckerArgs } from "./constants.mjs";
import { toPosix } from "./args.mjs";

export type DiffLineMap = Map<string, Set<number>>;

function parseDiffPath(line: string): string | null {
  const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
  if (!match) {
    return null;
  }
  return match[2] === "/dev/null" ? null : toPosix(match[2]);
}

export function parseUnifiedDiffChangedLines(diff: string): DiffLineMap {
  const changed = new Map<string, Set<number>>();
  let currentPath: string | null = null;
  let newLine = 0;

  for (const line of diff.split(/\r?\n/)) {
    const path = parseDiffPath(line);
    if (path !== null) {
      currentPath = path;
      if (!changed.has(currentPath)) {
        changed.set(currentPath, new Set());
      }
      continue;
    }
    if (!currentPath) {
      continue;
    }
    if (line.startsWith("@@")) {
      const match = line.match(/\+(\d+)(?:,(\d+))?/);
      newLine = match ? parseInt(match[1], 10) : 0;
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("+")) {
      changed.get(currentPath)!.add(newLine);
      newLine++;
    } else if (line.startsWith(" ")) {
      newLine++;
    }
  }

  return changed;
}

export function loadDiffLineMap(repoRoot: string, args: CheckerArgs): DiffLineMap | null {
  if (args.diffMode === "all") {
    return null;
  }

  const gitArgs = ["-C", repoRoot, "diff", "--unified=0", "--no-color"];
  if (args.diffMode === "staged") {
    gitArgs.push("--cached");
  } else if (args.diffMode === "since" && args.sinceRef) {
    gitArgs.push(args.sinceRef);
  }
  if (args.paths.length > 0) {
    gitArgs.push("--", ...args.paths);
  }

  const diff = execFileSync("git", gitArgs, { encoding: "utf8" });
  return parseUnifiedDiffChangedLines(diff);
}
