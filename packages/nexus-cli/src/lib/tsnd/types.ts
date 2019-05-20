import { ChildProcess } from "child_process";

export interface Callbacks {
  onRestart?: (fileName: string) => void;
  onFileCompiled?: (fileName: string) => void;
  onCompilationDone?: () => void;
  onChildStdout?: (data: any) => void;
}

export interface Compiler {
  allowJs: boolean;
  tsConfigPath: string;
  getCompilationId: () => string;
  getCompiledDir: () => string;
  getCompileReqFilePath: () => string;
  getCompilerReadyFilePath: () => string;
  getChildHookPath: () => string;
  writeReadyFile: () => any;
  writeChildHookFile: (opts: any) => void;
  init: (opts: any) => void;
  compileChanged: (fileName: string, callbacks: Callbacks) => void;
  compile: (params: any) => void;
  log?: any;
  notify?: any;
  stop?: any;
}

interface BooleanOpts {
  allDeps?: boolean;
  deps?: boolean;
  dedupe?: boolean;
  poll?: boolean;
  respawn?: boolean;
  notify?: boolean;
  fast?: boolean;
  disableWarnings?: boolean;
  "disable-warnings"?: boolean;
  "no-cache"?: boolean;
  cache?: boolean;
  "type-check"?: boolean;
  "transpile-only"?: boolean;
  transpileOnly?: boolean;
  files?: boolean;
  pretty?: boolean;
  "prefer-ts"?: boolean;
  "exec-check"?: boolean;
  debug?: boolean;
}

interface StringOpts {
  compiler?: string;
  project?: string;
  ignore?: string | string[];
  "skip-project"?: string;
  "skip-ignore"?: string;
  ignoreWarnings?: string;
  "ignore-warnings"?: string[];
  ignoreDiagnostics?: string[];
  "ignore-diagnostics"?: string[];
  "cache-directory"?: string;
  compilerOptions?: string;
  "compiler-options"?: string;
  "compile-timeout"?: string;
  "ignore-watch"?: string[];
  interval?: string;
  debounce?: string;
}

export interface Opts extends BooleanOpts, StringOpts {
  log?: any;
}

export interface Cfg {
  vm: boolean;
  fork: boolean;
  notify: boolean;
  deps: number;
  timestamp: string;
  clear: boolean;
  dedupe: boolean;
  ignore: string[];
  respawn: boolean;
  debug?: boolean;
  extensions: Record<string, string | { name: string; options: any }>;
}

export interface Process extends ChildProcess {
  respawn?: boolean;
  stopping?: boolean;
}
