# @esutils/mase

Automated checker for the enforceable parts of the
[`minimal-and-safe-editing`](../../.cursor/rules/minimal-and-safe-editing.mdc) Cursor rule.

That rule tells agents to preserve encoding, avoid non-ASCII punctuation on new
lines, and scan for mojibake before sending. `@esutils/mase` automates those
checks in CI and local workflows: invalid encodings, smart quotes, em dashes,
ellipsis characters, bullets, arrows, and similar symbols that LLM output
often introduces.

Use `--check` to fail when files violate the rule; use `--write` to normalize
mapped punctuation to ASCII in stable UTF-8 output. Scope, minimal-diff, and
contract rules in the `.mdc` file remain manual agent instructions.

## Global Install

Install globally when you want the checker available in any repository that uses
the `minimal-and-safe-editing.mdc` rule:

```bash
npm install -g @esutils/mase
```

Run it from a repository root:

```bash
mase --check
mase --check --path path/to/file.md
```

Use the Cursor rule for agent behavior and `mase` for the automated text guard:
the rule defines minimal editing, contracts, and judgment-based checks; the CLI
checks encoding, mojibake, and ASCII-safe punctuation.

## Rule-Aligned Modes

Check only changed worktree lines:

```bash
mase --check --diff
```

Check only staged lines before commit:

```bash
mase --check --staged
```

Check a commit message file:

```bash
mase --check --commit-message .git/COMMIT_EDITMSG
```

## Run Locally

From `D:\work\lvgl\esutils`:

```bash
yarn workspace @esutils/mase build
yarn workspace @esutils/mase check
yarn workspace @esutils/mase test
```

Check a specific file:

```bash
yarn workspace @esutils/mase check -- --path path/to/file.md
```

Normalize a specific file:

```bash
yarn workspace @esutils/mase write -- --path path/to/file.md
```

Run the built CLI directly:

```bash
node packages/mase/dist/cli.mjs --check --path path/to/file.md
node packages/mase/dist/cli.mjs --write --path path/to/file.md
```

The detailed behavior plan is in
[`docs/minimal-and-safe-editing-check-plan.md`](docs/minimal-and-safe-editing-check-plan.md).
The parent rule is
[`minimal-and-safe-editing.mdc`](../../.cursor/rules/minimal-and-safe-editing.mdc).
