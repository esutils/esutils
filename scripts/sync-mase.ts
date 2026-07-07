import { spawn } from "child_process";
import { createHash } from "crypto";
import { existsSync } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

type GitRunResult = {
  code: number;
};

type SyncMode = "from" | "to";
type SyncConfig = {
  peers?: string[];
};

const defaultMode: SyncMode = "from";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.dirname(scriptDir);
const currentPath = path.join(
  workspaceRoot,
  ".cursor",
  "rules",
  "minimal-and-safe-editing.mdc",
);
const configPath = path.join(scriptDir, "sync-mase.json");

function windowsGitCandidates() {
  const candidates: string[] = [];
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  if (programFiles) {
    candidates.push(path.join(programFiles, "Git", "cmd", "git.exe"));
  }
  if (programFilesX86) {
    candidates.push(path.join(programFilesX86, "Git", "cmd", "git.exe"));
  }
  candidates.push("C:\\Program Files\\Git\\cmd\\git.exe");
  candidates.push("C:\\Program Files (x86)\\Git\\cmd\\git.exe");
  return [...new Set(candidates)];
}

class WindowsGit {
  readonly gitPath: string;

  constructor() {
    const candidates = windowsGitCandidates();
    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found) {
      throw new Error(
        `Windows git not found (checked: ${candidates.join(", ")})`,
      );
    }
    this.gitPath = found;
  }

  diffNoIndex(left: string, right: string): Promise<GitRunResult> {
    return new Promise((resolve) => {
      const child = spawn(
        this.gitPath,
        ["--no-pager", "diff", "--no-index", "--", left, right],
        { windowsHide: false, stdio: "inherit" },
      );

      child.on("error", (error) => {
        console.error(error);
        resolve({ code: 2 });
      });
      child.on("close", (code) => {
        resolve({ code: code ?? 0 });
      });
    });
  }
}

function sha256(content: Buffer) {
  return createHash("sha256").update(content).digest("hex").toUpperCase();
}

async function copyAndVerify(sourcePath: string, destinationPath: string) {
  const source = await fs.readFile(sourcePath);
  await fs.copyFile(sourcePath, destinationPath);
  const destination = await fs.readFile(destinationPath);
  return {
    sourceHash: sha256(source),
    destinationHash: sha256(destination),
  };
}

function printHelp() {
  console.log(`Usage: node scripts/sync-mase.ts [options]

By default (--from), show incoming diffs from peer rule files to the current
workspace rule file. This mode is read-only on the script side: it prints diffs
and does not modify any file. The agent reads the output, then integrates
selected changes into the current rule by editing it.

Use --to only when explicitly requested: it copies the current rule file over
peer rule files and verifies matching SHA256 hashes. Do not run --to unless the
user asks; overwriting peer files is not safe by default.

Current:
  ${currentPath}

Peer files:
  Loaded from optional ${configPath}, or supplied with --peer.

Options:
  -h, --help           Show this help and exit
  --from               Print read-only diffs from peers to current (default)
  --to                 Copy current to peer files (explicit user request only)
  --peer <path>        Add a peer rule file path (repeatable)
`);
}

function parseArgs(argv: string[]) {
  let mode: SyncMode = defaultMode;
  let modeSet = false;
  const peers: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--from" || arg === "--to") {
      if (modeSet) {
        console.error("Specify only one sync direction: --from or --to");
        process.exit(1);
      }
      mode = arg === "--from" ? "from" : "to";
      modeSet = true;
      continue;
    }
    if (arg === "--peer") {
      const value = argv[i + 1];
      if (!value) {
        console.error("Missing value for --peer");
        process.exit(1);
      }
      peers.push(path.resolve(value));
      i += 1;
      continue;
    }
    console.error(`Unknown argument: ${arg}`);
    console.error("Run with --help for usage.");
    process.exit(1);
  }

  return { mode, peers };
}

async function readConfig() {
  let content: string;
  try {
    content = await fs.readFile(configPath, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
  const config = JSON.parse(content) as SyncConfig;
  if (config.peers !== undefined && !Array.isArray(config.peers)) {
    throw new Error(`sync-mase.json "peers" must be an array when present`);
  }
  return config;
}

async function main() {
  const { mode, peers } = parseArgs(process.argv.slice(2));
  const paths =
    peers.length > 0
      ? peers
      : ((await readConfig()).peers ?? []).map((entry) =>
          path.resolve(scriptDir, entry),
        );

  const git = new WindowsGit();

  if (!existsSync(currentPath)) {
    throw new Error(`Current file not found: ${currentPath}`);
  }

  const current = await fs.readFile(currentPath);
  const currentHash = sha256(current);

  console.log(`current ${currentPath}`);
  console.log(`sha256 ${currentHash}`);

  if (paths.length === 0) {
    console.log("No peer files configured.");
    return;
  }

  if (mode === "from") {
    for (const sourcePath of paths) {
      if (!existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }

      console.log("");
      console.log(`Diff: ${sourcePath} -> ${currentPath}`);
      const { code } = await git.diffNoIndex(sourcePath, currentPath);
      if (code > 1) {
        throw new Error(`git diff failed for source: ${sourcePath}`);
      }
      if (code === 0) {
        console.log(`No diff: ${sourcePath}`);
      }
    }
    return;
  }

  for (const destinationPath of paths) {
    const parent = path.dirname(destinationPath);
    if (!existsSync(parent)) {
      throw new Error(`Destination directory not found: ${parent}`);
    }

    const destinationExists = existsSync(destinationPath);
    const destinationHash = destinationExists
      ? sha256(await fs.readFile(destinationPath))
      : undefined;

    if (destinationHash !== currentHash) {
      console.log("");
      console.log(`Diff: ${currentPath} -> ${destinationPath}`);
      const { code } = await git.diffNoIndex(currentPath, destinationPath);
      if (code > 1) {
        throw new Error(`git diff failed for destination: ${destinationPath}`);
      }
    }

    const result = await copyAndVerify(currentPath, destinationPath);
    console.log(
      `to ${destinationPath} ${result.destinationHash === result.sourceHash ? "OK" : "FAILED"} ${result.destinationHash}`,
    );
  }
}

function isMainModule() {
  const entryPoint = process.argv[1];
  return (
    entryPoint !== undefined &&
    import.meta.url === pathToFileURL(path.resolve(entryPoint)).href
  );
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
