#!/usr/bin/env node
import { createTemplate } from "create-nexus";
import * as yargs from "yargs";
import scaffold from "./commands/scaffold";
import generate from "./commands/generate";

function run() {
  // tslint:disable-next-line:no-unused-expression
  yargs
    .usage("Usage: $0 <command> [options]")
    .command("new", "Create new project from template", {}, createTemplate)
    .command("scaffold", "Scaffold a new GraphQL type", {}, scaffold)
    .command("generate", "Generate all artifacts", {}, generate)
    .strict(true)
    .demandCommand()
    .help("help")
    .showHelpOnFail(true)
    .version().argv;
}

// Only call run when running from CLI, not when included for tests
if (require.main === module) {
  run();
}
