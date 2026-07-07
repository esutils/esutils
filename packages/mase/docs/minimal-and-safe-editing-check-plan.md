# minimal-and-safe-editing-check plan

Encoding baseline: UTF-8 (no BOM preferred) for this and all plan files.

## Purpose

`@esutils/mase` automates the enforceable parts of
[`minimal-and-safe-editing.mdc`](../../../.cursor/rules/minimal-and-safe-editing.mdc): encoding and
text fidelity, and the "Validate before sending" scans for mojibake, replacement
characters, and non-ASCII punctuation. It does not enforce scope, minimal-diff,
or contract rules; those stay manual agent instructions in the `.mdc` file.

LLM output frequently violates the automated checks: invalid byte sequences,
mojibake, and non-ASCII punctuation easy to spot in reviews. This package
detects those artifacts and normalizes mapped punctuation to ASCII equivalents
in stable UTF-8 output.

## Suggested automation roadmap

The rule has two kinds of requirements: byte/text checks that a tool can enforce
deterministically, and intent checks that must remain agent judgment. `mase`
should focus on the first group and avoid pretending it can decide whether a
change was requested, whether an interface contract was intentionally changed,
or whether a refactor was allowed.

Highest-value next work:

1. Add diff-scoped checking. The rule says ASCII punctuation applies to new or
   modified lines, and also says untouched text must not be normalized. Add
   `--staged`, `--diff`, or `--since <ref>` modes that inspect only added or
   changed lines from `git diff`. In check mode this should fail on rule
   violations. In write mode it should either normalize only changed lines or be
   rejected unless a diff scope is provided.
2. Add explicit mojibake and replacement-character detection. Report `U+FFFD`
   directly, and flag common mojibake sequences produced by UTF-8 text decoded
   as legacy encodings. Keep the pattern list ASCII by describing byte or code
   point shapes, for example `C3 xx`, `C2 xx`, and `E2 80 xx` decoded into
   visible mojibake. These should be diagnostics even when the file otherwise
   decodes successfully.
3. Add commit-message mode. Check `.git/COMMIT_EDITMSG` or an explicit message
   path for ASCII-safe punctuation, disallowed controls except tab/newline,
   hyphen-space bullet style in commit bodies, and line length near 80 columns.
   Keep this mode separate from repository file normalization.
4. Add plan-document policy. Files matching `**/*plan*.md` should decode as
   UTF-8 and avoid a BOM by default. This directly automates the rule's plan file
   encoding requirement without changing unrelated markdown policy.
5. Add source comment scanning. Extend source extensions only after comment
   region extraction exists, so the checker can scan comments and documentation
   prose without rewriting code tokens or string contents.

Lower-priority work:

- Check full-width punctuation explicitly, including `U+FF01` through `U+FF5E`,
  because not every risky full-width character is covered by current `P*`
  handling.
- Read EditorConfig `max_line_length` for commit messages, PR text, and prose
  files, but apply it only to changed lines or message files.
- Add a pre-commit-oriented command that defaults to `--staged --check` and
  reports only actionable changed-line diagnostics.

Non-goals for automation:

- Do not automate scope, minimal-diff, or "did the user ask for this" checks.
- Do not automate interface/contract intent, such as whether a CLI flag,
  exported name, config key, or parseable log line was safe to change.
- Do not normalize existing non-ASCII text outside an explicit migration or
  write command with a clear scope.

Standalone reference behavior summary:

| Area | Markdown normalizer behavior | Commit message normalizer behavior |
|------|-------------------------------|------------------------------------|
| Target scope | Multiple files: markdown plus selected source extensions | Single commit message file |
| Selection control | Root scanning with repeatable root arguments | One explicit path argument with default |
| Text region handling | Full file for markdown, comments-only for code files | Full file normalization |
| Normalization rules | Replace smart punctuation and mojibake with ASCII equivalents | Same ASCII-safe punctuation policy |
| Encoding output | UTF-8 no BOM; existing files keep line endings; new files use EditorConfig `end_of_line` | UTF-8 no BOM, LF newlines |
| Control chars | Keep normal text and line structure | Strip disallowed controls except tab/newline |
| Check mode | `--check` exits non-zero when any file would change | `--check` exits non-zero when file would change |
| Write mode | Rewrites only files requiring normalization | Rewrites only when normalization is needed |
| Result reporting | Deterministic stale file list and summary | Clear normalized/already-clean status |

