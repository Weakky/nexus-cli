// import { fork } from "child_process";
// import * as fs from "fs";
// import { compiler } from "./compiler";
// import * as ipc from "./ipc";
// import resolveMain from "./resolveMain";
// import { Callbacks, Opts, Process } from "./types";
// import cfgFactory from "./cfg";
// import logFactory from "../../helpers/logger";
// import notifyFactory from "../../helpers/notify";
// const filewatcher = require("filewatcher");

// export default function(
//   script: string,
//   scriptArgs: any[],
//   nodeArgs: any[],
//   opts: Opts,
//   callbacks: Callbacks
// ) {
//   if (typeof script !== "string" || script.length === 0) {
//     throw new TypeError("`script` must be a string");
//   }

//   if (!Array.isArray(scriptArgs)) {
//     throw new TypeError("`scriptArgs` must be an array");
//   }

//   if (!Array.isArray(nodeArgs)) {
//     throw new TypeError("`nodeArgs` must be an array");
//   }

//   // The child_process
//   let child: Process | undefined = undefined;
//   const wrapper = resolveMain(__dirname + "/wrap.js");
//   const main = resolveMain(script);
//   const cfg = cfgFactory(main, opts);
//   const log = logFactory(cfg);
//   const logRenderer = logFactory({ ...cfg, renderOnly: true });
//   const notify = notifyFactory(cfg, log);
//   opts.log = log;
//   compiler.init(opts);

//   compiler.notify = notify;
//   compiler.stop = stop;
//   // Run ./dedupe.js as preload script
//   if (cfg.dedupe) process.env.NODE_DEV_PRELOAD = __dirname + "/dedupe";

//   const watcher = filewatcher({
//     forcePolling: opts.poll,
//     interval: parseInt(opts.interval!, 10),
//     debounce: parseInt(opts.debounce!, 10)
//   });
//   let starting = false;

//   watcher.on("change", (filePath: string) => {
//     if (filePath === compiler.tsConfigPath) {
//       notify("Reinitializing TS compilation");
//       compiler.init(opts);
//     }
//     /* eslint-disable no-octal-escape */
//     if (cfg.clear) {
//       process.stdout.write("\\033[2J\\033[H");
//     }

//     if (callbacks && callbacks.onRestart) {
//       callbacks.onRestart(filePath);
//     }

//     compiler.compileChanged(filePath, callbacks);
//     if (starting) {
//       return;
//     }
//     watcher.removeAll();
//     starting = true;

//     if (child) {
//       log.debug("Child is still running, restart upon exit");
//       child.on("exit", start);
//       stop();
//     } else {
//       log.debug("Child is already stopped, probably due to a previous error");
//       start();
//     }
//   });

//   watcher.on("fallback", function(limit: number) {
//     log.warn(
//       "node-dev ran out of file handles after watching %s files.",
//       limit
//     );
//     log.warn("Falling back to polling which uses more CPU.");
//     log.info("Run ulimit -n 10000 to increase the file descriptor limit.");
//     if (cfg.deps) log.info("... or add `--no-deps` to use less file handles.");
//   });

//   /**
//    * Run the wrapped script.
//    */
//   function start() {
//     let cmd = nodeArgs.concat(wrapper, script, scriptArgs);
//     const childHookPath = compiler.getChildHookPath();
//     cmd = ["-r", childHookPath].concat(cmd);
//     log.debug("Starting child process %s", cmd.join(" "));
//     child = fork(cmd[0], cmd.slice(1), {
//       cwd: process.cwd(),
//       env: process.env,
//       silent: true
//     });

//     if (callbacks && callbacks.onChildSpawned) {
//       callbacks.onChildSpawned(child);
//     }

//     child.stdout.on("data", chunk => {
//       if (callbacks && callbacks.onChildStdout) {
//         callbacks.onChildStdout(chunk);
//       }
//     });

//     starting = false;
//     const compileReqWatcher = filewatcher({ forcePolling: opts.poll });
//     let currentCompilePath: string;
//     fs.writeFileSync(compiler.getCompileReqFilePath(), "");

