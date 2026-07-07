#!/usr/bin/env node
import { parseArgs, printHelp } from "./args.mjs";
import { printResults, runChecker } from "./runner.mjs";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

const args = parseArgs(argv);
const code = printResults(runChecker(args));
process.exit(code);