GBK non-ASCII punctuation to ASCII mapping:

| GBK/CP936 bytes | Symbol/meaning | ASCII output |
|-----------------|----------------|--------------|
| `A1 AA` | em dash | `-` |
| `A8 43` | en dash | `-` |
| `A1 AE`, `A1 AF` | single smart quotes | `'` |
| `A1 B0`, `A1 B1` | double smart quotes | `"` |
| `A1 AD` | ellipsis | `...` |
| `A1 EB` | per mille sign | `%` |
| `A1 FA` | right arrow | `->` |
| `A1 FD` | down arrow | `v` |

UTF-8 non-ASCII punctuation to ASCII mapping:

| UTF-8 bytes | Symbol (code point) | ASCII output |
|-------------|---------------------|--------------|
| `E2 80 94` | em dash (`U+2014`) | `-` |
| `E2 80 93` | en dash (`U+2013`) | `-` |
| `E2 88 92` | minus sign (`U+2212`) | `-` |
| `E2 80 98`, `E2 80 99` | single smart quotes (`U+2018`, `U+2019`) | `'` |
| `E2 80 9C`, `E2 80 9D` | double smart quotes (`U+201C`, `U+201D`) | `"` |
| `E2 80 A6` | ellipsis (`U+2026`) | `...` |
| `E2 80 9A` | single low-9 quote (`U+201A`) | `'` |
| `E2 80 9E` | double low-9 quote (`U+201E`) | `"` |
| `C2 A0` | no-break space (`U+00A0`) | space |
| `E2 80 A2` | bullet (`U+2022`) | `-` |
| `E2 80 B9` | single left angle quote (`U+2039`) | `<` |
| `E2 80 BA` | single right angle quote (`U+203A`) | `>` |
| `E2 80 B0` | per mille sign (`U+2030`) | `%` |
| `E2 86 92` | right arrow (`U+2192`) | `->` |
| `E2 86 94` | left-right arrow (`U+2194`) | `<->` |
| `E2 86 93` | down arrow (`U+2193`) | `v` |
| `E2 96 BA` | right-pointing pointer (`U+25BA`) | `>` |
| `E2 96 B6` | right-pointing triangle (`U+25B6`) | `>` |
| `EF BB BF` (mid-file only) | UTF-8 BOM / `U+FEFF` appearing inside content | removed |

CP1252 non-ASCII punctuation to ASCII mapping:

| CP1252 bytes | Symbol/meaning | ASCII output |
|--------------|----------------|--------------|
| `96` | en dash | `-` |
| `97` | em dash | `-` |
| `91`, `92` | single smart quotes | `'` |
| `93`, `94` | double smart quotes | `"` |
| `82` | single low-9 quote | `'` |
| `84` | double low-9 quote | `"` |
| `85` | ellipsis | `...` |
| `8B` | single left angle quote | `<` |
| `9B` | single right angle quote | `>` |
| `95` | bullet | `-` |
| `89` | per mille sign | `%` |

Implementation expectations:

- Provide `--check` mode for CI/guard use (no writes; non-zero on violations).
- Provide write mode for optional one-shot normalization.
- Apply the three mapping tables above in deterministic order.
- Keep output in UTF-8 (no BOM) except a preserved file-leading UTF-8 BOM.
- **Line endings:** existing git-tracked files keep their current line-ending
  style; new (untracked) files use EditorConfig `end_of_line` (default `lf`).
- Do not strip a file-leading UTF-8 BOM (first three bytes); only normalize
  `U+FEFF` when it appears in the middle of content.
- Emit parseable failures in `path:line:reason` format.
- Keep scope minimal and support allowlist paths to avoid unrelated rewrites.
- Treat Unicode `General_Category=P*` as candidate punctuation coverage; the three
  tables above define the concrete normalization subset for this project.

Encoding detection order:

Detection resolves **metadata only** -- the input charset, output charset, and
output line ending for a file. It does **not** decode bytes or normalize text.
Decoding and normalization are separate steps below.

Detection output per file:

| Field | Value |
|-------|-------|
| `inputCharset` | Charset used to interpret raw bytes (e.g. `utf-8`, `gbk`, `cp1252`, `latin1`) |
| `outputCharset` | Always `utf-8` (no BOM), except preserve a file-leading UTF-8 BOM when present |
| `outputLineEnding` | `lf`, `crlf`, or `cr` for written bytes |
| `leadingUtf8Bom` | Whether raw bytes start with `EF BB BF` |

