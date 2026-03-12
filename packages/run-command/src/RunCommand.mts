/**
 * Copyright (C) 2022 Yonggang Luo <luoyonggang@gmail.com>
 *
 */

import { spawn, type SpawnOptionsWithoutStdio } from 'child_process';

export { SpawnOptionsWithoutStdio };

interface RunCommandResult {
  stdout: Buffer;
  stderr: Buffer;
  error?: Error;
  code: number;
}

/**
 * Runs a shell command and returns a Promise that resolves with the stdout/stderr as buffers.
 * @param {string} command The command to execute.
 * @param {string[]} args The arguments for the command.
 * @returns {Promise<RunCommandResult>} A promise resolving to the command's output.
 */
export function RunCommand(
  command: string,
  args?: readonly string[],
  options?: SpawnOptionsWithoutStdio,
): Promise<RunCommandResult> {
  return new Promise((resolve) => {
    // Spawn the child process
    const child = spawn(command, args, options);

    let stdoutOutput: Buffer[] = [];
    let stderrOutput: Buffer[] = [];

    // Capture stdout data as it arrives
    child.stdout.on('data', (chunk) => {
      if (Buffer.isBuffer(chunk)) stdoutOutput.push(chunk);
    });

    // Capture stderr data as it arrives
    child.stderr.on('data', (chunk) => {
      if (Buffer.isBuffer(chunk)) stderrOutput.push(chunk);
    });

    // Handle process errors
    child.on('error', (error) => {
      resolve({
        stdout: Buffer.concat(stdoutOutput),
        stderr: Buffer.concat(stderrOutput),
        error: error,
        code: -1,
      });
      stdoutOutput = [];
      stderrOutput = [];
    });

    // Handle process close event (when the process finishes)
    child.on('close', (code) => {
      resolve({
        stdout: Buffer.concat(stdoutOutput),
        stderr: Buffer.concat(stderrOutput),
        error: undefined,
        code: code || 0,
      });
      stdoutOutput = [];
      stderrOutput = [];
    });
  });
}