//     compileReqWatcher.add(compiler.getCompileReqFilePath());

//     compileReqWatcher.on("change", (fileReq: string) => {
//       fs.readFile(fileReq, "utf-8", function(err, data) {
//         if (err) {
//           log.error("Error reading compile request file", err);
//           return;
//         }
//         const [compile, compiledPath] = data.split("\n");
//         if (currentCompilePath === compiledPath) {
//           return;
//         }
//         currentCompilePath = compiledPath;
//         if (compiledPath) {
//           compiler.compile({
//             compile: compile,
//             compiledPath: compiledPath,
//             callbacks: callbacks
//           });
//         }
//       });
//     });

//     child.on("message", function(message) {
//       if (
//         !message.compiledPath ||
//         currentCompilePath === message.compiledPath
//       ) {
//         return;
//       }
//       currentCompilePath = message.compiledPath;
//       message.callbacks = callbacks;
//       compiler.compile(message);
//     });

//     child.on("exit", function(code: any) {
//       log.debug("Child exited with code %s", code);
//       if (!child) return;
//       if (!child.respawn) {
//         process.exit(code);
//       }
//       child = undefined;
//     });

//     if (cfg.respawn) {
//       child.respawn = true;
//     }

//     if (compiler.tsConfigPath) {
//       watcher.add(compiler.tsConfigPath);
//     }

//     // Listen for `required` messages and watch the required file.
//     ipc.on(child, "required", function(m) {
//       const isIgnored =
//         cfg.ignore.some(isPrefixOf(m.required)) ||
//         cfg.ignore.some(isRegExpMatch(m.required));

//       if (!isIgnored && (cfg.deps === -1 || getLevel(m.required) <= cfg.deps)) {
//         watcher.add(m.required);
//       }
//     });

//     ipc.on(child, "compilationDone", () => {
//       if (callbacks && callbacks.onCompilationDone) {
//         callbacks.onCompilationDone();
//       }
//     });

//     // Upon errors, display a notification and tell the child to exit.
//     ipc.on(child, "error", function(m) {
//       //notify(m.error, m.message, "error");
//       if (callbacks && callbacks.onChildStdout) {
//         callbacks.onChildStdout(
//           logRenderer([m.error, m.message].filter(_ => _).join(": "), "error")
//         );
//       }
//       stop(m.willTerminate);
//     });
//     compiler.writeReadyFile();
//   }

//   function stop(willTerminate?: boolean) {
//     if (!child || child.stopping) {
//       return;
//     }
//     child.stopping = true;
//     child.respawn = true;
//     if (child.connected === undefined || child.connected === true) {
//       log.debug("Disconnecting from child");
//       child.disconnect();
//       if (!willTerminate) {
//         log.debug("Sending SIGTERM kill to child");
//         child.kill("SIGTERM");
//       }
//     }
//   }

//   // Relay SIGTERM
//   process.on("SIGTERM", function() {
//     if (child) {
//       child.kill("SIGTERM");
//     }
//     process.exit(0);
//   });

//   start();
// }

// /**
//  * Returns the nesting-level of the given module.
//  * Will return 0 for modules from the main package or linked modules,
//  * a positive integer otherwise.
//  */
// function getLevel(mod: string) {
//   const p = getPrefix(mod);

//   return p.split("node_modules").length - 1;
// }

// /**
//  * Returns the path up to the last occurence of `node_modules` or an
//  * empty string if the path does not contain a node_modules dir.
//  */
// function getPrefix(mod: string) {
//   const n = "node_modules";
//   const i = mod.lastIndexOf(n);

//   return ~i ? mod.slice(0, i + n.length) : "";
// }

// function isPrefixOf(value: string) {
//   return function(prefix: string) {
//     return value.indexOf(prefix) === 0;
//   };
// }

// function isRegExpMatch(value: string) {
//   return function(regExp: string) {
//     return new RegExp(regExp).test(value);
//   };
// }