Run charset detection in order; stop at the first rule that sets `inputCharset`:

| Step | Name | Input | Sets `inputCharset` when |
|------|------|-------|---------------------------|
| 1 | BOM prefix | Raw bytes | BOM present: `EF BB BF` -> `utf-8`; `FF FE` -> `utf-16le`; `FE FF` -> `utf-16be`. **BOM wins over EditorConfig.** Also sets `leadingUtf8Bom` for UTF-8 BOM. |
| 2 | EditorConfig charset | File path | No BOM from step 1: use `charset` from `.editorconfig` (default `utf-8`). Values: `utf-8`, `utf-8-bom`, `latin1`, `utf-16be`, `utf-16le`. |
| 3 | Legacy encoding guess | Steps 1-2 did not fix charset; no `--fallback-scope`, or path matches scope | Build candidate pool ordered by **system ANSI code page**, then score (see below). Best label becomes `inputCharset`. |
| 4 | UTF-8 fallback | Step 3 produced no charset | Set `inputCharset` to `utf-8` |

Legacy encoding guess (step 3):

Candidate **try-order** follows the host **ANSI code page** (Windows ACP). The
charset matching ACP is tried first; remaining project legacy charsets follow in
fixed order; `chardet` fills the pool last.

| ANSI code page (ACP) | First legacy charset | Then |
|----------------------|----------------------|------|
| `1252` (Western) | `cp1252` | `gbk`, chardet |
| `936` (GBK) | `gbk` | `cp1252`, chardet |
| Other / unknown | `cp1252` | `gbk`, chardet |

(ACP table applies on **Windows only**; see chardet section for Linux/macOS.)

Resolve ACP at runtime on **Windows only** (system ACP). On Linux and macOS there
is no ANSI code page; use the fixed legacy try-order `gbk`, then `cp1252`, then
chardet. `--fallback-encoding` inserts extra labels after the ACP-first slot
(Windows) or after `gbk` (non-Windows), before chardet.

**chardet (platform-specific):**

Install: `yarn workspace @esutils/mase add chardet`. Pass raw `Buffer` /
`Uint8Array` (not a JS string).

Windows -- restricted to system ACP and CP1252:

```javascript
import chardet from "chardet";

const allowed = [windowsSystemAcpLabel, "windows-1252"];
const candidates = chardet.analyse(buffer).filter(
  (r) => r.confidence >= 50 && allowed.includes(r.name),
);
```

`windowsSystemAcpLabel` is the chardet encoding name for the host ACP (e.g.
ACP `1252` -> `"windows-1252"`, ACP `936` -> `"GB18030"`). Map result names to
project charsets (`windows-1252` -> `cp1252`, `GB18030` -> `gbk`).

Linux and macOS -- no ACP filter; use full analyse pass:

```javascript
import chardet from "chardet";

const candidates = chardet.analyse(buffer).filter((r) => r.confidence >= 50);
```

Merge chardet candidates with the ACP-ordered (Windows) or fixed (non-Windows)
try-list before scoring. `chardet.detect(buffer)` may be used when only the top
hit is needed.

**Scoring:** decode-trial each candidate fatal; rank by fewest unsupported `P*`
punctuation, then fewest non-ASCII chars, then encoding name. Best score wins
`inputCharset`.

Line ending detection (sets `outputLineEnding`; independent of charset steps):

| File kind | Rule |
|-----------|------|
| Existing (git-tracked) | Keep line-ending style detected from raw bytes (`CRLF`, `CR`, or `LF`) |
| New (not git-tracked) | Use EditorConfig `end_of_line` for path (default `lf`) |

Priority summary: **BOM charset (step 1) > EditorConfig charset (step 2) > legacy
guess pool (step 3) > UTF-8 fallback (step 4).**

Notes:

- Step 2 `latin1` / UTF-16 values are **declared** charsets from EditorConfig, not
  guessed. GBK/CP1252 are not EditorConfig charset values; they appear only via
  step 3.
- `.editorconfig` commonly sets `charset = utf-8`, so step 2 normally yields
  `utf-8`. Invalid UTF-8 byte sequences are handled at decode time; if decode
  fails with `utf-8`, re-run detection step 3 to pick a legacy charset.
