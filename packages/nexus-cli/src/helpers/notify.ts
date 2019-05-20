import * as path from "path";
import { Level } from "../types";
import { logger } from "./logger";
const nodeNotifier = require("node-notifier");

function icon(level: string) {
  return path.resolve(__dirname, "../icons/node_" + level + ".png");
}

/**
 * Displays a desktop notification and writes a message to the console.
 */
const notifyFactory = (
  cfg: { notify?: boolean },
  log: (msg: any, level: Level) => string
) => {
  return (title: string, msg?: string, level?: Level) => {
    level = level || "info";

    log([title, msg].filter(_ => _).join(": "), level);

    if (cfg.notify) {
      nodeNotifier.notify({
        title: title || "node.js",
        icon: icon(level),
        message: msg
      });
    }
  };
};

export const notifier = notifyFactory({ notify: false }, logger);

export default notifyFactory;
