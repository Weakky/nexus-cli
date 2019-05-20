import chalk from "chalk";
import { existsSync } from "fs";
import { dirname, join, relative } from "path";
import readline from "readline";
import { findConfigFile } from "../../helpers/config";
import { logger, logRenderer } from "../../helpers/logger";
import { LiveReloader } from "../../lib/tsnd";
import generate from "../generate";
import scaffold, { runPrismaDeploy } from "../scaffold";
const getCursorPosition = require("get-cursor-position");

readline.emitKeypressEvents(process.stdin);

if (process.stdin.setRawMode) {
  process.stdin.setRawMode(true);
}

type CLIState = "NORMAL" | "SCAFFOLDING";

export default async (_args: Record<string, string>) => {
  let configPath = findConfigFile("tsconfig.json", { required: false });

  if (!configPath) {
    configPath = process.cwd();
  }

  const rootPath = dirname(configPath);
  const entryFile = join(rootPath, "src", "index.ts");

  if (!existsSync(entryFile)) {
    logger.error("src/index.ts not found");
    process.exit(1);
  }

  let logsMuted = false;
  let cliState: CLIState = "NORMAL";

  clearConsole();
  updateBottomMessage();
  console.log(logRenderer.info("Starting..."));

  const liveReloader = new LiveReloader(
    entryFile,
    [],
    [],
    {
      respawn: true,
      notify: false,
      pretty: true,
      transpileOnly: true,
      "ignore-watch": ["@generated", "@types/nexus"]
    },
    {
      onRestart: (fileName: string) => {
        if (!logsMuted) {
          clearBottomLineMessage();
          console.log(
            logRenderer.info(
              `Restarting: ./${relative(process.cwd(), fileName)}`
            )
          );
        }
      },
      onCompilationDone: () => {
        if (!logsMuted) {
          clearConsole();
          updateBottomMessage();
        }
      },
      onChildStdout: data => {
        if (!logsMuted) {
          clearBottomLineMessage();
          console.log(data.toString());
          updateBottomMessage();
        }
      }
    }
  );

  let cancelablePromise: any = null;

  async function keyPressListener(_str: string, key: any): Promise<any> {
    if (cliState === "NORMAL") {
      if (["s", "g", "m", "r"].includes(key.name)) {
        if (key.name === "s") {
          try {
            logsMuted = true;
            cliState = "SCAFFOLDING";
            clearConsole();
            updateBottomMessage(`Press 'ESC' to abort scaffold`);

            await scaffold({}, promiseToCancel => {
              cancelablePromise = promiseToCancel;
            });
          } catch (e) {
            console.log(e);
          } finally {
            clearConsole();
            logsMuted = false;
            liveReloader.restart();
            cliState = "NORMAL";
          }
        }

        if (key.name === "g") {
          updateBottomMessage("Generating...");
          await generate();
          updateBottomMessage();
        }

        if (key.name === "r") {
          return liveReloader.restart();
        }

        if (key.name === "m") {
          logsMuted = true;
          clearConsole();
          await runPrismaDeploy();
          clearConsole();
          logsMuted = false;
          liveReloader.restart();
        }
      }
    }

    if (cliState === "SCAFFOLDING") {
      if (key.name === "escape" && cancelablePromise) {
        cancelablePromise.cancel("abort");
        cancelablePromise = null;
      }
    }

    if (key.ctrl && key.name === "c") {
      if (cancelablePromise) {
        cancelablePromise.cancel("abort");
      }
      liveReloader.stop();
      process.stdin.removeAllListeners();
      process.exit(0);
    }
  }

  process.stdin.addListener("keypress", keyPressListener);
};

function clearBottomLineMessage(pos?: any) {
  if (!pos) {
    pos = getCursorPosition.sync();
  }
  readline.cursorTo(process.stdout, 0, process.stdout.rows! - 2);
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, pos.col - 1, pos.row - 1);
}

function updateBottomMessage(
  message: string = `'s' to scaffold - 'g' to generate' - 'r' to restart - 'm' to migrate`
) {
  const pos = getCursorPosition.sync();
  clearBottomLineMessage(pos);
  readline.cursorTo(process.stdout, 0, process.stdout.rows! - 2);
  console.log(chalk.yellow(message));
  readline.cursorTo(process.stdout, pos.col - 1, pos.row - 1);
}

function clearConsole(title?: string) {
  if (process.stdout.isTTY) {
    clearBottomLineMessage();
    const blank = "\n".repeat(process.stdout.rows || 0);
    console.log(blank);
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    if (title) {
      console.log(title);
    }
  }
}
