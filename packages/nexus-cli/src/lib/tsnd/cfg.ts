import * as fs from "fs";
import * as path from "path";
import { Opts, Cfg } from "./types";

function read(dir?: string) {
  if (!dir) {
    return null;
  }

  let f = path.resolve(dir, ".node-dev.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf-8")) : null;
}

function resolvePath(unresolvedPath: string) {
  return path.resolve(process.cwd(), unresolvedPath);
}

export default function(main: string, opts: Opts): Cfg {
  const dir = main ? path.dirname(main) : ".";
  const cfg =
    read(dir) ||
    read(process.cwd()) ||
    read(process.env.HOME || process.env.USERPROFILE) ||
    {};

  // Truthy == --all-deps, false: one level of deps
  if (typeof cfg.deps !== "number") cfg.deps = cfg.deps ? -1 : 1;

  if (opts) {
    // Overwrite with CLI opts ...
    if (opts.allDeps) cfg.deps = -1;
    if (!opts.deps) cfg.deps = 0;
    if (opts.dedupe) cfg.dedupe = true;
    if (opts.respawn) cfg.respawn = true;
    if (opts.notify === false) cfg.notify = false;
  }

  const ignoreWatch = [
    ...(opts && opts["ignore-watch"] ? opts["ignore-watch"] : [])
  ];
  const ignore = ignoreWatch.concat(ignoreWatch.map(resolvePath));
  return {
    vm: cfg.vm !== false,
    fork: cfg.fork !== false,
    notify: cfg.notify !== false,
    deps: cfg.deps,
    timestamp: cfg.timestamp || (cfg.timestamp !== false && "HH:MM:ss"),
    clear: !!cfg.clear,
    dedupe: !!cfg.dedupe,
    ignore: ignore,
    respawn: cfg.respawn || false,
    debug: opts.debug || !!process.env.DEBUG || false,
    extensions: cfg.extensions || {
      coffee: "coffee-script/register",
      ls: "LiveScript"
    }
  };
}