- Step 3 try-order is **ACP-driven on Windows**; fixed `gbk`, `cp1252` on
  Linux/macOS. chardet: Windows filters `analyse()` to
  `[windowsSystemAcpLabel, "windows-1252"]`; Linux/macOS uses full `analyse()`.
- `--fallback-encoding` adds encodings after the ACP-first slot, before chardet.
- `--fallback-scope` when set restricts step 3 to matching paths.
- Step 4 always yields a charset: if step 3 finds no candidate, use `utf-8`.
  Decode may still fail later if bytes are not valid UTF-8 (`path:1:decode failed`).
- Dependency: `chardet` (`yarn workspace @esutils/mase add chardet`). Source:
  `packages/mase/src/`; CLI: `yarn workspace @esutils/mase build` then
  `yarn workspace @esutils/mase check` or `node packages/mase/dist/cli.mjs`.

Decode (separate step):

After detection, decode raw bytes with `inputCharset` (`TextDecoder` fatal, or
CP1252 byte map). If decode fails and `inputCharset` was `utf-8` from step 2,
run detection step 3 and retry decode once. Failure reports
`path:1:decode failed`.

Normalize + write (separate step):

On decoded text:

- Apply punctuation mapping tables (LF internally).
- Remove mid-file `U+FEFF`; preserve file-leading UTF-8 BOM when `leadingUtf8Bom`.
- Apply `outputLineEnding` to final bytes.
- Encode as `outputCharset` (UTF-8 no BOM, except preserved leading BOM).

P* extension policy:

| Case | Behavior in check mode | Behavior in write mode |
|------|-------------------------|------------------------|
| Punctuation in mapping tables | Report as fixable normalization | Rewrite to mapped ASCII output |
| Punctuation in `P*` but not mapped | Report as unsupported punctuation candidate | Keep unchanged (no silent rewrite) |
| Punctuation in allowlist | Ignore for failure purposes | Keep unchanged |

Required test cases:

| Test ID | Input type | Example input | Expected result |
|---------|------------|---------------|-----------------|
| `utf8-known-dash` | UTF-8 mapped punctuation | `U+2014`, `U+2013` | normalized to `-` |
| `utf8-known-quotes` | UTF-8 mapped punctuation | `U+2018/U+2019`, `U+201C/U+201D` | normalized to `'` and `"` |
| `utf8-known-ellipsis` | UTF-8 mapped punctuation | `U+2026` | normalized to `...` |
| `utf8-known-arrow` | UTF-8 mapped punctuation | `U+2192`, `U+2194`, `U+2193` | normalized to `->`, `<->`, `v` |
| `gbk-known-dash` | GBK encoding guess | bytes `A1 AA`, `A8 43` | normalized to `-` |
| `gbk-known-quotes` | GBK encoding guess | bytes `A1 AE/A1 AF`, `A1 B0/A1 B1` | normalized to `'` and `"` |
| `cp1252-known-dash` | CP1252 encoding guess | bytes `96`, `97` | normalized to `-` |
| `cp1252-known-quotes` | CP1252 encoding guess | bytes `91/92`, `93/94`, `82`, `84` | normalized to `'` and `"` |
| `cp1252-known-ellipsis` | CP1252 encoding guess | byte `85` | normalized to `...` |
| `chardet-fallback` | Legacy encoding guess (detection step 3) | legacy bytes not valid UTF-8; `chardet.analyse()` candidate in pool | `inputCharset` picked; decode + normalize when mappable |
| `bom-leading-keep` | UTF-8 BOM boundary | BOM at file start only | preserved (not removed) |
| `bom-mid-remove` | UTF-8 BOM boundary | `U+FEFF` in middle | removed |
| `pstar-unmapped-check` | `P*` candidate coverage | punctuation not in mapping tables | check mode fails with `path:line:reason` |
| `pstar-unmapped-write` | `P*` candidate coverage | punctuation not in mapping tables | unchanged, reported as unsupported |
| `allowlist-unmapped` | allowlist behavior | unmapped punctuation in allowlisted path | no failure |
| `deterministic-order` | output stability | same file set, repeated run | same diagnostics order and content |
| `check-no-write` | mode contract | run with `--check` | no file content changes |
| `write-idempotent` | mode contract | run write mode twice | second run reports no changes |
| `eol-existing-keep` | EOL policy | git-tracked file with CRLF | punctuation normalized; CRLF preserved |
| `eol-new-editorconfig` | EOL policy | untracked file with CRLF | output uses EditorConfig `end_of_line` (`lf`) |
