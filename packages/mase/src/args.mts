import type { CheckerArgs } from "./constants.mjs";

export function printHelp(): void {
  console.log(`Usage: mase [options]

Automated checker for minimal-and-safe-editing: encoding, mojibake, and ASCII
punctuation. Default mode is --check (no writes; exit non-zero on violations).

Options:
  -h, --help              Show this help and exit
  --check                 Fail when files would change (default)
  --write                 Normalize mapped punctuation to ASCII in UTF-8 output
  --diff                  Check or write only worktree changed lines
  --staged                Check or write only staged lines
  --since <ref>           Check or write lines changed since a git ref
  --commit-message [path] Check a commit message file (default .git/COMMIT_EDITMSG)
  --path <path>           Limit to one file or directory (repeatable)
  --allowlist <glob>      Ignore unmapped punctuation in matching paths (repeatable)
  --fallback-scope <glob> Restrict legacy encoding guess to matching paths (repeatable)
  --fallback-encoding <enc>  Add legacy encoding after ACP-first slot (repeatable)
`);
}

export function parseArgs(argv: string[]): CheckerArgs {
  const args: CheckerArgs = {
    check: true,
    write: false,
    paths: [],
    allowlist: [],
    fallbackScope: [],
    fallbackEncodings: ["gbk", "cp1252"],
    diffMode: "all",
    sinceRef: null,
    commitMessagePath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--check") {
      args.check = true;
      args.write = false;
    } else if (arg === "--write") {
      args.write = true;
      args.check = false;
    } else if (arg === "--diff") {
      args.diffMode = "worktree";
    } else if (arg === "--staged") {
      args.diffMode = "staged";
    } else if (arg === "--since") {
      args.diffMode = "since";
      args.sinceRef = argv[++i];
    } else if (arg === "--commit-message") {
      const next = argv[i + 1];
      args.commitMessagePath = next && !next.startsWith("--") ? argv[++i] : ".git/COMMIT_EDITMSG";
    } else if (arg === "--path") {
      args.paths.push(argv[++i]);
    } else if (arg === "--allowlist") {
      args.allowlist.push(argv[++i]);
    } else if (arg === "--fallback-scope") {
      args.fallbackScope.push(argv[++i]);
    } else if (arg === "--fallback-encoding") {
      const enc = argv[++i];
      args.fallbackEncodings.push(enc === "windows-1252" ? "cp1252" : enc);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

export function toPosix(relPath: string): string {
  return relPath.replace(/\\/g, "/");
}

export function globToRegex(globPattern: string): RegExp {
  const escaped = globPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

export function matchesAnyGlob(relPath: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }
  return patterns.some((p) => globToRegex(p).test(relPath));
}
