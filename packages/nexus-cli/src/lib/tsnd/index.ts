// Fork of ts-node-dev
import { fork } from "child_process";
import * as fs from "fs";
import { compiler } from "./compiler";
import * as ipc from "./ipc";
import resolveMain from "./resolveMain";
import { Callbacks, Opts, Process, Cfg } from "./types";
import cfgFactory from "./cfg";
import logFactory from "../../helpers/logger";
import notifyFactory from "../../helpers/notify";
const filewatcher = require("filewatcher");

export class LiveReloader {
  protected child: Process | undefined = undefined;
  protected wrapper: string;
  protected main: string;
  protected cfg: Cfg;
  protected log: any;
  protected logRenderer: any;
  protected notify: any;
  protected starting: boolean;
  protected watcher: any;

  constructor(
    protected script: string,
    protected scriptArgs: any[],
    protected nodeArgs: any[],
    protected opts: Opts,
    protected callbacks: Callbacks
  ) {
    if (typeof script !== "string" || script.length === 0) {
      throw new TypeError("`script` must be a string");
    }

    if (!Array.isArray(scriptArgs)) {
      throw new TypeError("`scriptArgs` must be an array");
    }

    if (!Array.isArray(nodeArgs)) {
      throw new TypeError("`nodeArgs` must be an array");
    }

    this.wrapper = resolveMain(__dirname + "/wrap.js");
    this.main = resolveMain(script);
    this.cfg = cfgFactory(this.main, opts);
    this.log = logFactory(this.cfg);
    this.logRenderer = logFactory({ ...this.cfg, renderOnly: true });
    this.notify = notifyFactory(this.cfg, this.log);
    this.starting = false;
    opts.log = this.log;

    this.start = this.start.bind(this);
    this.restart = this.restart.bind(this);

    this.init(opts);
    this.start();
  }

  protected init(opts: Opts) {
    compiler.init(opts);

    compiler.notify = this.notify;
    compiler.stop = this.stop;
    // Run ./dedupe.js as preload script
    if (this.cfg.dedupe) {
      process.env.NODE_DEV_PRELOAD = __dirname + "/dedupe";
    }

    this.watcher = filewatcher({
      forcePolling: opts.poll,
      interval: parseInt(opts.interval!, 10),
      debounce: parseInt(opts.debounce!, 10)
    });

    this.watcher.on("change", this.restart.bind(this));

    this.watcher.on("fallback", (limit: number) => {
      this.log.warn(
        "node-dev ran out of file handles after watching %s files.",
        limit
      );
      this.log.warn("Falling back to polling which uses more CPU.");
      this.log.info(
        "Run ulimit -n 10000 to increase the file descriptor limit."
      );
      if (this.cfg.deps) {
        this.log.info("... or add `--no-deps` to use less file handles.");
      }
    });

    // Relay SIGTERM
    process.on("SIGTERM", () => {
      if (this.child) {
        this.child.kill("SIGTERM");
      }
      process.exit(0);
    });
  }

  restart(filePath?: string) {
    if (!filePath) {
      filePath = this.script;
    }
    if (filePath === compiler.tsConfigPath) {
      this.notify("Reinitializing TS compilation");
      compiler.init(this.opts);
    }
    /* eslint-disable no-octal-escape */
    if (this.cfg.clear) {
      process.stdout.write("\\033[2J\\033[H");
    }

    if (this.callbacks && this.callbacks.onRestart) {
      this.callbacks.onRestart(filePath);
    }

    compiler.compileChanged(filePath, this.callbacks);
    if (this.starting) {
      return;
    }
    this.watcher.removeAll();
    this.starting = true;

    if (this.child) {
      this.log.debug("Child is still running, restart upon exit");
      this.child.on("exit", this.start);
      this.stop();
    } else {
      this.log.debug(
        "Child is already stopped, probably due to a previous error"
      );
      this.start();
    }
  }

