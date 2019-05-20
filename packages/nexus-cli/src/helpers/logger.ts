import fmt from "dateformat";
import { Colors, Level } from "../types";
const util = require("util");

const colors: Colors = {
  info: "36",
  error: "31;1",
  warn: "33",
  debug: "90"
};

/**
 * Logs a message to the console. The level is displayed in ANSI colors,
 * either bright red in case of an error or green otherwise.
 */
const logFactory = function(cfg: {
  timestamp: string;
  debug?: boolean;
  renderOnly?: boolean;
}) {
  function log(msg: any, level: Level) {
    if (cfg.timestamp) {
      msg = `${color(fmt(cfg.timestamp), "30;1")} ${msg}`;
    }

    const c = colors[level] || "32";
    const output = "[" + color(level.toUpperCase(), c) + "] " + msg;

    if (!cfg.renderOnly) {
      console.log(output);
    }

    return output;
  }

  function color(s: string, c: string) {
    if (process.stdout.isTTY) {
      return "\x1B[" + c + "m" + s + "\x1B[0m";
    }
    return s;
  }

  log.debug = function(...args: any[]) {
    if (!cfg.debug) {
      return;
    }
    return log(util.format.call(util, args), "debug");
  };

  log.info = function(...args: any[]) {
    return log(util.format.call(util, ...args), "info");
  };

  log.warn = function(...args: any[]) {
    return log(util.format.call(util, ...args), "warn");
  };

  log.error = function(...args: any[]) {
    return log(util.format.call(util, ...args), "error");
  };

  return log;
};

export const logger = logFactory({
  timestamp: "HH:MM:ss",
  debug: !!process.env.DEBUG || false
});

export const logRenderer = logFactory({
  timestamp: "HH:MM:ss",
  debug: !!process.env.DEBUG || false,
  renderOnly: true
});

export default logFactory;
