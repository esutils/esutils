import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../dist/args.mjs";
import { printResults, runChecker } from "../dist/runner.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDirs: string[] = [];
const gitTracked: string[] = [];

afterEach(() => {
  for (const rel of gitTracked) {
    try {
      execFileSync("git", ["-C", packageRoot, "reset", "-q", "--", rel], { stdio: "ignore" });
    } catch {
      // ignore
    }
  }
  gitTracked.length = 0;
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

function makeTmpDir(): string {
  const tmpRoot = path.join(packageRoot, ".work", "tmp");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(tmpRoot, "mase-"));
  tmpDirs.push(dir);
  return dir;
}

function runCheck(filePath: string, extra: string[] = []) {
  const args = parseArgs(["--check", "--path", filePath, ...extra]);
  return runChecker(args, packageRoot);
}

function runWrite(filePath: string, extra: string[] = []) {
  const args = parseArgs(["--write", "--path", filePath, ...extra]);
  return runChecker(args, packageRoot);
}

function makeGitRepo(): string {
  const dir = makeTmpDir();
  execFileSync("git", ["-C", dir, "init"], { stdio: "ignore" });
  return dir;
}

function git(repoRoot: string, args: string[]): void {
  execFileSync("git", ["-C", repoRoot, ...args], { stdio: "ignore" });
}

function gitCommit(repoRoot: string, message: string): void {
  execFileSync(
    "git",
    [
      "-C",
      repoRoot,
      "-c",
      "user.name=mase",
      "-c",
      "user.email=mase@example.invalid",
      "commit",
      "-m",
      message,
    ],
    { stdio: "ignore" },
  );
}

describe("mase", () => {
  it("utf8-known-dash: check fails on em dash, write normalizes", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "utf8.md");
    fs.writeFileSync(file, "A\u2014B\n", "utf8");
    expect(printResults(runCheck(file))).toBe(1);
    expect(printResults(runWrite(file))).toBe(0);
    expect(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).toBe("A-B\n");
  });

  it("gbk-known-dash: guess maps em dash bytes to ascii", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "gbk.md");
    fs.writeFileSync(file, Buffer.from([0x41, 0xa1, 0xaa, 0x42, 0x0a]));
    expect(printResults(runWrite(file))).toBe(0);
    expect(fs.readFileSync(file, "utf8")).toBe("A-B\n");
  });

  it("cp1252-known-dash: guess maps en dash byte to ascii", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "cp.md");
    fs.writeFileSync(file, Buffer.from([0x41, 0x96, 0x42, 0x0a]));
    expect(printResults(runWrite(file))).toBe(0);
    expect(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).toBe("A-B\n");
  });

  it("bom-leading-keep: leading bom kept, mid bom removed", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "bom.md");
    fs.writeFileSync(file, Buffer.from([0xef, 0xbb, 0xbf, 0x41, 0xef, 0xbb, 0xbf, 0x42, 0x0a]));
    expect(printResults(runWrite(file))).toBe(0);
    const bytes = fs.readFileSync(file);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    expect(bytes.includes(0xef) && bytes.indexOf(0xef) === 0).toBe(true);
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    expect(hex.match(/ef bb bf/g)?.length).toBe(1);
  });

  it("pstar-unmapped-check: unmapped punctuation fails check", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "unsupported.md");
    fs.writeFileSync(file, "A\u3002B\n", "utf8");
    expect(printResults(runCheck(file))).toBe(1);
  });

  it("pstar-unmapped-write: unmapped punctuation unchanged in write mode", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "unsupported.md");
    const before = Buffer.from("A\u3002B\n", "utf8");
    fs.writeFileSync(file, before);
    expect(printResults(runWrite(file))).toBe(1);
    expect(fs.readFileSync(file).equals(before)).toBe(true);
  });

  it("allowlist-unmapped: allowlist skips unmapped punctuation failure", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "unsupported.md");
    fs.writeFileSync(file, "A\u3002B\n", "utf8");
    const rel = path.relative(packageRoot, file).replace(/\\/g, "/");
    expect(printResults(runCheck(file, ["--allowlist", rel]))).toBe(0);
  });

  it("write-idempotent: second write reports no changes", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "idempotent.md");
    fs.writeFileSync(file, "A\u2014B\n", "utf8");
    expect(printResults(runWrite(file))).toBe(0);
    const second = runWrite(file);
    expect(printResults(second)).toBe(0);
    expect(second.changed).toBe(0);
  });

  it("eol-new-editorconfig: untracked file uses editorconfig lf", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "eol-new.md");
    fs.writeFileSync(file, Buffer.from([0x41, 0xe2, 0x80, 0x94, 0x42, 0x0d, 0x0a]));
    expect(printResults(runWrite(file))).toBe(0);
    const bytes = fs.readFileSync(file);
    expect([...bytes]).toEqual([0x41, 0x2d, 0x42, 0x0a]);
  });

  it("eol-existing-keep: tracked file keeps crlf", () => {
    const file = path.join(
      packageRoot,
      "test",
      `.eol-tracked-${Date.now()}-${Math.random().toString(16).slice(2)}.md`,
    );
    fs.writeFileSync(file, Buffer.from([0x41, 0xe2, 0x80, 0x94, 0x42, 0x0d, 0x0a]));
    const rel = path.relative(packageRoot, file).replace(/\\/g, "/");
    execFileSync("git", ["-C", packageRoot, "add", "-N", "--", rel]);
    gitTracked.push(rel);
    try {
      expect(printResults(runWrite(file))).toBe(0);
      const bytes = fs.readFileSync(file);
      expect([...bytes]).toEqual([0x41, 0x2d, 0x42, 0x0d, 0x0a]);
    } finally {
      fs.unlinkSync(file);
    }
  });

  it("check-no-write: check mode does not write", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "check.md");
    const before = Buffer.from("A\u2014B\n", "utf8");
    fs.writeFileSync(file, before);
    expect(printResults(runCheck(file))).toBe(1);
    expect(fs.readFileSync(file).equals(before)).toBe(true);
  });

  it("diff-scope-check: worktree diff checks only changed lines", () => {
    const repo = makeGitRepo();
    const file = path.join(repo, "diff.md");
    fs.writeFileSync(file, "existing\u2014text\nclean\n", "utf8");
    git(repo, ["add", "diff.md"]);
    gitCommit(repo, "base");

    fs.writeFileSync(file, "existing\u2014text\nnew\u2014text\n", "utf8");
    const result = runChecker(parseArgs(["--check", "--diff"]), repo);

    expect(printResults(result)).toBe(1);
    expect(result.diagnostics).toEqual([
      { path: "diff.md", line: 2, reason: "would-normalize" },
    ]);
  });

  it("diff-scope-write: write mode normalizes only changed lines", () => {
    const repo = makeGitRepo();
    const file = path.join(repo, "diff.md");
    fs.writeFileSync(file, "existing\u2014text\nclean\n", "utf8");
    git(repo, ["add", "diff.md"]);
    gitCommit(repo, "base");

    fs.writeFileSync(file, "existing\u2014text\nnew\u2014text\n", "utf8");
    const result = runChecker(parseArgs(["--write", "--diff"]), repo);

    expect(printResults(result)).toBe(0);
    expect(fs.readFileSync(file, "utf8")).toBe("existing\u2014text\nnew-text\n");
  });

  it("staged-scope-check: staged diff checks added staged lines", () => {
    const repo = makeGitRepo();
    const file = path.join(repo, "staged.md");
    fs.writeFileSync(file, "clean\n", "utf8");
    git(repo, ["add", "staged.md"]);
    gitCommit(repo, "base");

    fs.writeFileSync(file, "clean\nstaged\u2014text\n", "utf8");
    git(repo, ["add", "staged.md"]);
    const result = runChecker(parseArgs(["--check", "--staged"]), repo);

    expect(printResults(result)).toBe(1);
    expect(result.diagnostics).toEqual([
      { path: "staged.md", line: 2, reason: "would-normalize" },
    ]);
  });

  it("mojibake-check: reports replacement characters and mojibake shapes", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "mojibake.md");
    fs.writeFileSync(file, "bad \uFFFD\nbad \u00E2\u20AC\u2122\n", "utf8");
    const result = runCheck(file);

    expect(printResults(result)).toBe(1);
    expect(result.diagnostics).toEqual([
      { path: path.relative(packageRoot, file).replace(/\\/g, "/"), line: 1, reason: "replacement-character U+FFFD" },
      { path: path.relative(packageRoot, file).replace(/\\/g, "/"), line: 2, reason: "mojibake E2 80 xx" },
    ]);
  });

  it("commit-message-check: validates prose-only commit message rules", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "COMMIT_EDITMSG");
    fs.writeFileSync(file, "update message\n\n* bad bullet\u0007\nbody\u2014text\n", "utf8");
    const result = runChecker(parseArgs(["--check", "--commit-message", file]), packageRoot);

    expect(printResults(result)).toBe(1);
    expect(result.diagnostics).toEqual([
      { path: "COMMIT_EDITMSG", line: 1, reason: "would-normalize" },
      { path: "COMMIT_EDITMSG", line: 3, reason: "commit-body-bullet-style" },
      { path: "COMMIT_EDITMSG", line: 3, reason: "disallowed-control U+0007" },
      { path: "COMMIT_EDITMSG", line: 4, reason: "commit-body-bullet-style" },
    ]);
  });

  it("plan-policy-write: plan files drop a leading UTF-8 BOM", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "feature-plan.md");
    fs.writeFileSync(file, Buffer.from([0xef, 0xbb, 0xbf, 0x41, 0x0a]));

    expect(printResults(runCheck(file))).toBe(1);
    expect(runCheck(file).diagnostics.some((d) => d.reason === "plan-file-bom")).toBe(true);
    expect(printResults(runWrite(file))).toBe(0);
    expect([...fs.readFileSync(file)]).toEqual([0x41, 0x0a]);
  });

  it("source-comments-write: normalizes comments without touching code strings", () => {
    const dir = makeTmpDir();
    const file = path.join(dir, "comments.ts");
    fs.writeFileSync(file, "const value = \"A\u2014B\";\n// A\u2014B\n", "utf8");

    expect(printResults(runCheck(file))).toBe(1);
    expect(printResults(runWrite(file))).toBe(0);
    expect(fs.readFileSync(file, "utf8")).toBe("const value = \"A\u2014B\";\n// A-B\n");
  });
});