  /**
   * Run the wrapped script.
   */
  protected start() {
    let cmd = this.nodeArgs.concat(this.wrapper, this.script, this.scriptArgs);
    const childHookPath = compiler.getChildHookPath();
    cmd = ["-r", childHookPath].concat(cmd);
    this.log.debug("Starting child process %s", cmd.join(" "));
    this.child = fork(cmd[0], cmd.slice(1), {
      cwd: process.cwd(),
      env: process.env,
      silent: true
    });

    this.child.stdout.on("data", chunk => {
      if (this.callbacks && this.callbacks.onChildStdout) {
        this.callbacks.onChildStdout(chunk);
      }
    });

    this.starting = false;
    const compileReqWatcher = filewatcher({ forcePolling: this.opts.poll });
    let currentCompilePath: string;
    fs.writeFileSync(compiler.getCompileReqFilePath(), "");

    compileReqWatcher.add(compiler.getCompileReqFilePath());

    compileReqWatcher.on("change", (fileReq: string) => {
      fs.readFile(fileReq, "utf-8", (err, data) => {
        if (err) {
          this.log.error("Error reading compile request file", err);
          return;
        }
        const [compile, compiledPath] = data.split("\n");
        if (currentCompilePath === compiledPath) {
          return;
        }
        currentCompilePath = compiledPath;
        if (compiledPath) {
          compiler.compile({
            compile: compile,
            compiledPath: compiledPath,
            callbacks: this.callbacks
          });
        }
      });
    });

    this.child.on("message", message => {
      if (
        !message.compiledPath ||
        currentCompilePath === message.compiledPath
      ) {
        return;
      }
      currentCompilePath = message.compiledPath;
      message.callbacks = this.callbacks;
      compiler.compile(message);
    });

    this.child.on("exit", (code: any) => {
      this.log.debug("Child exited with code %s", code);
      if (!this.child) return;
      if (!this.child.respawn) {
        process.exit(code);
      }
      this.child = undefined;
    });

    if (this.cfg.respawn) {
      this.child.respawn = true;
    }

    if (compiler.tsConfigPath) {
      this.watcher.add(compiler.tsConfigPath);
    }

    // Listen for `required` messages and watch the required file.
    ipc.on(this.child, "required", m => {
      const isIgnored =
        this.cfg.ignore.some(isPrefixOf(m.required)) ||
        this.cfg.ignore.some(isRegExpMatch(m.required));

      if (
        !isIgnored &&
        (this.cfg.deps === -1 || getLevel(m.required) <= this.cfg.deps)
      ) {
        this.watcher.add(m.required);
      }
    });

    ipc.on(this.child, "compilationDone", () => {
      if (this.callbacks && this.callbacks.onCompilationDone) {
        this.callbacks.onCompilationDone();
      }
    });

    // Upon errors, display a notification and tell the child to exit.
    ipc.on(this.child, "error", m => {
      // notify(m.error, m.message, "error");
      if (this.callbacks && this.callbacks.onChildStdout) {
        this.callbacks.onChildStdout(
          this.logRenderer(
            [m.error, m.message].filter(_ => _).join(": "),
            "error"
          )
        );
      }
      this.stop(m.willTerminate);
    });
    compiler.writeReadyFile();
  }

  stop(willTerminate?: boolean) {
    if (!this.child || this.child.stopping) {
      return;
    }
    this.child.stopping = true;
    this.child.respawn = true;
    if (this.child.connected === undefined || this.child.connected === true) {
      this.log.debug("Disconnecting from child");
      this.child.disconnect();
      if (!willTerminate) {
        this.log.debug("Sending SIGTERM kill to child");
        this.child.kill("SIGTERM");
      }
    }
  }
}

/**
 * Returns the nesting-level of the given module.
 * Will return 0 for modules from the main package or linked modules,
 * a positive integer otherwise.
 */
function getLevel(mod: string) {
  const p = getPrefix(mod);

  return p.split("node_modules").length - 1;
}

/**
 * Returns the path up to the last occurence of `node_modules` or an
 * empty string if the path does not contain a node_modules dir.
 */
function getPrefix(mod: string) {
  const n = "node_modules";
  const i = mod.lastIndexOf(n);

  return ~i ? mod.slice(0, i + n.length) : "";
}

function isPrefixOf(value: string) {
  return function(prefix: string) {
    return value.indexOf(prefix) === 0;
  };
}

function isRegExpMatch(value: string) {
  return function(regExp: string) {
    return new RegExp(regExp).test(value);
  };
}
